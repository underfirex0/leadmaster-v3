'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Globe, ShieldCheck, UserRound, Calendar, Banknote, MapPin, Lock, Loader2, CheckCircle2, Check, X, UserCog2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CRM_STATUSES, CRM_STATUS_LABELS, CRM_STATUSES_NEEDING_DATE, type CrmStatus, FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

export interface RowCompany {
  id: string; name: string; city: string | null; sector: string | null; activite?: string
  phone_1: string | null; phone_2: string | null; website: string | null
  ice: string | null; rc: string | null; director: string | null
  annee_creation: number | null; effectif_tranche: string | null
  capital_mad: number | null; address_raw: string | null
}

export interface AssigneeOption { id: string; name: string }

const FIELD_DISPLAY: Partial<Record<FieldGroupId, { icon: React.ElementType; render: (c: RowCompany) => string; hasData: (c: RowCompany) => boolean }>> = {
  phone: { icon: Phone, render: c => [c.phone_1, c.phone_2].filter(Boolean).join(' · ') || '—', hasData: c => !!(c.phone_1 || c.phone_2) },
  website: { icon: Globe, render: c => c.website || '—', hasData: c => !!c.website },
  ice: { icon: ShieldCheck, render: c => [c.ice, c.rc].filter(Boolean).join(' · ') || '—', hasData: c => !!(c.ice || c.rc) },
  director: { icon: UserRound, render: c => c.director || '—', hasData: c => !!c.director },
  annee_creation: { icon: Calendar, render: c => c.annee_creation?.toString() || '—', hasData: c => c.annee_creation != null },
  effectif: { icon: UserRound, render: c => c.effectif_tranche || '—', hasData: c => !!c.effectif_tranche },
  capital: { icon: Banknote, render: c => c.capital_mad ? `${Number(c.capital_mad).toLocaleString('fr-FR')} MAD` : '—', hasData: c => c.capital_mad != null },
  address: { icon: MapPin, render: c => c.address_raw || '—', hasData: c => !!c.address_raw },
}

const ALL_METERED_FIELDS = (Object.keys(FIELD_GROUPS) as FieldGroupId[]).filter(f => f !== 'basic')
const TOTAL_FIELDS = Object.keys(FIELD_GROUPS).length
const STATUS_DOT: Record<CrmStatus, string> = {
  to_call: 'bg-blue-500', in_progress: 'bg-purple-500', callback: 'bg-orange-500', appointment: 'bg-teal-500',
  interested: 'bg-emerald-500', not_interested: 'bg-red-500',
  converted: 'bg-brand-600', archived: 'bg-gray-400',
}

