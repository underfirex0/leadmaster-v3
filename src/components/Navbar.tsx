'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Search, Database, Users2, Wallet, User, LogOut, UploadCloud, TrendingUp, Menu, X, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface NavLink { href: string; label: string; icon: typeof LayoutDashboard }

// Builds the nav differently depending on who's looking at it — a real
// team owner (or a solo user, same thing here) always sees everything.
// A managed team member only sees what their owner has actually left
// enabled, and never sees team-management or credit-purchasing tools at
// all (those stay entirely owner-side, regardless of feature toggles) —
// this is what makes the two roles' interfaces genuinely different
// instead of an identical UI with some buttons quietly failing.
function getLinks(isManagedMember: boolean, access: Record<string, boolean>): NavLink[] {
  const links: NavLink[] = [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]

  if (!isManagedMember || access.search !== false) {
    links.push({ href: '/search-v2', label: 'Recherche', icon: Search })
    links.push({ href: '/databases', label: 'Mes sélections', icon: Database })
  }
  if (!isManagedMember || access.crm !== false) {
    links.push({ href: '/crm', label: 'CRM', icon: Users2 })
  }
  if (!isManagedMember) {
    // Team-wide performance overview — a management tool, not something
    // an individual commercial needs or should see other members' numbers in.
    links.push({ href: '/kpis', label: 'KPIs', icon: TrendingUp })
  }
  if (!isManagedMember || access.data_upload !== false) {
    links.push({ href: '/upload', label: 'Import', icon: UploadCloud })
  }
  if (!isManagedMember) {
    // Purchasing/subscription management — members receive credits via
    // an internal transfer from their owner, they never buy their own.
    links.push({ href: '/wallet', label: 'Crédits', icon: Wallet })
  }
  return links
}

export function Navbar({
  balance, isManagedMember = false, access = {},
}: { balance: number; isManagedMember?: boolean; access?: Record<string, boolean> }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = getLinks(isManagedMember, access)

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
          <Link href="/dashboard" className="flex items-center">
            <Image src="/logo.png" alt="LeadMaster" width={121} height={50} priority className="h-6 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {links.map(l => {
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
          {isManagedMember && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-gray-400 border border-gray-200 px-2 py-1 rounded-pill">
              <ShieldCheck className="w-3 h-3" /> Compte membre
            </span>
          )}
          <span className="text-[12.5px] sm:text-[13px] font-bold text-brand-700 bg-brand-50 px-2.5 sm:px-3 py-1.5 rounded-pill">
            {balance.toLocaleString('fr-FR')} cr
          </span>
          <Link href="/account" className="text-gray-400 hover:text-gray-700"><User className="w-[18px] h-[18px]" /></Link>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-700"><LogOut className="w-[18px] h-[18px]" /></button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 px-4 py-2">
          {isManagedMember && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 py-1.5">
              <ShieldCheck className="w-3 h-3" /> Compte membre
            </div>
          )}
          {links.map(l => {
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
