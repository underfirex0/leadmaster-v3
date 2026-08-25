'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function BillingToggle({ children }: { children: (annual: boolean) => React.ReactNode }) {
  const [annual, setAnnual] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mx-auto mb-8">
        <button onClick={() => setAnnual(false)}
          className={cn('px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors', !annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
          Mensuel
        </button>
        <button onClick={() => setAnnual(true)}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors', annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
          Annuel <span className="text-emerald-600 text-[11px] font-bold">-20%</span>
        </button>
      </div>
      {children(annual)}
    </div>
  )
}
