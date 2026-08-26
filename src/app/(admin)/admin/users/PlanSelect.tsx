'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLANS } from '@/lib/constants'

export function PlanSelect({ userId, current }: { userId: string; current: string | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleChange(planId: string) {
    setLoading(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: planId || null }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <select defaultValue={current ?? ''} disabled={loading} onChange={e => handleChange(e.target.value)}
      className="text-[11px] font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500">
      <option value="">Pay-as-you-go</option>
      {Object.values(PLANS).map(p => (
        <option key={p.id} value={p.id}>{p.name}{p.maxSeats > 1 ? ` (${p.maxSeats} sièges)` : ''}</option>
      ))}
    </select>
  )
}
