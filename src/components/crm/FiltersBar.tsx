'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { CRM_STATUSES, CRM_STATUS_LABELS } from '@/lib/constants'

export function FiltersBar({
  statusCounts, cities, sectors,
}: { statusCounts: Record<string, number>; cities: string[]; sectors: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const status = searchParams.get('status') ?? ''
  const city = searchParams.get('city') ?? ''
  const sector = searchParams.get('sector') ?? ''
  const q = searchParams.get('q') ?? ''

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-2xl border border-gray-100 p-2 mb-3">
        <button onClick={() => setParam('status', '')}
          className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${!status ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}>
          Tous <span className="text-gray-400 font-normal">{statusCounts.all ?? 0}</span>
        </button>
        {CRM_STATUSES.map(s => (
          <button key={s} onClick={() => setParam('status', s)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${status === s ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            {CRM_STATUS_LABELS[s]} <span className="text-gray-400 font-normal">{statusCounts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input defaultValue={q} onKeyDown={e => { if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value) }}
            onBlur={e => setParam('q', e.target.value)}
            placeholder="Rechercher par nom, ville, secteur..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={city} onChange={e => setParam('city', e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
            <option value="">Toutes les villes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sector} onChange={e => setParam('sector', e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
            <option value="">Tous les secteurs</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
