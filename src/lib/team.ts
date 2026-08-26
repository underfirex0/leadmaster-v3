import { supabaseAdmin } from '@/lib/supabase/admin'

// The "team root" is whoever's shared CRM pool a lead belongs to — the
// team owner's id if this user is a member, or their own id if they're
// solo or an owner themselves. Every CRM lead is scoped by this, not
// by whichever specific person happened to add it, so a whole team
// shares one pipeline instead of each person having an island.
export async function resolveTeamRoot(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('profiles').select('team_owner_id').eq('id', userId).single()
  return data?.team_owner_id ?? userId
}

export async function isTeamOwnerOf(callerId: string, memberId: string): Promise<boolean> {
  if (callerId === memberId) return true
  const { data } = await supabaseAdmin.from('profiles').select('team_owner_id').eq('id', memberId).single()
  return data?.team_owner_id === callerId
}
