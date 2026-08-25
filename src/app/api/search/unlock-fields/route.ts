export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { queryId, newFields, estimateOnly } = await request.json() as { queryId: string; newFields: FieldGroupId[]; estimateOnly?: boolean }
    if (!queryId || !newFields?.length) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    const { data: query } = await supabaseAdmin.from('queries').select('user_id, fields, company_ids').eq('id', queryId).single()
    if (!query || query.user_id !== user.id) return NextResponse.json({ error: 'Recherche introuvable' }, { status: 404 })

    const alreadyOwned = new Set(query.fields as string[])
    const fieldsToAdd = newFields.filter(f => !alreadyOwned.has(f))
    if (!fieldsToAdd.length) return NextResponse.json({ error: 'Ces champs sont déjà débloqués' }, { status: 400 })

    const companyIds = query.company_ids as string[]
    // Price this precisely against the actual companies in THIS search
    // (not the global category-wide coverage estimate) — more accurate
    // and fairer than the wizard's upfront estimate, which is necessarily
    // a category-level approximation.
    const scoreColumns = new Set<string>()
    for (const f of fieldsToAdd) for (const col of FIELD_GROUPS[f].columns) scoreColumns.add(col)
    const { data: rows } = await supabaseAdmin.from('companies_v2').select([...scoreColumns].join(', ')).in('id', companyIds)
    const typedRows = (rows ?? []) as unknown as Record<string, unknown>[]

    let cost = 0
    for (const f of fieldsToAdd) {
      const cols = FIELD_GROUPS[f].columns
      const availableCount = typedRows.filter(r => cols.some(c => r[c] !== null && r[c] !== '')).length
      cost += availableCount * FIELD_GROUPS[f].cost
    }

    if (estimateOnly) return NextResponse.json({ cost, fieldsToAdd })

    const { error } = await supabaseAdmin.rpc('unlock_additional_fields', {
      p_user_id: user.id, p_query_id: queryId, p_new_fields: fieldsToAdd, p_cost: cost,
    })
    if (error) {
      if (error.message?.includes('insufficient_credits')) return NextResponse.json({ error: 'Solde insuffisant' }, { status: 402 })
      throw error
    }

    return NextResponse.json({ ok: true, cost, fieldsAdded: fieldsToAdd })
  } catch (e) {
    console.error('unlock-fields error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
