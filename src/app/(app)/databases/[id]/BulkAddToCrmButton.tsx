'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UsersRound, Check, Loader2, AlertCircle, ChevronDown } from 'lucide-react'

export function BulkAddToCrmButton({ queryId, count }: { queryId: string; count: number }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customCount, setCustomCount] = useState('')
  const [lastAdded, setLastAdded] = useState<number | null>(null)

  async function send(partialCount?: number) {
    setState('loading')
    setError(null)
    setPickerOpen(false)
    try {
      const res = await fetch('/api/crm/leads/from-query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, count: partialCount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('idle')
        setError(data.error || 'Une erreur est survenue — réessayez.')
        return
      }
      setLastAdded(data.added)
      // Only show the final "done" state once everything's been sent —
      // a partial send should let you send more afterward, not disappear.
      if (!data.remaining) setState('done')
      else setState('idle')
      router.refresh()
    } catch {
      setState('idle')
      setError('Erreur réseau — vérifiez votre connexion et réessayez.')
    }
  }

  if (state === 'done') {
    return <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-600"><Check className="w-4 h-4" /> Ajouté au CRM</span>
  }

  return (
    <div className="relative">
      <div className="flex items-stretch">
        <button onClick={() => send()} disabled={state === 'loading'}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-l-xl bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
          {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UsersRound className="w-4 h-4" />}
          Ajouter les {count.toLocaleString('fr-FR')} entreprises restantes au CRM
        </button>
        <button onClick={() => setPickerOpen(o => !o)} disabled={state === 'loading'}
          className="flex items-center px-2 rounded-r-xl bg-gray-800 text-white hover:bg-gray-700 transition-colors border-l border-gray-700 disabled:opacity-50">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {pickerOpen && (
        <div className="absolute z-10 top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64">
          <p className="text-[11.5px] font-semibold text-gray-500 mb-2">Envoyer seulement une partie — les entreprises avec le plus de données sont envoyées en premier.</p>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={count} value={customCount} onChange={e => setCustomCount(e.target.value)}
              placeholder={`1 à ${count}`}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[13px] font-medium focus:outline-none focus:border-brand-400" />
            <button
              onClick={() => { const n = parseInt(customCount, 10); if (n > 0) send(Math.min(n, count)) }}
              disabled={!customCount || parseInt(customCount, 10) <= 0}
              className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700 disabled:opacity-40 transition-colors shrink-0">
              Envoyer
            </button>
          </div>
        </div>
      )}

      {lastAdded !== null && (
        <p className="text-[12px] text-emerald-600 font-medium mt-2">{lastAdded} entreprise{lastAdded > 1 ? 's' : ''} ajoutée{lastAdded > 1 ? 's' : ''} au CRM.</p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-600 mt-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
