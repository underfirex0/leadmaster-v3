'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone, MapPin, UserRound, ShieldCheck, Calendar, Banknote, Globe,
  ChevronLeft, ChevronRight, Search, Lock, Unlock, Loader2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CRM_STATUSES, CRM_STATUS_LABELS, type CrmStatus, FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

export interface CrmLeadRow {
  id: string
  status: CrmStatus
  priority: string | null
  notes: string | null
  callback_date: string | null
  created_at: string
  sourceQueryName: string | null
  unlockedFields: FieldGroupId[]
  company: {
    id: string; name: string; city: string | null; sector: string | null
    phone_1: string | null; phone_2: string | null; website: string | null
    ice: string | null; rc: string | null; director: string | null
    annee_creation: number | null; effectif_tranche: string | null
    capital_mad: number | null; address_raw: string | null
  } | null
}

const STATUS_DOT: Record<CrmStatus, string> = {
  to_call: 'bg-blue-500', in_progress: 'bg-purple-500', callback: 'bg-orange-500', appointment: 'bg-teal-500',
  interested: 'bg-emerald-500', not_interested: 'bg-red-500',
  converted: 'bg-brand-600', archived: 'bg-gray-400',
}

const FIELD_DISPLAY: Partial<Record<FieldGroupId, { icon: React.ElementType; render: (c: NonNullable<CrmLeadRow['company']>) => string }>> = {
  phone: { icon: Phone, render: c => [c.phone_1, c.phone_2].filter(Boolean).join(' · ') || '—' },
  website: { icon: Globe, render: c => c.website || '—' },
  ice: { icon: ShieldCheck, render: c => [c.ice, c.rc].filter(Boolean).join(' · ') || '—' },
  director: { icon: UserRound, render: c => c.director || '—' },
  annee_creation: { icon: Calendar, render: c => c.annee_creation?.toString() || '—' },
  effectif: { icon: UserRound, render: c => c.effectif_tranche || '—' },
  capital: { icon: Banknote, render: c => c.capital_mad ? `${Number(c.capital_mad).toLocaleString('fr-FR')} MAD` : '—' },
  address: { icon: MapPin, render: c => c.address_raw || '—' },
}

const ALL_METERED_FIELDS = (Object.keys(FIELD_GROUPS) as FieldGroupId[]).filter(f => f !== 'basic')
const TOTAL_FIELDS = Object.keys(FIELD_GROUPS).length
const PAGE_SIZE = 20

function relativeDays(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1j'
  return `il y a ${days}j`
}

function pairKey(companyId: string, field: FieldGroupId) { return `${companyId}::${field}` }

