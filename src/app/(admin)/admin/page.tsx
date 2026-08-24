import { Building2, Users2, ShieldAlert, Wallet, Phone, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AdminDashboardPage() {
  // Every number here comes from admin_stats_catalog — a precomputed
  // singleton row refreshed by refresh_search_catalog(), never a live
  // COUNT(*) over companies_v2 on page load.
  const { data: stats } = await supabaseAdmin.from('admin_stats_catalog').select('*').single()
  const { count: pendingRefunds } = await supabaseAdmin.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  const { count: pendingUploads } = await supabaseAdmin.from('data_upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  const cards = [
    { label: 'Entreprises (total)', value: stats?.total_companies ?? 0, icon: Building2 },
    { label: 'Enregistrements faible qualité', value: stats?.total_low_quality ?? 0, icon: ShieldAlert },
    { label: 'Utilisateurs', value: stats?.total_users ?? 0, icon: Users2 },
    { label: 'Entreprises débloquées (total)', value: stats?.total_unlocks ?? 0, icon: Wallet },
  ]
  const coverage = [
    { label: 'Avec téléphone', value: stats?.with_phone ?? 0, icon: Phone },
    { label: 'Avec email', value: stats?.with_email ?? 0, icon: Mail },
    { label: 'Avec ICE', value: stats?.with_ice ?? 0, icon: ShieldCheck },
    { label: 'Avec dirigeant', value: stats?.with_director ?? 0, icon: UserRound },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Vue d&apos;ensemble</h1>
      <p className="text-[12.5px] text-gray-400 mb-6">
        Dernière actualisation du catalogue : {stats?.updated_at ? new Date(stats.updated_at).toLocaleString('fr-FR') : '—'}
      </p>

      <div className="grid sm:grid-cols-4 gap-4 mb-4">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <Icon className="w-5 h-5 text-brand-500 mb-3" />
              <div className="text-2xl font-bold text-gray-900">{c.value.toLocaleString('fr-FR')}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">{c.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        {coverage.map(c => {
          const Icon = c.icon
          const pct = stats?.total_companies ? Math.round(100 * c.value / stats.total_companies) : 0
          return (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <Icon className="w-4 h-4 text-gray-400 mb-2" />
              <div className="text-lg font-bold text-gray-900">{pct}%</div>
              <div className="text-[11.5px] text-gray-400">{c.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <a href="/admin/refunds" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 transition-colors flex items-center justify-between">
          <span className="text-[13.5px] font-semibold text-gray-800">Signalements en attente</span>
          <span className="text-lg font-bold text-amber-600">{pendingRefunds ?? 0}</span>
        </a>
        <a href="/admin/uploads" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 transition-colors flex items-center justify-between">
          <span className="text-[13.5px] font-semibold text-gray-800">Demandes de données en attente</span>
          <span className="text-lg font-bold text-amber-600">{pendingUploads ?? 0}</span>
        </a>
      </div>
    </div>
  )
}
