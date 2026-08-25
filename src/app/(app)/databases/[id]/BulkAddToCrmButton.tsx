'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UsersRound, Check, Loader2 } from 'lucide-react'

export function BulkAddToCrmButton({ queryId, count }: { queryId: string; count: number }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleClick() {
    setState('loading')
    const res = await fetch('/api/crm/leads/from-query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queryId }),
    })
    setState(res.ok ? 'done' : 'idle')
    if (res.ok) router.refresh()
  }

  if (state === 'done') {
    return <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-600"><Check className="w-4 h-4" /> Ajouté au CRM</span>
  }
  return (
    <button onClick={handleClick} disabled={state === 'loading'}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
      {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UsersRound className="w-4 h-4" />}
      Ajouter les {count.toLocaleString('fr-FR')} entreprises au CRM
    </button>
  )
}
