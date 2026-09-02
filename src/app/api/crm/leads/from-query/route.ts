export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveTeamRoot, isFeatureAllowed } from '@/lib/team'

// Adds companies from an existing saved search to the CRM — either all
// of them, or a specific count if provided. company_ids on the query is
// already sorted best-data-first (from when the search first ran), so
// taking a prefix of it naturally sends the highest-quality remaining
// companies first — a real "smart partial" send, not an arbitrary slice.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(await isFeatureAllowed(user.id, 'crm'))) {
    return NextResponse.json({ error: 'Accès au CRM désactivé pour votre compte. Contactez votre administrateur.' }, { status: 403 })
  }

  const { queryId, count } = await request.json() as { queryId: string; count?: number }
  if (!queryId) return NextResponse.json({ error: 'queryId requis' }, { status: 400 })

  const teamRoot = await resolveTeamRoot(user.id)

  const { data: query } = await supabaseAdmin.from('queries').select('owner_account_id, query_name, company_ids').eq('id', queryId).single()
  if (!query || query.owner_account_id !== teamRoot) return NextResponse.json({ error: 'Recherche introuvable' }, { status: 404 })

  const allCompanyIds = (query.company_ids as string[]) ?? []
  if (!allCompanyIds.length) return NextResponse.json({ added: 0 })

  // Only companies not already in CRM for this team count toward "how
  // many to send" — the number you type means "N new ones", not "the
  // first N of the search regardless of what's already there".
  const { data: existingLeads } = await supabaseAdmin.from('crm_leads')
    .select('company_id').eq('owner_account_id', teamRoot).in('company_id', allCompanyIds)
  const alreadyIn = new Set((existingLeads ?? []).map(l => l.company_id))
  const remainingIds = allCompanyIds.filter(id => !alreadyIn.has(id))

  const idsToAdd = (count && count > 0) ? remainingIds.slice(0, count) : remainingIds
  if (!idsToAdd.length) return NextResponse.json({ added: 0 })

  const rows = idsToAdd.map(companyId => ({
    user_id: user.id, owner_account_id: teamRoot, company_id: companyId, status: 'to_call',
    source_query_id: queryId, source_query_name: query.query_name,
  }))
  const { error } = await supabaseAdmin.from('crm_leads').upsert(rows, { onConflict: 'owner_account_id,company_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ added: idsToAdd.length, remaining: remainingIds.length - idsToAdd.length })
}