export function CrmList({ initialLeads }: { initialLeads: CrmLeadRow[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [statusTab, setStatusTab] = useState<CrmStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null)

  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set())
  const [estimate, setEstimate] = useState<{ cost: number } | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const cities = useMemo(() => [...new Set(leads.map(l => l.company?.city).filter(Boolean))].sort() as string[], [leads])
  const sectors = useMemo(() => [...new Set(leads.map(l => l.company?.sector).filter(Boolean))].sort() as string[], [leads])
  const sources = useMemo(() => [...new Set(leads.map(l => l.sourceQueryName).filter(Boolean))].sort() as string[], [leads])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length }
    for (const s of CRM_STATUSES) c[s] = leads.filter(l => l.status === s).length
    return c
  }, [leads])

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusTab !== 'all' && l.status !== statusTab) return false
      if (cityFilter && l.company?.city !== cityFilter) return false
      if (sectorFilter && l.company?.sector !== sectorFilter) return false
      if (priorityFilter && l.priority !== priorityFilter) return false
      if (sourceFilter && l.sourceQueryName !== sourceFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const hay = `${l.company?.name ?? ''} ${l.company?.city ?? ''} ${l.company?.sector ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [leads, statusTab, cityFilter, sectorFilter, priorityFilter, sourceFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function changeStatus(leadId: string, status: CrmStatus) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    setOpenStatusMenu(null)
    await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
  }

  function toggleLockedField(companyId: string, field: FieldGroupId) {
    setEstimate(null)
    setUnlockError(null)
    setSelectedPairs(prev => {
      const next = new Set(prev)
      const key = pairKey(companyId, field)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function pairsPayload() {
    return [...selectedPairs].map(k => {
      const [companyId, field] = k.split('::')
      return { companyId, field: field as FieldGroupId }
    })
  }

  async function fetchEstimate() {
    setUnlockLoading(true)
    setUnlockError(null)
    const res = await fetch('/api/companies/unlock-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: pairsPayload(), estimateOnly: true }),
    })
    const data = await res.json()
    setUnlockLoading(false)
    if (!res.ok) { setUnlockError(data.error); return }
    setEstimate({ cost: data.cost })
  }

  async function confirmUnlock() {
    setUnlockLoading(true)
    setUnlockError(null)
    const res = await fetch('/api/companies/unlock-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: pairsPayload() }),
    })
    const data = await res.json()
    setUnlockLoading(false)
    if (!res.ok) { setUnlockError(data.error); return }
    setSelectedPairs(new Set())
    setEstimate(null)
    router.refresh()
  }

  const STAT_CARDS: { key: CrmStatus; color: string }[] = [
    { key: 'to_call', color: 'text-blue-600' },
    { key: 'callback', color: 'text-orange-600' },
    { key: 'interested', color: 'text-emerald-600' },
    { key: 'converted', color: 'text-brand-600' },
  ]

  return (
    <div className="pb-24">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STAT_CARDS.map(s => (
          <div key={s.key} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{counts[s.key] ?? 0}</div>
            <div className="text-[11.5px] text-gray-400 mt-0.5">{CRM_STATUS_LABELS[s.key]}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-2xl border border-gray-100 p-2 mb-3">
        <button onClick={() => { setStatusTab('all'); setPage(1) }}
          className={cn('px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors',
            statusTab === 'all' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50')}>
          Tous <span className="text-gray-400 font-normal">{counts.all}</span>
        </button>
        {CRM_STATUSES.map(s => (
          <button key={s} onClick={() => { setStatusTab(s); setPage(1) }}
            className={cn('px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors',
              statusTab === s ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50')}>
            {CRM_STATUS_LABELS[s]} <span className="text-gray-400 font-normal">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher par nom, ville, secteur..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
            <option value="">Toutes les villes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
            <option value="">Tous les secteurs</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
            <option value="">Toutes priorités</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
          {!!sources.length && (
            <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
              <option value="">Toutes les sélections</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      <p className="text-[12px] text-gray-400 mb-2">{filtered.length.toLocaleString('fr-FR')} leads · page {page}/{totalPages}</p>

      {/* Rows */}
      <div className="space-y-2">
        {pageRows.map(lead => {
          const c = lead.company
          if (!c) return null
          const initials = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
          const unlockedSet = new Set(lead.unlockedFields)
          const lockedFields = ALL_METERED_FIELDS.filter(f => !unlockedSet.has(f))
          return (
            <div key={lead.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[12px] font-bold shrink-0">{initials}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-[14px] text-gray-900 truncate">{c.name}</div>
                    <div className="text-[11.5px] text-gray-400 truncate flex items-center gap-1 flex-wrap">
                      {c.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</span>}
                      {c.sector && <span>· {c.sector}</span>}
                      <span>· {relativeDays(lead.created_at)}</span>
                      {lead.sourceQueryName && (
                        <span className="text-[10.5px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">via {lead.sourceQueryName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setOpenStatusMenu(openStatusMenu === lead.id ? null : lead.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-[11.5px] font-semibold text-gray-600 hover:bg-gray-100">
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[lead.status])} />
                    {CRM_STATUS_LABELS[lead.status]}
                  </button>
                  {openStatusMenu === lead.id && (
                    <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
                      {CRM_STATUSES.map(s => (
                        <button key={s} onClick={() => changeStatus(lead.id, s)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 text-left">
                          <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[s])} />{CRM_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
                {lead.unlockedFields.filter(f => f !== 'basic').map(f => {
                  const d = FIELD_DISPLAY[f]
                  if (!d) return null
                  const Icon = d.icon
                  return (
                    <div key={f} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                      <Icon className="w-3 h-3 text-gray-300 shrink-0" />
                      <span className="font-medium">{d.render(c)}</span>
                    </div>
                  )
                })}
                {lockedFields.map(f => {
                  const key = pairKey(c.id, f)
                  const isSelected = selectedPairs.has(key)
                  return (
                    <button key={f} onClick={() => toggleLockedField(c.id, f)}
                      className={cn('flex items-center gap-1.5 text-[12px] px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors text-left',
                        isSelected ? 'bg-brand-50 text-brand-700' : 'text-gray-300 hover:bg-gray-50')}>
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>{FIELD_GROUPS[f].label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                {c.phone_1 && (
                  <a href={`tel:${c.phone_1.replace(/\s/g, '')}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 text-white rounded-lg text-[12px] font-semibold hover:bg-brand-700 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> Appeler
                  </a>
                )}
                <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                  {new Set(['basic', ...lead.unlockedFields]).size}/{TOTAL_FIELDS} champs
                </span>
              </div>
            </div>
          )
        })}
        {!pageRows.length && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-[13px] text-gray-400">
            Aucun lead ne correspond à ces filtres.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-white disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-[13px] text-gray-400">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-white disabled:opacity-30">
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedPairs.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-semibold text-gray-700">{selectedPairs.size} champ(s) sélectionné(s)</span>
            {unlockError && <span className="text-[12.5px] text-red-600">{unlockError}</span>}
            {estimate ? (
              <>
                <span className="text-[13px] font-bold text-brand-700 ml-auto">{estimate.cost.toLocaleString('fr-FR')} cr</span>
                <button onClick={confirmUnlock} disabled={unlockLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-[12.5px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50">
                  {unlockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Confirmer et débloquer
                </button>
              </>
            ) : (
              <button onClick={fetchEstimate} disabled={unlockLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-[12.5px] font-semibold hover:bg-gray-800 transition-colors ml-auto disabled:opacity-50">
                {unlockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Voir le coût
              </button>
            )}
            <button onClick={() => { setSelectedPairs(new Set()); setEstimate(null); setUnlockError(null) }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
