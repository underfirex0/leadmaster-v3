import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchCompaniesByIds, fetchInChunks } from '@/lib/chunked'
import type { FieldGroupId } from '@/lib/constants'
import { CompanyRow, type RowCompany } from '@/components/crm/CompanyRow'
import { FiltersBar } from '@/components/crm/FiltersBar'
import { BulkAddToCrmButton } from './BulkAddToCrmButton'

const PAGE_SIZE = 20

// Pure browsing view for one search: view companies, unlock fields,
// add to CRM. No pipeline/status management here — that lives at /crm,
// which only ever shows companies you've actually added.
export default async function DatabaseDetailPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { page?: string; city?: string; sector?: string; q?: string } }) {
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

  const { data: leads } = await supabaseAdmin
    .from('crm_leads')
    .select('id, company_id')
    .eq('user_id', user.id)
    .eq('source_query_id', query.id)
  const leadByCompany = new Map((leads ?? []).map(l => [l.company_id, l]))

  const basicCompanies = await fetchCompaniesByIds(orderedIds, 'id, name, city, sector, activite') as unknown as
    { id: string; name: string; city: string | null; sector: string | null; activite: string }[]
  const basicMap = new Map(basicCompanies.map(c => [c.id, c]))

  const cities = [...new Set(basicCompanies.map(c => c.city).filter(Boolean))].sort() as string[]
  const sectors = [...new Set(basicCompanies.map(c => c.sector).filter(Boolean))].sort() as string[]

  let filteredIds = orderedIds.filter(id => {
    const c = basicMap.get(id)
    if (!c) return false
    if (searchParams.city && c.city !== searchParams.city) return false
    if (searchParams.sector && c.sector !== searchParams.sector) return false
    if (searchParams.q) {
      const needle = searchParams.q.toLowerCase()
      const hay = `${c.name} ${c.city ?? ''} ${c.sector ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
  filteredIds = filteredIds.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const totalPages = Math.max(1, Math.ceil(filteredIds.length / PAGE_SIZE))
  const pageCompanyIds = filteredIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
    if (searchParams.city) p.set('city', searchParams.city)
    if (searchParams.sector) p.set('sector', searchParams.sector)
    if (searchParams.q) p.set('q', searchParams.q)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return p.toString()
  }

  const notYetAdded = orderedIds.length - (leads?.length ?? 0)

  return (
    <div>
      <Link href="/databases" className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Mes sélections
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{query.query_name}</h1>
      <p className="text-[13px] text-gray-400 mb-4">
        {query.result_count.toLocaleString('fr-FR')} entreprises · {query.credits_spent} cr dépensés · {new Date(query.created_at).toLocaleDateString('fr-FR')}
      </p>

      {notYetAdded > 0 && (
        <div className="mb-5">
          <BulkAddToCrmButton queryId={query.id} count={notYetAdded} />
        </div>
      )}

      <FiltersBar cities={cities} sectors={sectors} showStatusTabs={false} />

      <p className="text-[12px] text-gray-400 mb-2">{filteredIds.length.toLocaleString('fr-FR')} entreprises · page {page}/{totalPages}</p>

      <div className="space-y-2">
        {pageCompanyIds.map(companyId => {
          const detailed = detailedMap.get(companyId)
          if (!detailed) return null
          const lead = leadByCompany.get(companyId)
          return (
            <CompanyRow key={companyId} mode="browse" leadId={lead?.id}
              company={detailed} unlockedFields={unlockMap.get(companyId) ?? []} sourceQueryId={query.id} />
          )
        })}
        {!pageCompanyIds.length && (
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
