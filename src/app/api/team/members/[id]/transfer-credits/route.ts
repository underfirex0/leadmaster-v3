export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { amount } = await request.json()
  const parsed = Number(amount)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.rpc('transfer_credits', {
    p_owner_id: user.id, p_member_id: params.id, p_amount: parsed,
  })
  if (error) {
    if (error.message?.includes('insufficient_credits')) return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 })
    if (error.message?.includes('not_team_owner')) return NextResponse.json({ error: 'Refusé' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
