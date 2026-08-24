export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { email } = await request.json()
  if (!email?.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })

  const { error } = await supabaseAdmin.from('referrals').insert({ referrer_id: user.id, referred_email: email, status: 'pending' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
