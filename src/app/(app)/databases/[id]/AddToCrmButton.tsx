'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Check, Loader2, AlertCircle } from 'lucide-react'

export function AddToCrmButton({ companyId, sourceQueryId }: { companyId: string; sourceQueryId?: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, sourceQueryId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('idle')
        setError(data.error || 'Erreur — réessayez.')
        return
      }
      setState('done')
      router.refresh()
    } catch {
      setState('idle')
      setError('Erreur réseau.')
    }
  }

  if (state === 'done') {
    return <span className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><Check className="w-3.5 h-3.5" /> Ajouté au CRM</span>
  }
  return (
    <div className="flex flex-col items-start">
      <button onClick={handleClick} disabled={state === 'loading'}
        className="flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">
        {state === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Ajouter au CRM
      </button>
      {error && (
        <p className="flex items-center gap-1 text-[10.5px] text-red-600 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
