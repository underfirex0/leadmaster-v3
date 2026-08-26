export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

async function requireAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!1'
}

// Creates a brand-new client account directly from the admin panel.
// No email confirmation flow — email_confirm: true activates it
// immediately, since the admin is vouching for this account, and we
// show the generated password once so it can be shared with the client.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const { email, fullName, startingCredits, planId } = await request.json()
  if (!email?.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })

  const password = randomPassword()
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName ?? null },
  })
  if (error || !created.user) {
    return NextResponse.json({ error: error?.message ?? 'Impossible de créer le compte' }, { status: 500 })
  }

  const credits = Number.isFinite(startingCredits) ? Math.max(0, Math.round(startingCredits)) : 100
  const updates: Record<string, unknown> = {}
  if (credits !== 100) updates.credit_balance = credits
  // Assigning a plan here (particularly one with team seats) means the
  // client can immediately create and manage their own worker accounts
  // from /account, without anyone needing to touch the database by hand.
  if (planId && (PLANS as Record<string, unknown>)[planId]) updates.plan_id = planId

  if (Object.keys(updates).length) {
    await supabaseAdmin.from('profiles').update(updates).eq('id', created.user.id)
  }
  if (credits !== 100) {
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: created.user.id, amount: credits - 100, reason: 'admin_grant', balance_after: credits,
    })
  }

  return NextResponse.json({ id: created.user.id, email, password })
}
