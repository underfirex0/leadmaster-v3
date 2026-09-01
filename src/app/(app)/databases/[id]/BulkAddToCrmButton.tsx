'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UsersRound, Check, Loader2, AlertCircle } from 'lucide-react'

export function BulkAddToCrmButton({ queryId, count }: { queryId: string; count: number }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/crm/leads/from-query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('idle')
        setError(data.error || 'Une erreur est survenue — réessayez.')
        return
      }
      setState('done')
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
    <div>
      <button onClick={handleClick} disabled={state === 'loading'}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
        {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UsersRound className="w-4 h-4" />}
        Ajouter les {count.toLocaleString('fr-FR')} entreprises restantes au CRM
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] text-red-600 mt-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
