export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

  const { email, fullName, startingCredits } = await request.json()
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
  if (credits !== 100) {
    // The signup trigger already granted the default 100 — adjust to
    // whatever the admin actually asked for, with an audit entry.
    await supabaseAdmin.from('profiles').update({ credit_balance: credits }).eq('id', created.user.id)
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: created.user.id, amount: credits - 100, reason: 'admin_grant', balance_after: credits,
    })
  }

  return NextResponse.json({ id: created.user.id, email, password })
}
