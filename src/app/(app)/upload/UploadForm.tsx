'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function UploadForm() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setDescription('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={4}
        placeholder="Ex: Liste des cliniques dentaires à Casablanca et Rabat avec effectif > 10..."
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
      <button type="submit" disabled={loading}
        className="px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-[13px] hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Envoyer la demande
      </button>
    </form>
  )
}
