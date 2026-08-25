export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const companyIds: string[] = body.companyIds ?? (body.companyId ? [body.companyId] : [])
  if (!companyIds.length) return NextResponse.json({ error: 'companyId(s) requis' }, { status: 400 })

  let sourceQueryName: string | null = null
  if (body.sourceQueryId) {
    const { data: q } = await supabaseAdmin.from('queries').select('query_name').eq('id', body.sourceQueryId).eq('user_id', user.id).single()
    sourceQueryName = q?.query_name ?? null
  }

  // Verify the user actually unlocked each company before letting them
  // add it as a lead — CRM leads shouldn't bypass the unlock system.
  const { data: unlocks } = await supabaseAdmin.from('company_unlocks').select('company_id').eq('user_id', user.id).in('company_id', companyIds)
  const unlockedIds = new Set((unlocks ?? []).map(u => u.company_id))
  const validIds = companyIds.filter(id => unlockedIds.has(id))
  if (!validIds.length) return NextResponse.json({ error: 'Aucune de ces entreprises n\'est débloquée' }, { status: 403 })

  const rows = validIds.map(companyId => ({
    user_id: user.id, company_id: companyId, status: 'to_call',
    source_query_id: body.sourceQueryId ?? null, source_query_name: sourceQueryName,
  }))
  const { error } = await supabaseAdmin
    .from('crm_leads')
    .upsert(rows, { onConflict: 'user_id,company_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ added: validIds.length, skipped: companyIds.length - validIds.length })
}
