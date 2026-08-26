'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Search, Database, Users2, Wallet, User, LogOut, UploadCloud, TrendingUp, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search-v2',  label: 'Recherche', icon: Search },
  { href: '/databases', label: 'Mes sélections', icon: Database },
  { href: '/crm',        label: 'CRM', icon: Users2 },
  { href: '/kpis',       label: 'KPIs', icon: TrendingUp },
  { href: '/upload',     label: 'Import', icon: UploadCloud },
  { href: '/wallet',     label: 'Crédits', icon: Wallet },
]

export function Navbar({ balance }: { balance: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => setMobileOpen(o => !o)} className="sm:hidden text-gray-500">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-brand-600 text-[15px]">LeadMaster</span>
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.map(l => {
              const active = pathname?.startsWith(l.href)
              const Icon = l.icon
              return (
                <Link key={l.href} href={l.href}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                    active ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800')}>
                  <Icon className="w-4 h-4" /> {l.label}
                </Link>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] sm:text-[13px] font-bold text-brand-700 bg-brand-50 px-2.5 sm:px-3 py-1.5 rounded-pill">
            {balance.toLocaleString('fr-FR')} cr
          </span>
          <Link href="/account" className="text-gray-400 hover:text-gray-700"><User className="w-[18px] h-[18px]" /></Link>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-700"><LogOut className="w-[18px] h-[18px]" /></button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 px-4 py-2">
          {LINKS.map(l => {
            const active = pathname?.startsWith(l.href)
            const Icon = l.icon
            return (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className={cn('flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-[13.5px] font-semibold',
                  active ? 'text-brand-700' : 'text-gray-600')}>
                <Icon className="w-4 h-4" /> {l.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
