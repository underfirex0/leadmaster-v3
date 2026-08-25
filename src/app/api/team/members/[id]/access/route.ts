export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Lets a team owner control exactly what one of their own members can
// see or do — search, CRM, spend credits to unlock data, or submit
// custom data requests — independent per member. Only the actual owner
// of that specific member can change it; never someone else's team.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: member } = await supabaseAdmin.from('profiles').select('team_owner_id').eq('id', params.id).single()
  if (!member || member.team_owner_id !== user.id) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const { feature, enabled } = await request.json()
  const { error } = await supabaseAdmin.from('user_feature_access')
    .upsert({ user_id: params.id, feature, enabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id,feature' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
