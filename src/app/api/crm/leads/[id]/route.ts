export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CRM_STATUSES } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveTeamRoot, isTeamOwnerOf, isFeatureAllowed } from '@/lib/team'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(await isFeatureAllowed(user.id, 'crm'))) {
    return NextResponse.json({ error: 'Accès au CRM désactivé pour votre compte. Contactez votre administrateur.' }, { status: 403 })
  }

  // A lead belongs to the whole team's shared pool, not just whoever
  // created it — anyone on the same team can update it.
  const { data: lead } = await supabaseAdmin.from('crm_leads').select('owner_account_id').eq('id', params.id).single()
  if (!lead) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const teamRoot = await resolveTeamRoot(user.id)
  if (lead.owner_account_id !== teamRoot) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    if (!(CRM_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    update.status = body.status
  }
  if (body.notes !== undefined) update.notes = body.notes
  if (body.priority !== undefined) update.priority = body.priority
  if (body.callbackDate !== undefined) update.callback_date = body.callbackDate

  if (body.assignedTo !== undefined) {
    // Only the team owner reassigns who's working a lead.
    if (!(await isTeamOwnerOf(user.id, teamRoot))) return NextResponse.json({ error: 'Refusé' }, { status: 403 })
    if (body.assignedTo !== null) {
      const memberIsOnTeam = await isTeamOwnerOf(user.id, body.assignedTo) || body.assignedTo === teamRoot
      if (!memberIsOnTeam) return NextResponse.json({ error: "Cette personne ne fait pas partie de l'équipe" }, { status: 400 })
    }
    update.assigned_to = body.assignedTo
  }

  const { error } = await supabaseAdmin.from('crm_leads').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status !== undefined) {
    await supabaseAdmin.from('crm_activity_logs').insert({ lead_id: params.id, action: 'status_change', details: { status: body.status } })
  }
  return NextResponse.json({ ok: true })
}
