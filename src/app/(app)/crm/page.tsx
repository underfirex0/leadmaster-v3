import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CrmBoard } from './CrmBoard'
import type { CrmStatus } from '@/lib/constants'

export default async function CrmPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: leads } = await supabaseAdmin
    .from('crm_leads')
    .select('id, status, priority, notes, callback_date, company_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const companyIds = [...new Set((leads ?? []).map(l => l.company_id).filter(Boolean))] as string[]
  const { data: companies } = companyIds.length
    ? await supabaseAdmin.from('companies_v2').select('id, name, city, phone_1').in('id', companyIds)
    : { data: [] }
  const companyMap = new Map((companies ?? []).map(c => [c.id, c]))

  const enrichedLeads = (leads ?? []).map(l => ({
    id: l.id, status: l.status as CrmStatus, priority: l.priority, notes: l.notes, callback_date: l.callback_date,
    company: l.company_id ? companyMap.get(l.company_id) ?? null : null,
  }))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">CRM</h1>
      <p className="text-[13px] text-gray-400 mb-6">Glissez-déposez vos leads entre les colonnes pour suivre votre pipeline.</p>
      {!enrichedLeads.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-[13px] text-gray-400">Aucun lead pour le moment — ajoutez-en depuis vos résultats de recherche.</p>
        </div>
      ) : (
        <CrmBoard initialLeads={enrichedLeads} />
      )}
    </div>
  )
}
