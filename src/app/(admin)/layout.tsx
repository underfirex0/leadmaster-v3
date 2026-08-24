import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users2, AlertTriangle, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const LINKS = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users2 },
  { href: '/admin/refunds', label: 'Signalements', icon: AlertTriangle },
  { href: '/admin/uploads', label: 'Demandes de données', icon: UploadCloud },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Defense in depth: middleware already blocks non-admins from /admin,
  // but this layout independently re-verifies rather than trusting that.
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <span className="font-bold text-[14px]">LeadMaster · Admin</span>
          <div className="flex items-center gap-1">
            {LINKS.map(l => {
              const Icon = l.icon
              return (
                <Link key={l.href} href={l.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                  <Icon className="w-4 h-4" /> {l.label}
                </Link>
              )
            })}
          </div>
          <Link href="/dashboard" className="ml-auto text-[12.5px] text-gray-400 hover:text-white">← Retour à l&apos;app</Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
