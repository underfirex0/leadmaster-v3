import Link from 'next/link'
import { Search, Users2, Wallet, Database, Lock, Sparkles, ArrowRight, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AnalyticsSection } from '@/components/dashboard/AnalyticsSection'
import { resolveTeamRoot } from '@/lib/team'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const teamRoot = await resolveTeamRoot(user.id)

  const [{ data: profile }, { count: unlockCount }, { count: leadCount }, { data: stats }, { data: recentUnlocks }, { data: cities }, { data: taxonomies }, { data: legalForms }] = await Promise.all([
    supabaseAdmin.from('profiles').select('credit_balance, full_name').eq('id', user.id).single(),
    supabaseAdmin.from('company_unlocks').select('*', { count: 'exact', head: true }).eq('owner_account_id', teamRoot),
    supabaseAdmin.from('crm_leads').select('*', { count: 'exact', head: true }).eq('owner_account_id', teamRoot),
    supabaseAdmin.from('admin_stats_catalog').select('*').single(),
    supabaseAdmin.from('company_unlocks').select('company_id, unlocked_at').eq('owner_account_id', teamRoot).order('unlocked_at', { ascending: false }).limit(3),
    supabaseAdmin.from('cities_catalog').select('city, company_count').order('company_count', { ascending: false }).limit(5),
    supabaseAdmin.from('taxonomy_catalog').select('sector, company_count'),
    supabaseAdmin.from('legal_form_catalog').select('forme_juridique, company_count').order('company_count', { ascending: false }).limit(5),
  ])

  const recentCompanyIds = (recentUnlocks ?? []).map(u => u.company_id)
  const { data: recentCompanies } = recentCompanyIds.length
    ? await supabaseAdmin.from('companies_v2').select('id, name, city').in('id', recentCompanyIds)
    : { data: [] }
  const recentMap = new Map((recentCompanies ?? []).map(c => [c.id, c]))

  const totalCompanies = stats?.total_companies ?? 0
  const balance = profile?.credit_balance ?? 0
  const unlocked = unlockCount ?? 0
  const leads = leadCount ?? 0

  const pct = (n: number) => totalCompanies ? Math.round(100 * n / totalCompanies) : 0
  const sectorTotals = new Map<string, number>()
  for (const row of taxonomies ?? []) sectorTotals.set(row.sector, (sectorTotals.get(row.sector) ?? 0) + row.company_count)
  const topSectors = [...sectorTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))
  const topCities = (cities ?? []).map(c => ({ name: c.city, value: c.company_count }))
  const topLegalForms = (legalForms ?? []).map(f => ({ name: f.forme_juridique, value: f.company_count }))

  const statCards = [
    { label: 'Base de données', value: totalCompanies.toLocaleString('fr-FR'), sub: 'entreprises', icon: Database, iconBg: 'bg-brand-50 text-brand-600' },
    { label: 'Déverrouillées', value: unlocked.toLocaleString('fr-FR'), sub: 'entreprises', icon: Lock, iconBg: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pipeline CRM', value: leads.toLocaleString('fr-FR'), sub: 'leads', icon: Users2, iconBg: 'bg-purple-50 text-purple-600' },
    { label: 'Crédits', value: balance.toLocaleString('fr-FR'), sub: 'disponibles', icon: Sparkles, iconBg: 'bg-amber-50 text-amber-600' },
  ]

  const actionCards = [
    { title: 'Nouvelle recherche', sub: 'Filtrez par secteur, ville ou activité', cta: 'Rechercher', href: '/search-v2', icon: Search, iconBg: 'bg-brand-50 text-brand-600' },
    { title: 'Mes Données', sub: `${unlocked.toLocaleString('fr-FR')} entreprises déverrouillées`, cta: 'Voir mes données', href: '/my-data', icon: Lock, iconBg: 'bg-emerald-50 text-emerald-600' },
    { title: 'Mon CRM', sub: `${leads.toLocaleString('fr-FR')} leads dans le pipeline`, cta: 'Gérer le CRM', href: '/crm', icon: Users2, iconBg: 'bg-purple-50 text-purple-600' },
    { title: 'Mes crédits', sub: `${balance.toLocaleString('fr-FR')} crédits disponibles`, cta: 'Gérer', href: '/wallet', icon: Wallet, iconBg: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bonjour, {profile?.full_name?.split(' ')[0] ?? ''} 👋</h1>
      <p className="text-[14px] text-gray-400 mb-6">
        Votre tableau de bord LeadMaster — prospectez plus de {Math.floor(totalCompanies / 1000) * 1000 || totalCompanies} entreprises marocaines.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12.5px] text-gray-400">{s.label}</span>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.iconBg}`}><Icon className="w-3.5 h-3.5" /></span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="flex items-center gap-1.5 font-bold text-[15px] text-gray-900 mb-3">
            <Sparkles className="w-4 h-4 text-brand-500" /> Actions rapides
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {actionCards.map(a => {
              const Icon = a.icon
              return (
                <Link key={a.title} href={a.href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 transition-colors">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${a.iconBg}`}><Icon className="w-4.5 h-4.5" /></span>
                  <div className="font-bold text-[14.5px] text-gray-900 mb-1">{a.title}</div>
                  <div className="text-[12.5px] text-gray-400 mb-3">{a.sub}</div>
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-brand-600">
                    {a.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[14px] text-gray-900">Dernières déverrouillées</h2>
              {unlocked > 0 && <Link href="/my-data" className="text-[12px] font-semibold text-brand-600">Voir tout →</Link>}
            </div>
            {!recentUnlocks?.length ? (
              <p className="text-[12.5px] text-gray-400">Aucune entreprise débloquée pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {recentUnlocks.map(u => {
                  const c = recentMap.get(u.company_id)
                  if (!c) return null
                  const initial = c.name[0]?.toUpperCase() ?? '?'
                  return (
                    <div key={u.company_id} className="flex items-center gap-2.5 px-1 py-1.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[11px] font-bold shrink-0">{initial}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-gray-800 truncate">{c.name}</div>
                        {c.city && <div className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{c.city}</div>}
                      </div>
                      <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <AnalyticsSection
          totalCompanies={totalCompanies}
          phonePct={pct(stats?.with_phone ?? 0)}
          icePct={pct(stats?.with_ice ?? 0)}
          directorPct={pct(stats?.with_director ?? 0)}
          effectifPct={pct(stats?.with_effectif ?? 0)}
          capitalPct={pct(stats?.with_capital ?? 0)}
          topCities={topCities}
          topSectors={topSectors}
          topLegalForms={topLegalForms}
        />
      </div>
    </div>
  )
}
