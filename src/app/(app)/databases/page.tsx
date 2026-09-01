import Link from 'next/link'
import { Database, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveTeamRoot } from '@/lib/team'

export default async function DatabasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const teamRoot = await resolveTeamRoot(user.id)

  // Team-shared, like CRM already is — a search run by any teammate is
  // visible (and manageable) by the whole team, not just its creator.
  const { data: queries } = await supabaseAdmin
    .from('queries')
    .select('id, query_name, result_count, credits_spent, fields, created_at, user_id, profiles:user_id(full_name, email)')
    .eq('owner_account_id', teamRoot)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Mes sélections</h1>
      <p className="text-[13px] text-gray-400 mb-6">Toutes vos recherches lancées, avec accès permanent aux résultats.</p>

      {!queries?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Database className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400 mb-4">Aucune recherche pour le moment.</p>
          <Link href="/search-v2" className="text-brand-600 font-semibold text-[13px]">Lancer une recherche →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {queries.map(q => {
            const runner = (q as unknown as { profiles?: { full_name: string | null; email: string } }).profiles
            const runnerLabel = q.user_id !== user.id ? (runner?.full_name || runner?.email) : null
            return (
              <Link key={q.id} href={`/databases/${q.id}`}
                className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-brand-200 transition-colors">
                <div>
                  <div className="font-semibold text-[14px] text-gray-800 flex items-center gap-2">
                    {q.query_name}
                    {runnerLabel && (
                      <span className="text-[10.5px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-pill px-2 py-0.5">
                        par {runnerLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-400 mt-0.5">
                    {q.result_count.toLocaleString('fr-FR')} entreprises · {q.credits_spent} cr · {new Date(q.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
