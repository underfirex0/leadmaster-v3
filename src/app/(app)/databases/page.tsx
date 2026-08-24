import Link from 'next/link'
import { Database, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function DatabasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: queries } = await supabaseAdmin
    .from('queries')
    .select('id, query_name, result_count, credits_spent, fields, created_at')
    .eq('user_id', user.id)
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
          {queries.map(q => (
            <Link key={q.id} href={`/databases/${q.id}`}
              className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-brand-200 transition-colors">
              <div>
                <div className="font-semibold text-[14px] text-gray-800">{q.query_name}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">
                  {q.result_count.toLocaleString('fr-FR')} entreprises · {q.credits_spent} cr · {new Date(q.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
