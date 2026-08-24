export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

// Invites an existing registered user (by email) as a seat under the
// caller's team plan. Does not create new accounts — the invitee must
// already have signed up. A fuller invite-by-email flow (for people
// without an account yet) needs transactional email wired up, which
// isn't set up in this environment — flagged as a follow-up.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { email } = await request.json()
  const { data: owner } = await supabase.from('profiles').select('plan_id').eq('id', user.id).single()
  const plan = owner?.plan_id ? (PLANS as Record<string, typeof PLANS[keyof typeof PLANS]>)[owner.plan_id] : null
  if (!plan || plan.maxSeats <= 1) return NextResponse.json({ error: "Votre plan n'inclut pas de sièges d'équipe" }, { status: 403 })

  const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('team_owner_id', user.id)
  if ((count ?? 0) >= plan.maxSeats - 1) return NextResponse.json({ error: 'Limite de sièges atteinte pour ce plan' }, { status: 403 })

  const { data: invitee } = await supabaseAdmin.from('profiles').select('id, team_owner_id').eq('email', email).maybeSingle()
  if (!invitee) return NextResponse.json({ error: "Aucun compte trouvé avec cet email — la personne doit d'abord créer un compte" }, { status: 404 })
  if (invitee.team_owner_id) return NextResponse.json({ error: 'Cette personne fait déjà partie d\'une équipe' }, { status: 400 })

  const { error } = await supabaseAdmin.from('profiles').update({ team_owner_id: user.id }).eq('id', invitee.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
