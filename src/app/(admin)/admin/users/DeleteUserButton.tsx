'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteUserButton({ userId, label }: { userId: string; label: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirm(`Supprimer définitivement le compte de ${label} ? Cette action est irréversible.`)) return
    setLoading(true)
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <button onClick={handleClick} disabled={loading} className="text-gray-300 hover:text-red-500 disabled:opacity-50 shrink-0">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
