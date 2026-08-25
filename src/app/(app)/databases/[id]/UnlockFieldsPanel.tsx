'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, Unlock } from 'lucide-react'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

export function UnlockFieldsPanel({ queryId, lockedFields }: { queryId: string; lockedFields: FieldGroupId[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<FieldGroupId>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  if (!lockedFields.length) return null

  function toggle(id: FieldGroupId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleUnlock() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/search/unlock-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId, newFields: [...selected] }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:border-gray-300 transition-colors">
        <Lock className="w-3.5 h-3.5" /> Débloquer d&apos;autres champs pour cette sélection
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-[14px] text-gray-900 mb-1">Débloquer d&apos;autres champs</h3>
      <p className="text-[12px] text-gray-400 mb-4">Le coût est calculé sur les {lockedFields.length ? 'entreprises réelles' : ''} de cette sélection uniquement.</p>
      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        {lockedFields.map(f => (
          <label key={f} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer">
            <input type="checkbox" checked={selected.has(f)} onChange={() => toggle(f)} className="w-4 h-4 rounded accent-brand-600" />
            <span className="text-[12.5px] font-medium text-gray-700">{FIELD_GROUPS[f].label}</span>
            <span className="text-[10.5px] text-gray-400 ml-auto">{FIELD_GROUPS[f].cost} cr/entreprise</span>
          </label>
        ))}
      </div>
      {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={handleUnlock} disabled={loading || !selected.size}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-[12.5px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Débloquer
        </button>
        <button onClick={() => setOpen(false)} className="text-[12px] text-gray-400 hover:text-gray-600">Annuler</button>
      </div>
    </div>
  )
}
