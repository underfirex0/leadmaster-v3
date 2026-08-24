import { UploadForm } from './UploadForm'
import { createClient } from '@/lib/supabase/server'

export default async function UploadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: requests } = await supabase
    .from('data_upload_requests')
    .select('id, request_description, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const STATUS_LABELS: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', done: 'Terminé', rejected: 'Refusé' }
  const STATUS_COLORS: Record<string, string> = { pending: 'text-amber-600 bg-amber-50', in_progress: 'text-blue-600 bg-blue-50', done: 'text-emerald-600 bg-emerald-50', rejected: 'text-red-600 bg-red-50' }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Demande de données sur mesure</h1>
      <p className="text-[13px] text-gray-400 mb-6">Besoin d&apos;un jeu de données spécifique non couvert par la recherche standard ? Décrivez votre besoin.</p>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <UploadForm />
      </div>

      {!!requests?.length && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {requests.map(r => (
            <div key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] text-gray-700 truncate">{r.request_description}</div>
                <div className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-pill shrink-0 ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
