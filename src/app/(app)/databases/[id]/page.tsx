import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchCompaniesByIds, fetchInChunks } from '@/lib/chunked'
import { CRM_STATUSES, type CrmStatus, type FieldGroupId } from '@/lib/constants'
import { CompanyRow, type RowCompany } from '@/components/crm/CompanyRow'
import { FiltersBar } from '@/components/crm/FiltersBar'

const PAGE_SIZE = 20

export default async function DatabaseDetailPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { page?: string; status?: string; city?: string; sector?: string; q?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: query } = await supabaseAdmin
    .from('queries')
    .select('id, query_name, result_count, credits_spent, fields, company_ids, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!query) notFound()

  const orderedIds = (query.company_ids as string[]) ?? []
  const orderIndex = new Map(orderedIds.map((id, i) => [id, i]))

  // Single indexed query — deliberately NOT an .in() over potentially
  // thousands of ids, which is exactly what silently broke at scale
  // before. source_query_id is indexed and gives us every lead for
  // this selection directly.
  const { data: leads } = await supabaseAdmin
    .from('crm_leads')
    .select('id, company_id, status, priority')
    .eq('user_id', user.id)
    .eq('source_query_id', query.id)

  // Basic info for filter dropdowns and list ordering — chunked so it
  // never hits a URL-length limit regardless of selection size.
  const basicCompanies = await fetchCompaniesByIds(orderedIds, 'id, name, city, sector, activite') as unknown as
    { id: string; name: string; city: string | null; sector: string | null; activite: string }[]
  const basicMap = new Map(basicCompanies.map(c => [c.id, c]))

  const statusCounts: Record<string, number> = { all: leads?.length ?? 0 }
  for (const s of CRM_STATUSES) statusCounts[s] = (leads ?? []).filter(l => l.status === s).length

  const cities = [...new Set(basicCompanies.map(c => c.city).filter(Boolean))].sort() as string[]
  const sectors = [...new Set(basicCompanies.map(c => c.sector).filter(Boolean))].sort() as string[]

  // Filter, then restore the original completeness-first order (DB
  // results from the leads/company queries above come back in
  // arbitrary order, not the frozen ranking from search time).
  let filtered = (leads ?? []).filter(l => {
    const c = l.company_id ? basicMap.get(l.company_id) : null
    if (!c) return false
    if (searchParams.status && l.status !== searchParams.status) return false
    if (searchParams.city && c.city !== searchParams.city) return false
    if (searchParams.sector && c.sector !== searchParams.sector) return false
    if (searchParams.q) {
      const needle = searchParams.q.toLowerCase()
      const hay = `${c.name} ${c.city ?? ''} ${c.sector ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
  filtered = filtered.sort((a, b) => (orderIndex.get(a.company_id!) ?? 0) - (orderIndex.get(b.company_id!) ?? 0))

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
    if (searchParams.q) p.set('q', searchParams.q)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return p.toString()
  }

  return (
    <div>
      <Link href="/crm" className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Mes sélections
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{query.query_name}</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        {query.result_count.toLocaleString('fr-FR')} entreprises · {query.credits_spent} cr dépensés · {new Date(query.created_at).toLocaleDateString('fr-FR')}
      </p>

      <FiltersBar statusCounts={statusCounts} cities={cities} sectors={sectors} />

      <p className="text-[12px] text-gray-400 mb-2">{filtered.length.toLocaleString('fr-FR')} entreprises · page {page}/{totalPages}</p>

      <div className="space-y-2">
        {pageLeads.map(lead => {
          const detailed = lead.company_id ? detailedMap.get(lead.company_id) : null
          if (!detailed) return null
          return (
            <CompanyRow key={lead.id} leadId={lead.id} status={lead.status as CrmStatus}
              company={detailed} unlockedFields={lead.company_id ? (unlockMap.get(lead.company_id) ?? []) : []} />
          )
        })}
        {!pageLeads.length && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-[13px] text-gray-400">
            Aucune entreprise ne correspond à ces filtres.
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
