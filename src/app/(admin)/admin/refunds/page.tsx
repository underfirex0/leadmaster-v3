import { supabaseAdmin } from '@/lib/supabase/admin'
import { REFUND_REASONS } from '@/lib/constants'
import { RefundActions } from './RefundActions'

export default async function AdminRefundsPage() {
  const { data: refunds } = await supabaseAdmin
    .from('refund_requests')
    .select('id, reason, note, credits_to_refund, status, created_at, user_id, company_id')
    .order('created_at', { ascending: false })
    .limit(100)

  const userIds = [...new Set((refunds ?? []).map(r => r.user_id))]
  const companyIds = [...new Set((refunds ?? []).map(r => r.company_id).filter(Boolean))] as string[]
  const [{ data: users }, { data: companies }] = await Promise.all([
    userIds.length ? supabaseAdmin.from('profiles').select('id, email, full_name').in('id', userIds) : Promise.resolve({ data: [] }),
    companyIds.length ? supabaseAdmin.from('companies_v2').select('id, name').in('id', companyIds) : Promise.resolve({ data: [] }),
  ])
  const userMap = new Map((users ?? []).map(u => [u.id, u]))
  const companyMap = new Map((companies ?? []).map(c => [c.id, c]))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Signalements</h1>
      <p className="text-[13px] text-gray-400 mb-6">Demandes de remboursement de crédits pour données incorrectes.</p>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {!refunds?.length ? (
          <p className="p-6 text-[13px] text-gray-400">Aucun signalement.</p>
        ) : refunds.map(r => {
          const user = userMap.get(r.user_id)
          const company = r.company_id ? companyMap.get(r.company_id) : null
          return (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[13.5px] font-semibold text-gray-800">{company?.name ?? 'Entreprise supprimée'}</div>
                <div className="text-[12px] text-gray-500 mt-0.5">{REFUND_REASONS[r.reason as keyof typeof REFUND_REASONS] ?? r.reason}</div>
                {r.note && <div className="text-[12px] text-gray-400 mt-0.5 italic">&quot;{r.note}&quot;</div>}
                <div className="text-[11.5px] text-gray-400 mt-1">
                  {user?.full_name ?? user?.email} · {r.credits_to_refund} cr · {new Date(r.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              {r.status === 'pending' ? <RefundActions id={r.id} /> : (
                <span className={`text-[11.5px] font-semibold shrink-0 ${r.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
