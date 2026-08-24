'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function ReferralForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/referral', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setEmail('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com"
        className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
      <button type="submit" disabled={loading}
        className="px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-[13px] hover:bg-brand-700 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inviter'}
      </button>
      {error && <p className="text-[12px] text-red-600 absolute mt-11">{error}</p>}
    </form>
  )
}
