export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

interface Pair { companyId: string; field: FieldGroupId }

// Unlocks an arbitrary set of (company, field) pairs — the general
// building block behind CRM's per-lead unlock action. Unlike the
// whole-search unlock, these pairs can span completely different
// companies and different fields, since CRM leads rarely share a
// single common search anymore by the time you're managing them.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { pairs, estimateOnly } = await request.json() as { pairs: Pair[]; estimateOnly?: boolean }
    if (!pairs?.length) return NextResponse.json({ error: 'Aucun champ sélectionné' }, { status: 400 })

    const companyIds = [...new Set(pairs.map(p => p.companyId))]

    // Drop pairs the user already owns for that company — never charge twice.
    const { data: existing } = await supabaseAdmin.from('company_unlocks').select('company_id, fields').eq('user_id', user.id).in('company_id', companyIds)
    const ownedMap = new Map((existing ?? []).map(e => [e.company_id, new Set(e.fields as string[])]))
    const newPairs = pairs.filter(p => !(ownedMap.get(p.companyId)?.has(p.field)))
    if (!newPairs.length) return NextResponse.json({ error: 'Ces champs sont déjà débloqués' }, { status: 400 })

    // Fetch just the columns needed to know which pairs have real data.
    const allColumns = new Set<string>()
    for (const p of newPairs) for (const col of FIELD_GROUPS[p.field].columns) allColumns.add(col)
    const { data: rows } = await supabaseAdmin.from('companies_v2').select(`id, ${[...allColumns].join(', ')}`).in('id', companyIds)
    const typedRows = (rows ?? []) as unknown as Record<string, unknown>[]
    const rowById = new Map(typedRows.map(r => [r.id as string, r]))

    let cost = 0
    for (const p of newPairs) {
      const row = rowById.get(p.companyId)
      const hasData = row ? FIELD_GROUPS[p.field].columns.some(c => row[c] !== null && row[c] !== '') : false
      if (hasData) cost += FIELD_GROUPS[p.field].cost
    }

    if (estimateOnly) return NextResponse.json({ cost, pairCount: newPairs.length })

    const { error } = await supabaseAdmin.rpc('unlock_field_pairs', {
      p_user_id: user.id,
      p_pairs: newPairs.map(p => ({ company_id: p.companyId, field: p.field })),
      p_cost: cost,
    })
    if (error) {
      if (error.message?.includes('insufficient_credits')) return NextResponse.json({ error: 'Solde insuffisant' }, { status: 402 })
      throw error
    }

    return NextResponse.json({ ok: true, cost })
  } catch (e) {
    console.error('companies/unlock-fields error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
