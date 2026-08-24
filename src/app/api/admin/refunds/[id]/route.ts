export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { grantCredits } from '@/lib/credits'

async function requireAdmin(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user.id : null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const { action, adminNote } = await request.json()
  const { data: refund } = await supabaseAdmin.from('refund_requests').select('*').eq('id', params.id).single()
  if (!refund) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (refund.status !== 'pending') return NextResponse.json({ error: 'Déjà traité' }, { status: 400 })

  if (action === 'approve') {
    await grantCredits(refund.user_id, refund.credits_to_refund, 'refund', refund.id)
  }

  const { error } = await supabaseAdmin.from('refund_requests').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    admin_note: adminNote ?? null, resolved_at: new Date().toISOString(),
  }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
