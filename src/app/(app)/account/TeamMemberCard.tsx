'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const FEATURES = [
  { key: 'search', label: 'Recherche' },
  { key: 'unlock', label: 'Débloquer (dépenser)' },
  { key: 'crm', label: 'CRM' },
  { key: 'data_upload', label: 'Import' },
]

export function TeamMemberCard({
  member,
}: { member: { id: string; full_name: string | null; email: string; credit_balance: number; access: Record<string, boolean> } }) {
  const router = useRouter()
  const [pendingFeature, setPendingFeature] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  async function toggleFeature(feature: string, current: boolean) {
    setPendingFeature(feature)
    await fetch(`/api/team/members/${member.id}/access`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, enabled: !current }),
    })
    setPendingFeature(null)
    router.refresh()
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setTransferLoading(true)
    setTransferError(null)
    const res = await fetch(`/api/team/members/${member.id}/transfer-credits`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(transferAmount) }),
    })
    const data = await res.json()
    setTransferLoading(false)
    if (!res.ok) { setTransferError(data.error); return }
    setTransferAmount('')
    setTransferOpen(false)
    router.refresh()
  }

  async function handleRemove() {
    if (!confirm(`Retirer ${member.full_name ?? member.email} de l'équipe ?`)) return
    setRemoving(true)
    await fetch(`/api/team/members/${member.id}`, { method: 'DELETE' })
    setRemoving(false)
    router.refresh()
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-[13.5px] text-gray-800">{member.full_name || member.email}</div>
          <div className="text-[11.5px] text-gray-400">{member.email} · {member.credit_balance.toLocaleString('fr-FR')} cr</div>
        </div>
        <button onClick={handleRemove} disabled={removing} className="text-gray-300 hover:text-red-500 disabled:opacity-50">
          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {FEATURES.map(f => {
          const enabled = member.access[f.key] !== false
          return (
            <button key={f.key} onClick={() => toggleFeature(f.key, enabled)} disabled={pendingFeature === f.key}
              className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1',
                enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500')}>
              {pendingFeature === f.key ? <Loader2 className="w-3 h-3 animate-spin" /> : enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {f.label}
            </button>
          )
        })}
      </div>

      {transferOpen ? (
        <form onSubmit={handleTransfer} className="flex items-center gap-1.5">
          <input type="number" min={1} required autoFocus value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
            placeholder="Montant" className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="submit" disabled={transferLoading}
            className="px-2.5 py-1.5 bg-brand-600 text-white rounded-lg text-[11.5px] font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1">
            {transferLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Envoyer
          </button>
          <button type="button" onClick={() => setTransferOpen(false)} className="text-[11.5px] text-gray-400">Annuler</button>
          {transferError && <span className="text-[11px] text-red-600">{transferError}</span>}
        </form>
      ) : (
        <button onClick={() => setTransferOpen(true)} className="text-[11.5px] font-semibold text-brand-600 hover:text-brand-700">
          Transférer des crédits →
        </button>
      )}
    </div>
  )
}
