'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Minus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GrantCreditsForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<'add' | 'remove'>('add')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amount), direction }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setDone(true)
    setAmount('')
    router.refresh()
    setTimeout(() => { setDone(false); setOpen(false) }, 1200)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 shrink-0">
        <Plus className="w-3.5 h-3.5" /> Crédits
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 shrink-0">
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        <button type="button" onClick={() => setDirection('add')}
          className={cn('px-1.5 py-1', direction === 'add' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400')}>
          <Plus className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => setDirection('remove')}
          className={cn('px-1.5 py-1', direction === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-400')}>
          <Minus className="w-3 h-3" />
        </button>
      </div>
      <input type="number" min={1} required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant"
        className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
      <button type="submit" disabled={loading}
        className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
      {error && <span className="text-[10.5px] text-red-600">{error}</span>}
    </form>
  )
}
