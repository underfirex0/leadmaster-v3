'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const FEATURES = [
  { key: 'search', label: 'Recherche' }, { key: 'crm', label: 'CRM' },
  { key: 'data_upload', label: 'Demandes données' }, { key: 'export', label: 'Export' },
]

export function FeatureToggles({ userId, access }: { userId: string; access: Record<string, boolean> }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(feature: string, current: boolean) {
    setPending(feature)
    await fetch(`/api/admin/users/${userId}/feature-access`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature, enabled: !current }),
    })
    setPending(null)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {FEATURES.map(f => {
        const enabled = access[f.key] !== false
        return (
          <button key={f.key} onClick={() => toggle(f.key, enabled)} disabled={pending === f.key}
            className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors',
              enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500')}>
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
