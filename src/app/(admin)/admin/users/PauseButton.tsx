'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PauseButton({ userId, paused }: { userId: string; paused: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await fetch(`/api/admin/users/${userId}/pause`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: !paused }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className={cn('flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors shrink-0',
        paused ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
      {paused ? 'Réactiver' : 'Suspendre'}
    </button>
  )
}
