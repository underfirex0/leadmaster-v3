'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Globe, ShieldCheck, UserRound, Calendar, Banknote, MapPin, Lock, Loader2, Unlock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'
import { AddToCrmButton } from './AddToCrmButton'

type Company = Record<string, unknown> & { id: string; name: string; city: string | null; activite: string; forme_juridique: string | null }

const FIELD_DISPLAY: Partial<Record<FieldGroupId, { icon: React.ElementType; render: (c: Company) => string }>> = {
  phone: { icon: Phone, render: c => [c.phone_1, c.phone_2].filter(Boolean).join(' · ') || '—' },
  website: { icon: Globe, render: c => (c.website as string) || '—' },
  ice: { icon: ShieldCheck, render: c => [c.ice, c.rc].filter(Boolean).join(' · ') || '—' },
  director: { icon: UserRound, render: c => (c.director as string) || '—' },
  annee_creation: { icon: Calendar, render: c => (c.annee_creation as number)?.toString() || '—' },
  effectif: { icon: UserRound, render: c => (c.effectif_tranche as string) || '—' },
  capital: { icon: Banknote, render: c => c.capital_mad ? `${Number(c.capital_mad).toLocaleString('fr-FR')} MAD` : '—' },
  address: { icon: MapPin, render: c => (c.address_raw as string) || '—' },
}

const ALL_METERED_FIELDS = (Object.keys(FIELD_GROUPS) as FieldGroupId[]).filter(f => f !== 'basic')

export function ResultsList({ queryId, companies, unlockedFields }: { queryId: string; companies: Company[]; unlockedFields: FieldGroupId[] }) {
  const router = useRouter()
  const unlockedSet = new Set(unlockedFields)
  const lockedFields = ALL_METERED_FIELDS.filter(f => !unlockedSet.has(f))

  const [selected, setSelected] = useState<Set<FieldGroupId>>(new Set())
  const [estimate, setEstimate] = useState<{ cost: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleLocked(f: FieldGroupId) {
    setEstimate(null)
    setError(null)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f); else next.add(f)
      return next
    })
  }

  async function fetchEstimate() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/search/unlock-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId, newFields: [...selected], estimateOnly: true }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setEstimate({ cost: data.cost })
  }

  async function confirmUnlock() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/search/unlock-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId, newFields: [...selected] }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSelected(new Set())
    setEstimate(null)
    router.refresh()
  }

  return (
    <div className="pb-24">
      <div className="space-y-3">
        {companies.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-bold text-[14.5px] text-gray-900">{c.name}</div>
                <div className="text-[12px] text-gray-400">{c.city || 'Ville inconnue'} · {c.activite}</div>
              </div>
              {c.forme_juridique && <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg shrink-0">{c.forme_juridique}</span>}
            </div>
            <div className="flex justify-end mb-1"><AddToCrmButton companyId={c.id} sourceQueryId={queryId} /></div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
              {unlockedFields.map(f => {
                const d = FIELD_DISPLAY[f]
                if (!d) return null
                const Icon = d.icon
                return (
                  <div key={f} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                    <Icon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="text-gray-400">{FIELD_GROUPS[f].label}:</span>
                    <span className="font-medium">{d.render(c)}</span>
                  </div>
                )
              })}
              {lockedFields.map(f => (
                <button key={f} onClick={() => toggleLocked(f)}
                  className={cn('flex items-center gap-2 text-[12.5px] px-2 py-1 -mx-2 rounded-lg transition-colors text-left',
                    selected.has(f) ? 'bg-brand-50 text-brand-700' : 'text-gray-300 hover:bg-gray-50')}>
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{FIELD_GROUPS[f].label}:</span>
                  <span className="italic">{selected.has(f) ? 'sélectionné pour déblocage' : 'verrouillé'}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-semibold text-gray-700">
              {selected.size} champ{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''} pour les {companies.length}+ entreprises de cette sélection
            </span>
            {error && <span className="text-[12.5px] text-red-600">{error}</span>}
            {estimate ? (
              <>
                <span className="text-[13px] font-bold text-brand-700 ml-auto">{estimate.cost.toLocaleString('fr-FR')} cr</span>
                <button onClick={confirmUnlock} disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-[12.5px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Confirmer et débloquer
                </button>
              </>
            ) : (
              <button onClick={fetchEstimate} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-[12.5px] font-semibold hover:bg-gray-800 transition-colors ml-auto disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Voir le coût
              </button>
            )}
            <button onClick={() => { setSelected(new Set()); setEstimate(null); setError(null) }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
