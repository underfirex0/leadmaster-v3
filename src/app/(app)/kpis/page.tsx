import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchInChunks } from '@/lib/chunked'
import { resolveTeamRoot } from '@/lib/team'
import { CRM_STATUSES, CRM_STATUS_LABELS, type CrmStatus } from '@/lib/constants'
import { StatusDonut, TrendBarChart, AssigneeBarChart } from '@/components/dashboard/KpiCharts'
import { TrendingUp, Target, Calendar, Users2, Phone } from 'lucide-react'
import Link from 'next/link'

export default async function KpisPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const teamRoot = await resolveTeamRoot(user.id)

  const { data: leads } = await supabaseAdmin
    .from('crm_leads')
    .select('id, company_id, status, assigned_to, callback_date, created_at')
    .eq('owner_account_id', teamRoot)

  if (!leads?.length) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">KPIs</h1>
        <p className="text-[13px] text-gray-400 mb-6">Vos indicateurs de performance CRM.</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400 mb-4">Pas encore de données — ajoutez des leads à votre CRM pour voir vos indicateurs ici.</p>
          <Link href="/databases" className="text-brand-600 font-semibold text-[13px]">Parcourir vos sélections →</Link>
        </div>
      </div>
    )
  }

  const total = leads.length
  const statusCounts = CRM_STATUSES.map(s => ({ name: CRM_STATUS_LABELS[s], value: leads.filter(l => l.status === s).length }))
    .filter(s => s.value > 0)
  const converted = leads.filter(l => l.status === 'converted').length
  const conversionRate = total ? Math.round(100 * converted / total) : 0
  const interested = leads.filter(l => l.status === 'interested' || l.status === 'converted').length
  const engagementRate = total ? Math.round(100 * interested / total) : 0

  // Leads added per day, last 14 days.
  const days: { day: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    const count = leads.filter(l => l.created_at.slice(0, 10) === key).length
    days.push({ day: label, count })
  }

  // Upcoming callbacks/rendez-vous.
  const upcoming = leads
    .filter(l => l.callback_date && new Date(l.callback_date) > new Date())
    .sort((a, b) => new Date(a.callback_date!).getTime() - new Date(b.callback_date!).getTime())
    .slice(0, 8)
  const upcomingCompanyIds = upcoming.map(l => l.company_id).filter(Boolean) as string[]
  const { data: upcomingCompanies } = upcomingCompanyIds.length
    ? await supabaseAdmin.from('companies_v2').select('id, name').in('id', upcomingCompanyIds)
    : { data: [] }
  const upcomingNameMap = new Map((upcomingCompanies ?? []).map(c => [c.id, c.name]))

  // Per-assignee breakdown (only meaningful for team accounts).
  const assignedIds = [...new Set(leads.map(l => l.assigned_to).filter(Boolean))] as string[]
  let assigneeData: { name: string; total: number; converted: number }[] = []
  if (assignedIds.length) {
    const { data: assignees } = await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', assignedIds)
    const nameMap = new Map((assignees ?? []).map(a => [a.id, a.full_name || a.email]))
    assigneeData = assignedIds.map(id => {
      const theirLeads = leads.filter(l => l.assigned_to === id)
      return { name: nameMap.get(id) ?? 'Inconnu', total: theirLeads.length, converted: theirLeads.filter(l => l.status === 'converted').length }
    })
    const unassignedCount = leads.filter(l => !l.assigned_to).length
    if (unassignedCount) assigneeData.push({ name: 'Non assigné', total: unassignedCount, converted: 0 })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">KPIs</h1>
      <p className="text-[13px] text-gray-400 mb-6">Vos indicateurs de performance CRM, synchronisés en direct.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users2, label: 'Total leads', value: total.toLocaleString('fr-FR') },
          { icon: Target, label: 'Taux de conversion', value: `${conversionRate}%` },
          { icon: Phone, label: 'Taux d\'engagement', value: `${engagementRate}%` },
          { icon: Calendar, label: 'Rappels à venir', value: upcoming.length.toString() },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <Icon className="w-4 h-4 text-brand-500 mb-2" />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-[13.5px] text-gray-900 mb-4">Répartition par statut</h3>
          <StatusDonut data={statusCounts} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-[13.5px] text-gray-900 mb-4">Leads ajoutés (14 derniers jours)</h3>
          <TrendBarChart data={days} />
        </div>
      </div>

      {!!assigneeData.length && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h3 className="font-bold text-[13.5px] text-gray-900 mb-4">Performance par membre de l&apos;équipe</h3>
          <AssigneeBarChart data={assigneeData} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-[13.5px] text-gray-900 mb-3">Prochains rappels & rendez-vous</h3>
        {!upcoming.length ? (
          <p className="text-[12.5px] text-gray-400">Aucun rappel ou rendez-vous programmé.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2.5">
                <span className="text-[12.5px] font-semibold text-gray-700">{l.company_id ? upcomingNameMap.get(l.company_id) : '—'}</span>
                <span className="text-[12px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                  {new Date(l.callback_date!).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
