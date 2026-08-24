'use client'
import { useState } from 'react'
import { Phone, MapPin, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CRM_STATUSES, CRM_STATUS_LABELS, type CrmStatus } from '@/lib/constants'

interface Lead {
  id: string
  status: CrmStatus
  priority: string | null
  notes: string | null
  callback_date: string | null
  company: { id: string; name: string; city: string | null; phone_1: string | null } | null
}

const STATUS_COLORS: Record<CrmStatus, string> = {
  to_call: 'border-t-gray-300', in_progress: 'border-t-blue-300', callback: 'border-t-amber-300',
  interested: 'border-t-emerald-300', not_interested: 'border-t-red-300',
  converted: 'border-t-brand-400', archived: 'border-t-gray-200',
}

export function CrmBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [dragId, setDragId] = useState<string | null>(null)

  async function moveLead(id: string, status: CrmStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    await fetch(`/api/crm/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CRM_STATUSES.map(status => {
        const columnLeads = leads.filter(l => l.status === status)
        return (
          <div key={status}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragId) moveLead(dragId, status); setDragId(null) }}
            className={cn('bg-white rounded-2xl border border-gray-100 border-t-4 p-3 min-h-[200px]', STATUS_COLORS[status])}>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[12.5px] font-bold text-gray-700">{CRM_STATUS_LABELS[status]}</span>
              <span className="text-[11px] text-gray-400">{columnLeads.length}</span>
            </div>
            <div className="space-y-2">
              {columnLeads.map(lead => (
                <div key={lead.id} draggable onDragStart={() => setDragId(lead.id)}
                  className="bg-gray-50 rounded-xl p-3 cursor-move hover:bg-gray-100 transition-colors">
                  <div className="font-semibold text-[13px] text-gray-800">{lead.company?.name ?? 'Entreprise'}</div>
                  {lead.company?.city && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1"><MapPin className="w-3 h-3" />{lead.company.city}</div>
                  )}
                  {lead.company?.phone_1 && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5"><Phone className="w-3 h-3" />{lead.company.phone_1}</div>
                  )}
                  {lead.callback_date && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-1 font-medium">
                      <Calendar className="w-3 h-3" />{new Date(lead.callback_date).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
