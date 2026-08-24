import { Wallet, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CREDIT_PACKS, PLANS } from '@/lib/constants'
import { PackButton, PlanButton } from './PurchaseButtons'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function WalletPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabaseAdmin.from('profiles').select('credit_balance, plan_id').eq('id', user.id).single(),
    supabaseAdmin.from('credit_transactions').select('amount, reason, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Crédits</h1>
      <p className="text-[13px] text-gray-400 mb-6">Gérez votre solde, vos packs et votre abonnement.</p>

      <div className="bg-brand-600 rounded-2xl p-6 text-white flex items-center gap-4 mb-8">
        <Wallet className="w-8 h-8" />
        <div>
          <div className="text-3xl font-bold">{(profile?.credit_balance ?? 0).toLocaleString('fr-FR')}</div>
          <div className="text-[13px] text-brand-100">crédits disponibles</div>
        </div>
      </div>

      <h2 className="font-bold text-[15px] text-gray-900 mb-3">Packs de crédits</h2>
      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        {CREDIT_PACKS.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <Zap className="w-5 h-5 text-brand-500 mx-auto mb-2" />
            <div className="font-bold text-[14px] text-gray-900">{p.name}</div>
            <div className="text-[12px] text-gray-400 mb-2">{p.credits.toLocaleString('fr-FR')} cr</div>
            <div className="font-bold text-[16px] text-gray-900 mb-3">{p.price} MAD</div>
            <PackButton packId={p.id} />
          </div>
        ))}
      </div>

      <h2 className="font-bold text-[15px] text-gray-900 mb-3">Abonnements</h2>
      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        {Object.values(PLANS).map(p => (
          <div key={p.id} className={`bg-white rounded-2xl border p-4 text-center ${profile?.plan_id === p.id ? 'border-brand-400' : 'border-gray-100'}`}>
            <div className="font-bold text-[14px] text-gray-900">{p.name}</div>
            <div className="text-[12px] text-gray-400 mb-2">{p.desc}</div>
            <div className="font-bold text-[16px] text-gray-900 mb-3">
              {p.price === null ? 'Sur devis' : p.price === 0 ? 'Gratuit' : `${p.price} MAD/mois`}
            </div>
            {profile?.plan_id === p.id ? (
              <span className="text-[12px] font-semibold text-brand-600">Plan actuel</span>
            ) : (
              <PlanButton planId={p.id} disabled={p.id === 'entreprise'} />
            )}
          </div>
        ))}
      </div>

      <h2 className="font-bold text-[15px] text-gray-900 mb-3">Historique</h2>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {!transactions?.length ? (
          <p className="p-5 text-[13px] text-gray-400">Aucune transaction pour le moment.</p>
        ) : transactions.map((t, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-[13px] font-medium text-gray-700">{reasonLabel(t.reason)}</div>
              <div className="text-[11.5px] text-gray-400">{new Date(t.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <span className={`text-[13px] font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
              {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('fr-FR')} cr
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    unlock: 'Recherche', pack_purchase: 'Achat de pack', plan_renewal: 'Renouvellement abonnement',
    refund: 'Remboursement', free_trial: 'Essai gratuit',
  }
  return labels[reason] ?? reason
}
