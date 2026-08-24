'use client'
import { useState } from 'react'
import { UserPlus, Check, Loader2 } from 'lucide-react'

export function AddToCrmButton({ companyId }: { companyId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleClick() {
    setState('loading')
    const res = await fetch('/api/crm/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId }),
    })
    setState(res.ok ? 'done' : 'idle')
  }

  if (state === 'done') {
    return <span className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><Check className="w-3.5 h-3.5" /> Ajouté au CRM</span>
  }
  return (
    <button onClick={handleClick} disabled={state === 'loading'}
      className="flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50">
      {state === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Ajouter au CRM
    </button>
  )
}
