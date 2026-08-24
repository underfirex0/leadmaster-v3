import { Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ReferralForm } from './ReferralForm'

export default async function ReferralPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, referred_email, status, reward_credits, created_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const STATUS_LABELS: Record<string, string> = { pending: 'En attente', signed_up: 'Inscrit', rewarded: 'Récompensé' }

  return (
    <div className="max-w-xl">
      <div className="bg-brand-600 rounded-2xl p-6 text-white mb-6">
        <Gift className="w-7 h-7 mb-3" />
        <h1 className="text-lg font-bold mb-1">Parrainez et gagnez des crédits</h1>
        <p className="text-[13px] text-brand-100">Chaque filleul qui s&apos;inscrit et active son compte vous rapporte des crédits bonus.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <ReferralForm />
      </div>

      {!!referrals?.length && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {referrals.map(r => (
            <div key={r.id} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-[13px] text-gray-700">{r.referred_email}</span>
              <span className="text-[11.5px] font-semibold text-gray-400">{STATUS_LABELS[r.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