export function CompanyRow({
  leadId, status, company, unlockedFields, sourceQueryId, sourceQueryName, mode = 'manage', onAdded,
  callbackDate, assignedTo, assigneeOptions, canAssign,
  selectable, selected, onToggleSelect,
}: {
  leadId?: string; status?: CrmStatus; company: RowCompany; unlockedFields: FieldGroupId[]
  sourceQueryId?: string; sourceQueryName?: string | null; mode?: 'browse' | 'manage'; onAdded?: () => void
  callbackDate?: string | null; assignedTo?: string | null; assigneeOptions?: AssigneeOption[]; canAssign?: boolean
  selectable?: boolean; selected?: boolean; onToggleSelect?: (companyId: string) => void
}) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status ?? 'to_call')
  const [menuOpen, setMenuOpen] = useState(false)
  const [assignMenuOpen, setAssignMenuOpen] = useState(false)
  const [pendingDateStatus, setPendingDateStatus] = useState<CrmStatus | null>(null)
  const [dateValue, setDateValue] = useState('')
  const [unlockingField, setUnlockingField] = useState<FieldGroupId | null>(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(!!leadId)
  const [currentAssignee, setCurrentAssignee] = useState(assignedTo ?? null)
  const [assigning, setAssigning] = useState(false)

  const unlockedSet = new Set(unlockedFields)
  const lockedFields = ALL_METERED_FIELDS.filter(f => !unlockedSet.has(f))

  async function changeStatus(s: CrmStatus, withDate?: string) {
    if (CRM_STATUSES_NEEDING_DATE.includes(s) && !withDate) {
      setPendingDateStatus(s)
      setMenuOpen(false)
      return
    }
    setCurrentStatus(s)
    setMenuOpen(false)
    setPendingDateStatus(null)
    setDateValue('')
    await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s, callbackDate: withDate ?? null }),
    })
    router.refresh()
  }

  async function addToCrm() {
    setAdding(true)
    const res = await fetch('/api/crm/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: company.id, sourceQueryId }),
    })
    setAdding(false)
    if (res.ok) {
      setAdded(true)
      onAdded?.()
      router.refresh()
    }
  }

  async function unlockOne(field: FieldGroupId) {
    setUnlockingField(field)
    await fetch('/api/companies/unlock-fields', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: [{ companyId: company.id, field }] }),
    })
    setUnlockingField(null)
    router.refresh()
  }

  async function assignTo(userId: string | null) {
    setAssigning(true)
    setCurrentAssignee(userId)
    setAssignMenuOpen(false)
    await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedTo: userId }),
    })
    setAssigning(false)
    router.refresh()
  }

  const initials = company.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const assigneeName = assigneeOptions?.find(a => a.id === currentAssignee)?.name

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {selectable && (
            <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect?.(company.id)}
              className="w-4 h-4 rounded accent-brand-600 shrink-0" />
          )}
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[12px] font-bold shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="font-bold text-[14px] text-gray-900 truncate">{company.name}</div>
            <div className="text-[11.5px] text-gray-400 truncate flex items-center gap-1 flex-wrap">
              {company.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{company.city}</span>}
              {(company.sector || company.activite) && ` · ${company.activite || company.sector}`}
              {sourceQueryName && (
                <span className="text-[10.5px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">via {sourceQueryName}</span>
              )}
              {assigneeName && (
                <span className="text-[10.5px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <UserCog2 className="w-2.5 h-2.5" /> {assigneeName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {mode === 'manage' && added && canAssign && assigneeOptions && assigneeOptions.length > 0 && (
            <div className="relative">
              <button onClick={() => setAssignMenuOpen(o => !o)} disabled={assigning}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCog2 className="w-3 h-3" />}
              </button>
              {assignMenuOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20 min-w-[160px]">
                  <button onClick={() => assignTo(null)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-400 hover:bg-gray-50 text-left">
                    <X className="w-3 h-3" /> Non assigné
                  </button>
                  {assigneeOptions.map(a => (
                    <button key={a.id} onClick={() => assignTo(a.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 text-left">
                      {currentAssignee === a.id && <Check className="w-3 h-3 text-brand-600" />} {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            {!added ? (
              <button onClick={addToCrm} disabled={adding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11.5px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ajouter au CRM'}
              </button>
            ) : mode === 'browse' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dans le CRM
              </span>
            ) : (
              <>
                <button onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-[11.5px] font-semibold text-gray-600 hover:bg-gray-100">
                  <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[currentStatus])} />
                  {CRM_STATUS_LABELS[currentStatus]}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10 min-w-[150px]">
                    {CRM_STATUSES.map(s => (
                      <button key={s} onClick={() => changeStatus(s)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 text-left">
                        <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[s])} />{CRM_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {pendingDateStatus && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
          <span className="text-[12px] font-semibold text-amber-800 shrink-0">
            {CRM_STATUS_LABELS[pendingDateStatus]} — choisir date et heure :
          </span>
          <input type="datetime-local" value={dateValue} onChange={e => setDateValue(e.target.value)}
            className="px-2 py-1 rounded-lg border border-amber-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button onClick={() => dateValue && changeStatus(pendingDateStatus, new Date(dateValue).toISOString())}
            disabled={!dateValue}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg text-[11.5px] font-semibold disabled:opacity-40">
            Confirmer
          </button>
          <button onClick={() => { setPendingDateStatus(null); setDateValue('') }} className="text-amber-400 hover:text-amber-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!pendingDateStatus && callbackDate && CRM_STATUSES_NEEDING_DATE.includes(currentStatus) && (
        <div className="flex items-center gap-1.5 text-[12px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-3 w-fit">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(callbackDate).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
        {unlockedFields.filter(f => f !== 'basic').map(f => {
          const d = FIELD_DISPLAY[f]
          if (!d) return null
          const Icon = d.icon
          return (
            <div key={f} className="flex items-center gap-1.5 text-[12px] text-gray-600">
              <Icon className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-gray-400">{FIELD_GROUPS[f].label}:</span>
              <span className="font-medium">{d.render(company)}</span>
            </div>
          )
        })}
        {lockedFields.map(f => {
          const d = FIELD_DISPLAY[f]
          const hasData = d ? d.hasData(company) : false
          if (!hasData) {
            return (
              <div key={f} className="flex items-center gap-1.5 text-[12px] text-gray-300">
                <Lock className="w-3 h-3 shrink-0" />
                <span>{FIELD_GROUPS[f].label}:</span>
                <span className="italic">non disponible</span>
              </div>
            )
          }
          return (
            <button key={f} onClick={() => unlockOne(f)} disabled={unlockingField === f}
              className="flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 disabled:opacity-50 -ml-0 text-left">
              {unlockingField === f ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
              <span className="font-medium">{FIELD_GROUPS[f].label} ({FIELD_GROUPS[f].cost} cr)</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        {mode === 'manage' && company.phone_1 && unlockedSet.has('phone') && (
          <a href={`tel:${company.phone_1.replace(/\s/g, '')}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 text-white rounded-lg text-[12px] font-semibold hover:bg-brand-700 transition-colors">
            <Phone className="w-3.5 h-3.5" /> Appeler
          </a>
        )}
        <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
          {new Set(['basic', ...unlockedFields]).size}/{TOTAL_FIELDS} champs
        </span>
      </div>
    </div>
  )
}
