import { supabaseAdmin } from '@/lib/supabase/admin'
import { UploadStatusSelect } from './UploadStatusSelect'

export default async function AdminUploadsPage() {
  const { data: requests } = await supabaseAdmin
    .from('data_upload_requests')
    .select('id, request_description, status, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(100)

  const userIds = [...new Set((requests ?? []).map(r => r.user_id))]
  const { data: users } = userIds.length
    ? await supabaseAdmin.from('profiles').select('id, email, full_name').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map(u => [u.id, u]))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Demandes de données</h1>
      <p className="text-[13px] text-gray-400 mb-6">Demandes de jeux de données personnalisés soumises par les utilisateurs.</p>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {!requests?.length ? (
          <p className="p-6 text-[13px] text-gray-400">Aucune demande.</p>
        ) : requests.map(r => {
          const user = userMap.get(r.user_id)
          return (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] text-gray-800">{r.request_description}</div>
                <div className="text-[11.5px] text-gray-400 mt-1">{user?.full_name ?? user?.email} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <UploadStatusSelect id={r.id} current={r.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
