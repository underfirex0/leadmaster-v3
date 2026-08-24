'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function PackButton({ packId }: { packId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/wallet/purchase-pack', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className="w-full py-2 bg-brand-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Acheter
    </button>
  )
}

export function PlanButton({ planId, disabled }: { planId: string; disabled?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/wallet/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <button onClick={handleClick} disabled={loading || disabled}
      className="w-full py-2 bg-gray-900 text-white rounded-lg text-[12.5px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {disabled ? 'Nous contacter' : "S'abonner"}
    </button>
  )
}
