import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'
import { ProfileForm } from './AccountForms'
import { TeamMemberCard } from './TeamMemberCard'
import { CreateMemberForm } from './CreateMemberForm'
import { Users2, Receipt, CreditCard } from 'lucide-react'

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: invoices }, { data: teamMembers }] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name, company_name, email, plan_id, team_owner_id').eq('id', user.id).single(),
    supabaseAdmin.from('invoices').select('id, amount_mad, description, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('profiles').select('id, full_name, email, credit_balance').eq('team_owner_id', user.id),
  ])

  const plan = profile?.plan_id ? (PLANS as Record<string, typeof PLANS[keyof typeof PLANS]>)[profile.plan_id] : null
  const isTeamOwner = plan && plan.maxSeats > 1 && !profile?.team_owner_id

  const memberIds = (teamMembers ?? []).map(m => m.id)
  const { data: accessRows } = memberIds.length
    ? await supabaseAdmin.from('user_feature_access').select('user_id, feature, enabled').in('user_id', memberIds)
    : { data: [] }
  const accessMap = new Map<string, Record<string, boolean>>()
  for (const row of accessRows ?? []) {
    if (!accessMap.has(row.user_id)) accessMap.set(row.user_id, {})
    accessMap.get(row.user_id)![row.feature] = row.enabled
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Mon compte</h1>
      <p className="text-[13px] text-gray-400 mb-6">{profile?.email}</p>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="font-bold text-[14px] text-gray-900 mb-3">Profil</h2>
        <ProfileForm fullName={profile?.full_name ?? ''} companyName={profile?.company_name ?? ''} />
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="flex items-center gap-1.5 font-bold text-[14px] text-gray-900 mb-1"><CreditCard className="w-4 h-4 text-brand-500" /> Abonnement</h2>
        <p className="text-[13px] text-gray-500 mb-3">{plan ? `${plan.name} — ${plan.desc}` : 'Aucun abonnement actif (pay-as-you-go)'}</p>
        <a href="/wallet" className="text-[13px] font-semibold text-brand-600">Gérer mon abonnement →</a>
      </section>

      {isTeamOwner && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <h2 className="flex items-center gap-1.5 font-bold text-[14px] text-gray-900 mb-1"><Users2 className="w-4 h-4 text-brand-500" /> Équipe</h2>
          <p className="text-[12.5px] text-gray-400 mb-4">
            {(teamMembers?.length ?? 0) + 1} / {plan.maxSeats} sièges utilisés · contrôlez ce que chaque membre peut voir ou débloquer
          </p>
          <div className="space-y-2 mb-4">
            {(teamMembers ?? []).map(m => (
              <TeamMemberCard key={m.id} member={{ ...m, access: accessMap.get(m.id) ?? {} }} />
            ))}
          </div>
          {(teamMembers?.length ?? 0) + 1 < plan.maxSeats ? (
            <CreateMemberForm />
          ) : (
            <p className="text-[12px] text-gray-400">Limite de sièges atteinte pour votre plan.</p>
          )}
        </section>
      )}

      {profile?.team_owner_id && (
        <section className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-5">
          <p className="text-[13px] text-brand-800">
            Ce compte fait partie d&apos;une équipe. Vos crédits et vos accès sont gérés par le propriétaire du compte.
          </p>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="flex items-center gap-1.5 font-bold text-[14px] text-gray-900 mb-3"><Receipt className="w-4 h-4 text-brand-500" /> Factures</h2>
        {!invoices?.length ? (
          <p className="text-[13px] text-gray-400">Aucune facture pour le moment.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-[13px] font-medium text-gray-700">{inv.description}</div>
                  <div className="text-[11.5px] text-gray-400">{new Date(inv.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <span className="text-[13px] font-bold text-gray-800">{inv.amount_mad} MAD</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
