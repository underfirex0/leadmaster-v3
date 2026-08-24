import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'
import { ProfileForm, TeamInviteForm } from './AccountForms'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: invoices }, { data: teamMembers }] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name, company_name, email, plan_id').eq('id', user.id).single(),
    supabaseAdmin.from('invoices').select('id, amount_mad, description, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('profiles').select('id, full_name, email').eq('team_owner_id', user.id),
  ])

  const plan = profile?.plan_id ? (PLANS as Record<string, typeof PLANS[keyof typeof PLANS]>)[profile.plan_id] : null

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Mon compte</h1>
      <p className="text-[13px] text-gray-400 mb-6">{profile?.email}</p>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="font-bold text-[14px] text-gray-900 mb-3">Profil</h2>
        <ProfileForm fullName={profile?.full_name ?? ''} companyName={profile?.company_name ?? ''} />
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="font-bold text-[14px] text-gray-900 mb-1">Abonnement</h2>
        <p className="text-[13px] text-gray-500 mb-3">{plan ? `${plan.name} — ${plan.desc}` : 'Aucun abonnement actif (pay-as-you-go)'}</p>
        <a href="/wallet" className="text-[13px] font-semibold text-brand-600">Gérer mon abonnement →</a>
      </section>

      {plan && plan.maxSeats > 1 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 relative">
          <h2 className="font-bold text-[14px] text-gray-900 mb-1">Équipe</h2>
          <p className="text-[12.5px] text-gray-400 mb-3">{(teamMembers?.length ?? 0) + 1} / {plan.maxSeats} sièges utilisés</p>
          <div className="space-y-1.5 mb-4">
            {(teamMembers ?? []).map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-[13px]">
                <span className="font-medium text-gray-700">{m.full_name || m.email}</span>
                <span className="text-gray-400">{m.email}</span>
              </div>
            ))}
          </div>
          {(teamMembers?.length ?? 0) + 1 < plan.maxSeats && <TeamInviteForm />}
        </section>
      )}

      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-[14px] text-gray-900 mb-3">Factures</h2>
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
