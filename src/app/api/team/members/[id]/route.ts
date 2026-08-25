export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Removes a member from the team (unlinks — their account and any
// remaining credits/data stay intact, they just stop being managed by
// this owner and become a standalone account). For fully deleting an
// account entirely, that's an admin action, not a team-owner one.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabaseAdmin.from('profiles').select('team_owner_id').eq('id', params.id).single()
  if (!member || member.team_owner_id !== user.id) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const { error } = await supabaseAdmin.from('profiles').update({ team_owner_id: null }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
