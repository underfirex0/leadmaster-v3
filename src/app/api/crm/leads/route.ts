export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveTeamRoot, isFeatureAllowed } from '@/lib/team'

// Manual add — single company or a specific list. Tags each new lead
// with the search it came from (sourceQueryId), so CRM can always show
// and filter by which selection a lead belongs to. A company already
// in CRM from an earlier add keeps its original status/provenance —
// this never overwrites an existing lead. Scoped to the team's shared
// pool (owner_account_id), so anyone on the same team sees it.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(await isFeatureAllowed(user.id, 'crm'))) {
    return NextResponse.json({ error: 'Accès au CRM désactivé pour votre compte. Contactez votre administrateur.' }, { status: 403 })
  }

  const body = await request.json()
  const companyIds: string[] = body.companyIds ?? (body.companyId ? [body.companyId] : [])
  if (!companyIds.length) return NextResponse.json({ error: 'companyId(s) requis' }, { status: 400 })

  const teamRoot = await resolveTeamRoot(user.id)

  let sourceQueryName: string | null = null
  if (body.sourceQueryId) {
    const { data: q } = await supabaseAdmin.from('queries').select('query_name').eq('id', body.sourceQueryId).eq('owner_account_id', teamRoot).single()
    sourceQueryName = q?.query_name ?? null
  }

  // Verify the TEAM actually unlocked each company before letting anyone
  // add it as a lead — CRM leads shouldn't bypass the unlock system.
  // Team-wide, not individual: a company a teammate already unlocked
  // should be addable by anyone on the team, not just whoever paid for it.
  const { data: unlocks } = await supabaseAdmin.from('company_unlocks').select('company_id').eq('owner_account_id', teamRoot).in('company_id', companyIds)
  const unlockedIds = new Set((unlocks ?? []).map(u => u.company_id))
  const validIds = companyIds.filter(id => unlockedIds.has(id))
  if (!validIds.length) return NextResponse.json({ error: 'Aucune de ces entreprises n\'est débloquée' }, { status: 403 })

  const rows = validIds.map(companyId => ({
    user_id: user.id, owner_account_id: teamRoot, company_id: companyId, status: 'to_call',
    source_query_id: body.sourceQueryId ?? null, source_query_name: sourceQueryName,
  }))
  const { error } = await supabaseAdmin
    .from('crm_leads')
    .upsert(rows, { onConflict: 'owner_account_id,company_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ added: validIds.length, skipped: companyIds.length - validIds.length })
}
