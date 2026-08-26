export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

async function requireAdmin(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user.id : null
}

// Lets admin change a client's plan after the fact — e.g. upgrading
// someone to a team plan so they can start creating their own workers,
// without needing to touch the database directly.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const { planId } = await request.json()
  if (planId !== null && !(PLANS as Record<string, unknown>)[planId]) {
    return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
  }
  const { error } = await supabaseAdmin.from('profiles').update({ plan_id: planId }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Deletes a client account entirely. Cascades through every table that
// references profiles(id) ON DELETE CASCADE — searches, CRM leads,
// unlocks, transactions, all of it goes with the account.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Refusé' }, { status: 403 })
  if (adminId === params.id) return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })

  const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
