export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveTeamRoot } from '@/lib/team'

// Adds every company in an existing saved search to the CRM in one go —
// avoids shipping a potentially thousands-long id list to the browser
// and back just to re-send it here. Companies already in CRM (from
// this or another selection) are left untouched.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { queryId } = await request.json()
  if (!queryId) return NextResponse.json({ error: 'queryId requis' }, { status: 400 })

  const { data: query } = await supabaseAdmin.from('queries').select('user_id, query_name, company_ids').eq('id', queryId).single()
  if (!query || query.user_id !== user.id) return NextResponse.json({ error: 'Recherche introuvable' }, { status: 404 })

  const companyIds = (query.company_ids as string[]) ?? []
  if (!companyIds.length) return NextResponse.json({ added: 0 })

  const teamRoot = await resolveTeamRoot(user.id)
  const rows = companyIds.map(companyId => ({
    user_id: user.id, owner_account_id: teamRoot, company_id: companyId, status: 'to_call',
    source_query_id: queryId, source_query_name: query.query_name,
  }))
  const { error } = await supabaseAdmin.from('crm_leads').upsert(rows, { onConflict: 'owner_account_id,company_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ added: companyIds.length })
}
