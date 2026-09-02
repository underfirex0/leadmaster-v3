import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchInChunks } from '@/lib/chunked'
import { resolveTeamRoot, isFeatureAllowed } from '@/lib/team'
import { CRM_STATUSES, type CrmStatus, type FieldGroupId } from '@/lib/constants'
import { type RowCompany } from '@/components/crm/CompanyRow'
import { CrmLeadsClient, type CrmLeadItem } from '@/components/crm/CrmLeadsClient'
import { FiltersBar } from '@/components/crm/FiltersBar'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Database, Lock } from 'lucide-react'

const PAGE_SIZE = 20

export default async function CrmPage({
  searchParams,
}: { searchParams: { page?: string; status?: string; city?: string; sector?: string; source?: string; q?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (!(await isFeatureAllowed(user.id, 'crm'))) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">CRM</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Lock className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500 font-medium mb-1">Accès désactivé</p>
          <p className="text-[13px] text-gray-400">Votre administrateur a désactivé l&apos;accès au CRM pour votre compte.</p>
        </div>
      </div>
    )
  }

  const teamRoot = await resolveTeamRoot(user.id)
  const canAssign = teamRoot === user.id  // only the actual team owner reassigns leads

  // The owner sees the whole team's shared pool. A member only sees
  // leads that have actually been assigned to them — not everyone
  // else's work too. An unassigned lead is invisible to members until
  // the owner assigns it to someone.
  let leadsQuery = supabaseAdmin
    .from('crm_leads')
    .select('id, company_id, status, priority, source_query_name, callback_date, assigned_to, created_at')
    .eq('owner_account_id', teamRoot)
  if (!canAssign) leadsQuery = leadsQuery.eq('assigned_to', user.id)
  const { data: leads } = await leadsQuery.order('created_at', { ascending: false })

  // Team roster for the assignment dropdown — the owner plus everyone
  // they've created as a member.
  const [{ data: ownerProfile }, { data: members }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, email').eq('id', teamRoot).single(),
    supabaseAdmin.from('profiles').select('id, full_name, email').eq('team_owner_id', teamRoot),
  ])
  const assigneeOptions = [
    ...(ownerProfile ? [{ id: ownerProfile.id, name: (ownerProfile.full_name || ownerProfile.email) + (ownerProfile.id === user.id ? ' (vous)' : '') }] : []),
    ...(members ?? []).map(m => ({ id: m.id, name: (m.full_name || m.email) + (m.id === user.id ? ' (vous)' : '') })),
  ]

  if (!leads?.length) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">CRM</h1>
        <p className="text-[13px] text-gray-400 mb-6">{canAssign ? 'Suivez vos prospects, filtrez et changez leur statut. Pipeline partagé avec votre équipe.' : 'Vos prospects assignés — filtrez et changez leur statut.'}</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Database className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400 mb-4">{canAssign ? 'Aucun lead ajouté pour le moment.' : "Aucun lead ne vous a été assigné pour le moment."}</p>
          {canAssign && <Link href="/databases" className="text-brand-600 font-semibold text-[13px]">Parcourir vos sélections →</Link>}
        </div>
      </div>
    )
  }

  const companyIds = [...new Set(leads.map(l => l.company_id).filter(Boolean))] as string[]
  const basicCompanies = await fetchInChunks(companyIds, chunkIds =>
    supabaseAdmin.from('companies_v2').select('id, name, city, sector, activite').in('id', chunkIds)
  ) as { id: string; name: string; city: string | null; sector: string | null; activite: string }[]
  const basicMap = new Map(basicCompanies.map(c => [c.id, c]))

  const statusCounts: Record<string, number> = { all: leads.length }
  for (const s of CRM_STATUSES) statusCounts[s] = leads.filter(l => l.status === s).length

  const cities = [...new Set(basicCompanies.map(c => c.city).filter(Boolean))].sort() as string[]
  const sectors = [...new Set(basicCompanies.map(c => c.sector).filter(Boolean))].sort() as string[]
  const sources = [...new Set(leads.map(l => l.source_query_name).filter(Boolean))].sort() as string[]

  const filtered = leads.filter(l => {
    const c = l.company_id ? basicMap.get(l.company_id) : null
    if (!c) return false
    if (searchParams.status && l.status !== searchParams.status) return false
    if (searchParams.city && c.city !== searchParams.city) return false
    if (searchParams.sector && c.sector !== searchParams.sector) return false
    if (searchParams.source && l.source_query_name !== searchParams.source) return false
    if (searchParams.q) {
      const needle = searchParams.q.toLowerCase()
      const hay = `${c.name} ${c.city ?? ''} ${c.sector ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageLeads = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageCompanyIds = pageLeads.map(l => l.company_id).filter(Boolean) as string[]

  const [detailedCompanies, unlocks] = await Promise.all([
    fetchInChunks(pageCompanyIds, chunkIds =>
      supabaseAdmin.from('companies_v2').select('id, name, city, sector, activite, phone_1, phone_2, website, ice, rc, director, annee_creation, effectif_tranche, capital_mad, address_raw').in('id', chunkIds)
    ) as Promise<RowCompany[]>,
    fetchInChunks(pageCompanyIds, chunkIds =>
      supabaseAdmin.from('company_unlocks').select('company_id, fields').eq('owner_account_id', teamRoot).in('company_id', chunkIds)
    ) as Promise<{ company_id: string; fields: string[] }[]>,
  ])
  const detailedMap = new Map(detailedCompanies.map(c => [c.id, c]))
  const unlockMap = new Map(unlocks.map(u => [u.company_id, u.fields as FieldGroupId[]]))

  const items: CrmLeadItem[] = pageLeads.map(lead => ({
    leadId: lead.id,
    status: lead.status as CrmStatus,
    company: detailedMap.get(lead.company_id!) as RowCompany,
    unlockedFields: lead.company_id ? (unlockMap.get(lead.company_id) ?? []) : [],
    sourceQueryName: lead.source_query_name,
    callbackDate: lead.callback_date,
    assignedTo: lead.assigned_to,
  })).filter(i => i.company)

  const buildQS = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (searchParams.status) p.set('status', searchParams.status)
    if (searchParams.city) p.set('city', searchParams.city)
    if (searchParams.sector) p.set('sector', searchParams.sector)
    if (searchParams.source) p.set('source', searchParams.source)
    if (searchParams.q) p.set('q', searchParams.q)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return p.toString()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">CRM</h1>
      <p className="text-[13px] text-gray-400 mb-6">
        {canAssign
          ? <>Suivez vos prospects, filtrez et changez leur statut.{assigneeOptions.length > 1 && ' Pipeline partagé avec votre équipe.'}</>
          : 'Vos prospects assignés — filtrez et changez leur statut.'}
      </p>

      <FiltersBar statusCounts={statusCounts} cities={cities} sectors={sectors} sources={sources} />

      <p className="text-[12px] text-gray-400 mb-2">{filtered.length.toLocaleString('fr-FR')} leads · page {page}/{totalPages}</p>

      <CrmLeadsClient items={items} assigneeOptions={assigneeOptions} canAssign={canAssign}
        unassignedCount={leads.filter(l => !l.assigned_to).length} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href={`?${buildQS({ page: String(Math.max(1, page - 1)) })}`}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-white">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Link>
          <span className="text-[13px] text-gray-400">Page {page} / {totalPages}</span>
          <Link href={`?${buildQS({ page: String(Math.min(totalPages, page + 1)) })}`}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-white">
            Suivant <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
