import { supabaseAdmin } from '@/lib/supabase/admin'
import { FeatureToggles } from './FeatureToggles'

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? ''
  let query = supabaseAdmin.from('profiles').select('id, email, full_name, credit_balance, plan_id, is_admin, created_at').order('created_at', { ascending: false }).limit(50)
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
  const { data: users } = await query

  const userIds = (users ?? []).map(u => u.id)
  const { data: accessRows } = userIds.length
    ? await supabaseAdmin.from('user_feature_access').select('user_id, feature, enabled').in('user_id', userIds)
    : { data: [] }
  const accessMap = new Map<string, Record<string, boolean>>()
  for (const row of accessRows ?? []) {
    if (!accessMap.has(row.user_id)) accessMap.set(row.user_id, {})
    accessMap.get(row.user_id)![row.feature] = row.enabled
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Utilisateurs</h1>
      <p className="text-[13px] text-gray-400 mb-4">Gérez les comptes et les accès aux fonctionnalités.</p>

      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Rechercher par email ou nom..."
          className="w-full max-w-sm px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {(users ?? []).map(u => (
          <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-[200px]">
              <div className="text-[13.5px] font-semibold text-gray-800 flex items-center gap-2">
                {u.full_name ?? u.email}
                {u.is_admin && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">ADMIN</span>}
              </div>
              <div className="text-[11.5px] text-gray-400">{u.email} · {u.credit_balance} cr · {u.plan_id ?? 'pay-as-you-go'}</div>
            </div>
            <FeatureToggles userId={u.id} access={accessMap.get(u.id) ?? {}} />
          </div>
        ))}
      </div>
    </div>
  )
}
