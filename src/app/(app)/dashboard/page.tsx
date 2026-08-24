import Link from 'next/link'
import { Search, Users2, Wallet, Database, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Every query here is a cheap indexed lookup by user_id — no
  // aggregate scan of companies_v2 ever happens on this page.
  const [{ data: profile }, { count: unlockCount }, { count: leadCount }, { data: recentQueries }] = await Promise.all([
    supabase.from('profiles').select('credit_balance, full_name, free_trial_used').eq('id', user.id).single(),
    supabase.from('company_unlocks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('crm_leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('queries').select('id, query_name, result_count, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Crédits disponibles', value: (profile?.credit_balance ?? 0).toLocaleString('fr-FR'), icon: Wallet, href: '/wallet' },
    { label: 'Entreprises débloquées', value: (unlockCount ?? 0).toLocaleString('fr-FR'), icon: Database, href: '/my-data' },
    { label: 'Leads en CRM', value: (leadCount ?? 0).toLocaleString('fr-FR'), icon: Users2, href: '/crm' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bonjour {profile?.full_name?.split(' ')[0] ?? ''} 👋</h1>
      <p className="text-[13px] text-gray-400 mb-6">Voici un aperçu de votre activité.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
              <Icon className="w-5 h-5 text-brand-500 mb-3" />
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[12.5px] text-gray-400 mt-0.5">{s.label}</div>
            </Link>
          )
        })}
      </div>

      <Link href="/search-v2"
        className="flex items-center justify-between bg-brand-600 text-white rounded-2xl px-6 py-5 mb-8 hover:bg-brand-700 transition-colors">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5" />
          <div>
            <div className="font-bold text-[15px]">Nouvelle recherche</div>
            <div className="text-[12.5px] text-brand-100">Trouvez de nouveaux prospects en quelques clics</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5" />
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-[14px] text-gray-900 mb-3">Recherches récentes</h2>
        {!recentQueries?.length ? (
          <p className="text-[13px] text-gray-400">Aucune recherche pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {recentQueries.map(q => (
              <Link key={q.id} href={`/databases/${q.id}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <span className="text-[13px] font-semibold text-gray-700">{q.query_name}</span>
                <span className="text-[12.5px] text-gray-400">{q.result_count} entreprises</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
