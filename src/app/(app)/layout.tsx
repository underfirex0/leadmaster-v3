import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Defense in depth: middleware already redirects unauthenticated
  // requests away from these routes, but this layout never trusts
  // that alone — it independently checks the session itself.
  if (!user) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('credit_balance, team_owner_id').eq('id', user.id).single()

  // A managed team member — their commercial's interface is limited to
  // whatever their owner has explicitly allowed, and never includes
  // team-management or purchasing tools (those stay owner-only). A solo
  // user or an actual team owner (team_owner_id is null either way) sees
  // the full interface.
  const isManagedMember = !!profile?.team_owner_id
  let access: Record<string, boolean> = {}
  if (isManagedMember) {
    const { data: rows } = await supabaseAdmin
      .from('user_feature_access').select('feature, enabled').eq('user_id', user.id)
    access = Object.fromEntries((rows ?? []).map(r => [r.feature, r.enabled]))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar balance={profile?.credit_balance ?? 0} isManagedMember={isManagedMember} access={access} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
