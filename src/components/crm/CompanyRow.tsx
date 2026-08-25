'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Globe, ShieldCheck, UserRound, Calendar, Banknote, MapPin, Lock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CRM_STATUSES, CRM_STATUS_LABELS, type CrmStatus, FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

export interface RowCompany {
  id: string; name: string; city: string | null; sector: string | null; activite?: string
  phone_1: string | null; phone_2: string | null; website: string | null
  ice: string | null; rc: string | null; director: string | null
  annee_creation: number | null; effectif_tranche: string | null
  capital_mad: number | null; address_raw: string | null
}

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
  to_call: 'bg-blue-500', in_progress: 'bg-purple-500', callback: 'bg-orange-500',
  interested: 'bg-emerald-500', not_interested: 'bg-red-500',
  converted: 'bg-brand-600', archived: 'bg-gray-400',
}

export function CompanyRow({
  leadId, status, company, unlockedFields, sourceQueryId, onAdded,
}: { leadId?: string; status?: CrmStatus; company: RowCompany; unlockedFields: FieldGroupId[]; sourceQueryId?: string; onAdded?: () => void }) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status ?? 'to_call')
  const [menuOpen, setMenuOpen] = useState(false)
  const [unlockingField, setUnlockingField] = useState<FieldGroupId | null>(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(!!leadId)

  const unlockedSet = new Set(unlockedFields)
  const lockedFields = ALL_METERED_FIELDS.filter(f => !unlockedSet.has(f))

  async function changeStatus(s: CrmStatus) {
    setCurrentStatus(s)
    setMenuOpen(false)
    await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }),
    })
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

  const initials = company.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[12px] font-bold shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="font-bold text-[14px] text-gray-900 truncate">{company.name}</div>
            <div className="text-[11.5px] text-gray-400 truncate">
              {company.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{company.city}</span>}
              {(company.sector || company.activite) && ` · ${company.activite || company.sector}`}
            </div>
          </div>
        </div>
        <div className="relative shrink-0">
          {!added ? (
            <button onClick={addToCrm} disabled={adding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11.5px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ajouter au CRM'}
            </button>
          ) : (
            <>
              <button onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-[11.5px] font-semibold text-gray-600 hover:bg-gray-100">
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[currentStatus])} />
                {CRM_STATUS_LABELS[currentStatus]}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
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
        {company.phone_1 && unlockedSet.has('phone') && (
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
