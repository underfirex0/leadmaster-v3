import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CrmList, type CrmLeadRow } from './CrmList'
import type { CrmStatus } from '@/lib/constants'

export default async function CrmPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: leads } = await supabaseAdmin
    .from('crm_leads')
    .select('id, status, priority, notes, callback_date, created_at, company_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const companyIds = [...new Set((leads ?? []).map(l => l.company_id).filter(Boolean))] as string[]

  const [{ data: companies }, { data: unlocks }] = await Promise.all([
    companyIds.length
      ? supabaseAdmin.from('companies_v2').select('id, name, city, sector, phone_1, director, ice, annee_creation, effectif_tranche, capital_mad, address_raw').in('id', companyIds)
      : Promise.resolve({ data: [] }),
    companyIds.length
      ? supabaseAdmin.from('company_unlocks').select('company_id, fields').eq('user_id', user.id).in('company_id', companyIds)
      : Promise.resolve({ data: [] }),
  ])

  const companyMap = new Map((companies ?? []).map(c => [c.id, c]))
  const unlockMap = new Map((unlocks ?? []).map(u => [u.company_id, new Set(['basic', ...(u.fields as string[])]).size]))

  const enrichedLeads: CrmLeadRow[] = (leads ?? []).map(l => ({
    id: l.id, status: l.status as CrmStatus, priority: l.priority, notes: l.notes,
    callback_date: l.callback_date, created_at: l.created_at,
    unlockedFieldCount: l.company_id ? (unlockMap.get(l.company_id) ?? 1) : 1,
    company: l.company_id ? (companyMap.get(l.company_id) ?? null) : null,
  }))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">CRM</h1>
      <p className="text-[13px] text-gray-400 mb-6">Suivez vos prospects, filtrez et changez leur statut.</p>
      {!enrichedLeads.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-[13px] text-gray-400">Aucun lead pour le moment — ajoutez-en depuis vos résultats de recherche.</p>
        </div>
      ) : (
        <CrmList initialLeads={enrichedLeads} />
      )}
    </div>
  )
}
