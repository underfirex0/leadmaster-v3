'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'pending', label: 'En attente' }, { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' }, { value: 'rejected', label: 'Refusé' },
]

export function UploadStatusSelect({ id, current }: { id: string; current: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleChange(status: string) {
    setLoading(true)
    await fetch(`/api/admin/uploads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <select defaultValue={current} disabled={loading} onChange={e => handleChange(e.target.value)}
      className="text-[12px] font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500">
      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  )
}
