'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, Copy, Check } from 'lucide-react'
import { PLANS } from '@/lib/constants'

export function CreateClientForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [startingCredits, setStartingCredits] = useState('100')
  const [planId, setPlanId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, startingCredits: Number(startingCredits), planId: planId || undefined }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setCreated({ email: data.email, password: data.password })
    setEmail(''); setFullName(''); setStartingCredits('100'); setPlanId('')
    router.refresh()
  }

  function copyCredentials() {
    if (!created) return
    navigator.clipboard.writeText(`Email: ${created.email}\nMot de passe: ${created.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-[13px] font-semibold hover:bg-gray-800 transition-colors">
        <UserPlus className="w-4 h-4" /> Créer un client
      </button>
    )
  }

  if (created) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4">
        <p className="text-[12.5px] font-semibold text-amber-800 mb-2">Compte créé — partagez ces identifiants une seule fois :</p>
        <div className="bg-white rounded-lg p-3 font-mono text-[12px] text-gray-700 mb-3">
          {created.email}<br />{created.password}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyCredentials} className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 hover:text-amber-800">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copié' : 'Copier'}
          </button>
          <button onClick={() => { setCreated(null); setOpen(false) }} className="text-[12px] text-gray-400 hover:text-gray-600">Fermer</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nom complet"
          className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com"
          className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="number" min={0} value={startingCredits} onChange={e => setStartingCredits(e.target.value)} placeholder="Crédits"
          className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={planId} onChange={e => setPlanId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-600 focus:outline-none">
          <option value="">Pay-as-you-go (sans plan)</option>
          {Object.values(PLANS).map(p => (
            <option key={p.id} value={p.id}>{p.name}{p.maxSeats > 1 ? ` — ${p.maxSeats} sièges` : ''}</option>
          ))}
        </select>
      </div>
      <p className="text-[11.5px] text-gray-400">Un plan avec plusieurs sièges (Équipe, Business) permet au client de créer ses propres employés.</p>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-gray-400 hover:text-gray-600">Annuler</button>
      </div>
    </form>
  )
}
