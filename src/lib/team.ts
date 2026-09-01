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

// Whether this specific user is allowed to use a given feature — checked
// against their OWN user_id (never the team root's), since access is
// restricted per-member by the owner, and the owner is never restricted.
// Access rows are opt-out: no row (or enabled=true) means allowed, an
// explicit enabled=false row is what blocks it — matching the UI's own
// `member.access[key] !== false` default. This was previously only ever
// SET (via the account/team settings UI) and never actually CHECKED
// anywhere a feature is used — meaning a disabled toggle had no real
// effect. This function is what closes that gap.
export async function isFeatureAllowed(userId: string, feature: 'search' | 'unlock' | 'crm' | 'data_upload'): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_feature_access')
    .select('enabled')
    .eq('user_id', userId)
    .eq('feature', feature)
    .maybeSingle()
  if (error) return true // fail open — a lookup error should never lock someone out
  return data?.enabled !== false
}
