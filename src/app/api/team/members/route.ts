export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!1'
}

// A team owner creates a real login for one of their own employees —
// not an invite to an existing account, an actual new account, seated
// under the owner's plan. Seat count is enforced against the owner's
// current plan (maxSeats includes the owner's own seat).
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { email, fullName } = await request.json()
  if (!email?.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })

  const { data: owner } = await supabaseAdmin.from('profiles').select('plan_id, team_owner_id').eq('id', user.id).single()
  if (owner?.team_owner_id) return NextResponse.json({ error: "Vous êtes membre d'une équipe — seul le propriétaire peut ajouter des membres" }, { status: 403 })
  const plan = owner?.plan_id ? (PLANS as Record<string, typeof PLANS[keyof typeof PLANS]>)[owner.plan_id] : null
  if (!plan || plan.maxSeats <= 1) return NextResponse.json({ error: "Votre plan n'inclut pas de sièges d'équipe" }, { status: 403 })

  const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('team_owner_id', user.id)
  if ((count ?? 0) + 1 >= plan.maxSeats) return NextResponse.json({ error: 'Limite de sièges atteinte pour ce plan' }, { status: 403 })

  const password = randomPassword()
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName ?? null },
  })
  if (error || !created.user) return NextResponse.json({ error: error?.message ?? 'Impossible de créer le compte' }, { status: 500 })

  // New members start with zero personal credits — the owner transfers
  // spending power to them explicitly via transfer-credits.
  await supabaseAdmin.from('profiles').update({ team_owner_id: user.id, credit_balance: 0 }).eq('id', created.user.id)

  return NextResponse.json({ id: created.user.id, email, password })
}
