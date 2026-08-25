import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchInChunks } from '@/lib/chunked'
import { CRM_STATUSES, type CrmStatus, type FieldGroupId } from '@/lib/constants'
import { CompanyRow, type RowCompany } from '@/components/crm/CompanyRow'
import { FiltersBar } from '@/components/crm/FiltersBar'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Database } from 'lucide-react'

const PAGE_SIZE = 20

export default async function CrmPage({
  searchParams,
}: { searchParams: { page?: string; status?: string; city?: string; sector?: string; source?: string; q?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Every lead the user has actually added — across every selection.
  // This is the ONLY place status/pipeline management happens.
  const { data: leads } = await supabaseAdmin
    .from('crm_leads')
    .select('id, company_id, status, priority, source_query_name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!leads?.length) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">CRM</h1>
        <p className="text-[13px] text-gray-400 mb-6">Suivez vos prospects, filtrez et changez leur statut.</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Database className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400 mb-4">Aucun lead ajouté pour le moment.</p>
          <Link href="/databases" className="text-brand-600 font-semibold text-[13px]">Parcourir vos sélections →</Link>
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
      supabaseAdmin.from('company_unlocks').select('company_id, fields').eq('user_id', user.id).in('company_id', chunkIds)
    ) as Promise<{ company_id: string; fields: string[] }[]>,
  ])
  const detailedMap = new Map(detailedCompanies.map(c => [c.id, c]))
  const unlockMap = new Map(unlocks.map(u => [u.company_id, u.fields as FieldGroupId[]]))

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
      <p className="text-[13px] text-gray-400 mb-6">Suivez vos prospects, filtrez et changez leur statut.</p>

      <FiltersBar statusCounts={statusCounts} cities={cities} sectors={sectors} sources={sources} />

      <p className="text-[12px] text-gray-400 mb-2">{filtered.length.toLocaleString('fr-FR')} leads · page {page}/{totalPages}</p>

      <div className="space-y-2">
        {pageLeads.map(lead => {
          const detailed = lead.company_id ? detailedMap.get(lead.company_id) : null
          if (!detailed) return null
          return (
            <CompanyRow key={lead.id} mode="manage" leadId={lead.id} status={lead.status as CrmStatus}
              company={detailed} unlockedFields={lead.company_id ? (unlockMap.get(lead.company_id) ?? []) : []}
              sourceQueryName={lead.source_query_name} />
          )
        })}
        {!pageLeads.length && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-[13px] text-gray-400">
            Aucun lead ne correspond à ces filtres.
          </div>
        )}
      </div>

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
