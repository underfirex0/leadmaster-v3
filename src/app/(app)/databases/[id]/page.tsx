import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, Phone, Globe, ShieldCheck, UserRound, Calendar, Banknote, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'
import { AddToCrmButton } from './AddToCrmButton'
import { BulkAddToCrmButton } from './BulkAddToCrmButton'
import { UnlockFieldsPanel } from './UnlockFieldsPanel'

const PAGE_SIZE = 30

const FIELD_DISPLAY: Partial<Record<FieldGroupId, { icon: React.ElementType; render: (c: Record<string, unknown>) => string }>> = {
  phone: { icon: Phone, render: c => [c.phone_1, c.phone_2].filter(Boolean).join(' · ') || '—' },
  website: { icon: Globe, render: c => (c.website as string) || '—' },
  ice: { icon: ShieldCheck, render: c => [c.ice, c.rc].filter(Boolean).join(' · ') || '—' },
  director: { icon: UserRound, render: c => (c.director as string) || '—' },
  annee_creation: { icon: Calendar, render: c => (c.annee_creation as number)?.toString() || '—' },
  effectif: { icon: UserRound, render: c => (c.effectif_tranche as string) || '—' },
  capital: { icon: Banknote, render: c => c.capital_mad ? `${Number(c.capital_mad).toLocaleString('fr-FR')} MAD` : '—' },
  address: { icon: MapPin, render: c => (c.address_raw as string) || '—' },
}

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
  const lockedFields = (Object.keys(FIELD_GROUPS) as FieldGroupId[]).filter(f => f !== 'basic' && !fields.includes(f))

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

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <BulkAddToCrmButton queryId={query.id} count={ids.length} />
        <UnlockFieldsPanel queryId={query.id} lockedFields={lockedFields} />
      </div>

      <div className="space-y-3">
        {orderedCompanies.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-bold text-[14.5px] text-gray-900">{c.name}</div>
                <div className="text-[12px] text-gray-400">{c.city || 'Ville inconnue'} · {c.activite}</div>
              </div>
              {c.forme_juridique && <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg shrink-0">{c.forme_juridique}</span>}
            </div>
            <div className="flex justify-end mb-1"><AddToCrmButton companyId={c.id} /></div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
              {fields.filter(f => f !== 'basic').map(f => {
                const d = FIELD_DISPLAY[f]
                if (!d) return null
                const Icon = d.icon
                return (
                  <div key={f} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                    <Icon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="text-gray-400">{FIELD_GROUPS[f].label}:</span>
                    <span className="font-medium">{d.render(c as Record<string, unknown>)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

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
