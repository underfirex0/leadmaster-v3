'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

export function RefundActions({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    await fetch(`/api/admin/refunds/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => handle('approve')} disabled={!!loading}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50">
        {loading === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approuver
      </button>
      <button onClick={() => handle('reject')} disabled={!!loading}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[12.5px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
        {loading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Rejeter
      </button>
    </div>
  )
}
