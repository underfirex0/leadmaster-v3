'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, Shuffle, Loader2, X } from 'lucide-react'
import { CompanyRow, type RowCompany, type AssigneeOption } from './CompanyRow'
import type { CrmStatus, FieldGroupId } from '@/lib/constants'

export interface CrmLeadItem {
  leadId: string; status: CrmStatus; company: RowCompany; unlockedFields: FieldGroupId[]
  sourceQueryName: string | null; callbackDate: string | null; assignedTo: string | null
}

export function CrmLeadsClient({
  items, assigneeOptions, canAssign, unassignedCount,
}: { items: CrmLeadItem[]; assigneeOptions: AssigneeOption[]; canAssign: boolean; unassignedCount: number }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [manualAssignee, setManualAssignee] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [smartCount, setSmartCount] = useState('')
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartResult, setSmartResult] = useState<string | null>(null)

  // Selection is keyed by company_id (what CompanyRow reports), mapped
  // back to lead ids for the actual assignment call.
  const companyToLead = new Map(items.map(i => [i.company.id, i.leadId]))

  function toggleSelect(companyId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(companyId)) next.delete(companyId); else next.add(companyId)
      return next
    })
  }

  async function assignManual() {
    if (!manualAssignee) return
    setLoading(true)
    setError(null)
    const leadIds = [...selected].map(cid => companyToLead.get(cid)).filter(Boolean)
    const res = await fetch('/api/crm/leads/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, assigneeId: manualAssignee }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSelected(new Set())
    router.refresh()
  }

  async function assignRoundRobin() {
    setLoading(true)
    setError(null)
    const leadIds = [...selected].map(cid => companyToLead.get(cid)).filter(Boolean)
    const res = await fetch('/api/crm/leads/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, roundRobinAssigneeIds: assigneeOptions.map(a => a.id) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSelected(new Set())
    router.refresh()
  }

  async function assignSmartBatch() {
    const n = parseInt(smartCount, 10)
    if (!n || n <= 0) return
    setSmartLoading(true)
    setSmartResult(null)
    const res = await fetch('/api/crm/leads/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: n, roundRobinAssigneeIds: assigneeOptions.map(a => a.id) }),
    })
    const data = await res.json()
    setSmartLoading(false)
    if (!res.ok) { setSmartResult(data.error); return }
    setSmartResult(`${data.assigned} lead(s) assigné(s) et répartis.`)
    setSmartCount('')
    router.refresh()
  }

  return (
    <div className="pb-20">
      {canAssign && assigneeOptions.length > 1 && unassignedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 mb-4">
          <Shuffle className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="text-[12.5px] text-brand-800 font-medium">
            {unassignedCount} lead{unassignedCount > 1 ? 's' : ''} non assigné{unassignedCount > 1 ? 's' : ''} —
          </span>
          <input type="number" min={1} max={unassignedCount} value={smartCount} onChange={e => setSmartCount(e.target.value)}
            placeholder="nombre"
            className="w-20 px-2 py-1.5 rounded-lg border border-brand-200 text-[12.5px] font-semibold text-gray-700 focus:outline-none focus:border-brand-400" />
          <button onClick={assignSmartBatch} disabled={smartLoading || !smartCount}
            className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5">
            {smartLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Répartir automatiquement
          </button>
          {smartResult && <span className="text-[12px] text-brand-700 font-medium">{smartResult}</span>}
        </div>
      )}
      <div className="space-y-2">
        {items.map(item => (
          <CompanyRow
            key={item.leadId} mode="manage" leadId={item.leadId} status={item.status}
            company={item.company} unlockedFields={item.unlockedFields}
            sourceQueryName={item.sourceQueryName} callbackDate={item.callbackDate}
            assignedTo={item.assignedTo} assigneeOptions={assigneeOptions} canAssign={canAssign}
            selectable={canAssign} selected={selected.has(item.company.id)} onToggleSelect={toggleSelect}
          />
        ))}
      </div>

      {canAssign && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-700 flex items-center gap-1.5">
              <Users2 className="w-4 h-4 text-brand-500" /> {selected.size} lead(s) sélectionné(s)
            </span>
            {error && <span className="text-[12px] text-red-600">{error}</span>}
            <div className="flex items-center gap-2 ml-auto">
              <select value={manualAssignee} onChange={e => setManualAssignee(e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 focus:outline-none">
                <option value="">Assigner à...</option>
                {assigneeOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={assignManual} disabled={loading || !manualAssignee}
                className="px-3.5 py-2 bg-brand-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Assigner
              </button>
              {assigneeOptions.length > 1 && (
                <button onClick={assignRoundRobin} disabled={loading}
                  className="px-3.5 py-2 bg-gray-900 text-white rounded-lg text-[12.5px] font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                  <Shuffle className="w-4 h-4" /> Répartir automatiquement
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
