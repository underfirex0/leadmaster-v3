export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CRM_STATUSES } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    if (!(CRM_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    update.status = body.status
  }
  if (body.notes !== undefined) update.notes = body.notes
  if (body.priority !== undefined) update.priority = body.priority
  if (body.callbackDate !== undefined) update.callback_date = body.callbackDate

  const { error } = await supabaseAdmin.from('crm_leads').update(update).eq('id', params.id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status !== undefined) {
    await supabaseAdmin.from('crm_activity_logs').insert({ lead_id: params.id, action: 'status_change', details: { status: body.status } })
  }
  return NextResponse.json({ ok: true })
}
