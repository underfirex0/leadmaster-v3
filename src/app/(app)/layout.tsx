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

  const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar balance={profile?.credit_balance ?? 0} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
