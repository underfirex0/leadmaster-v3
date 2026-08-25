import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { type FieldGroupId } from '@/lib/constants'
import { BulkAddToCrmButton } from './BulkAddToCrmButton'
import { ResultsList } from './ResultsList'

const PAGE_SIZE = 30

export default async function DatabaseDetailPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { page?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: query } = await supabaseAdmin
    .from('queries')
    .select('id, query_name, result_count, credits_spent, fields, company_ids, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)   // RLS also enforces this, kept explicit for clarity
    .single()

  if (!query) notFound()

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const ids = (query.company_ids as string[]) ?? []
  const pageIds = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(ids.length / PAGE_SIZE))
  const fields = (query.fields as FieldGroupId[]) ?? ['basic']

  const { data: companies } = await supabaseAdmin
    .from('companies_v2')
    .select('id, name, city, sector, domaine, activite, forme_juridique, phone_1, phone_2, website, ice, rc, director, annee_creation, effectif_tranche, capital_mad, address_raw')
    .in('id', pageIds)
    .order('completeness_score', { ascending: false })

  const byId = new Map((companies ?? []).map(c => [c.id, c]))
  const orderedCompanies = pageIds.map(id => byId.get(id)).filter(Boolean) as NonNullable<typeof companies>[number][]

  return (
    <div>
      <Link href="/databases" className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Mes sélections
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{query.query_name}</h1>
      <p className="text-[13px] text-gray-400 mb-4">
        {query.result_count.toLocaleString('fr-FR')} entreprises · {query.credits_spent} cr dépensés · {new Date(query.created_at).toLocaleDateString('fr-FR')}
      </p>

      <div className="mb-6">
        <BulkAddToCrmButton queryId={query.id} count={ids.length} />
      </div>

      <ResultsList queryId={query.id} companies={orderedCompanies} unlockedFields={fields.filter(f => f !== 'basic')} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href={`?page=${Math.max(1, page - 1)}`}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-white disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Link>
          <span className="text-[13px] text-gray-400">Page {page} / {totalPages}</span>
          <Link href={`?page=${Math.min(totalPages, page + 1)}`}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-white">
            Suivant <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
