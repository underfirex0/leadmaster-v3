import { Database } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const PAGE_SIZE = 30

export default async function MyDataPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))

  const { data: unlocks, count } = await supabaseAdmin
    .from('company_unlocks')
    .select('company_id, fields, unlocked_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const companyIds = (unlocks ?? []).map(u => u.company_id)
  const { data: companies } = companyIds.length
    ? await supabaseAdmin.from('companies_v2').select('id, name, city, sector, phone_1, ice').in('id', companyIds)
    : { data: [] }
  const companyMap = new Map((companies ?? []).map(c => [c.id, c]))
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Mes données</h1>
      <p className="text-[13px] text-gray-400 mb-6">Toutes les entreprises que vous avez débloquées, tous historiques confondus.</p>

      {!unlocks?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Database className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">Aucune entreprise débloquée pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {unlocks.map(u => {
            const c = companyMap.get(u.company_id)
            if (!c) return null
            return (
              <div key={u.company_id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="font-semibold text-[13.5px] text-gray-800">{c.name}</div>
                  <div className="text-[11.5px] text-gray-400">{c.city} · {c.sector}</div>
                </div>
                <div className="text-right">
                  {c.phone_1 && <div className="text-[12.5px] text-gray-600">{c.phone_1}</div>}
                  <div className="text-[11px] text-gray-400">{new Date(u.unlocked_at).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 text-[13px]">
          <a href={`?page=${Math.max(1, page - 1)}`} className="px-3 py-2 rounded-lg font-semibold text-gray-500 hover:bg-white">Précédent</a>
          <span className="text-gray-400">Page {page} / {totalPages}</span>
          <a href={`?page=${Math.min(totalPages, page + 1)}`} className="px-3 py-2 rounded-lg font-semibold text-gray-500 hover:bg-white">Suivant</a>
        </div>
      )}
    </div>
  )
}
