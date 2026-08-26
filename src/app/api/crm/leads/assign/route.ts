export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveTeamRoot } from '@/lib/team'

// Assigns a batch of leads to team members — either all to one person
// (manual), or round-robin distributed evenly across several people
// ("smart" auto-distribution, for splitting a big pile of new leads
// across the team without doing it one by one). Only the team owner
// can do this — it's a management action, not a per-lead worker action.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { leadIds, assigneeId, roundRobinAssigneeIds } = await request.json() as {
    leadIds: string[]; assigneeId?: string | null; roundRobinAssigneeIds?: string[]
  }
  if (!leadIds?.length) return NextResponse.json({ error: 'Aucun lead sélectionné' }, { status: 400 })

  const teamRoot = await resolveTeamRoot(user.id)
  if (teamRoot !== user.id) return NextResponse.json({ error: 'Seul le propriétaire peut assigner des leads' }, { status: 403 })

  // Verify every lead actually belongs to this team before touching anything.
  const { data: leads } = await supabaseAdmin.from('crm_leads').select('id, owner_account_id').in('id', leadIds)
  const validIds = (leads ?? []).filter(l => l.owner_account_id === teamRoot).map(l => l.id)
  if (!validIds.length) return NextResponse.json({ error: 'Aucun lead valide' }, { status: 400 })

  if (roundRobinAssigneeIds?.length) {
    // Verify every proposed assignee is actually on this team.
    const { data: members } = await supabaseAdmin.from('profiles').select('id').eq('team_owner_id', teamRoot)
    const validMemberIds = new Set([teamRoot, ...(members ?? []).map(m => m.id)])
    const assignees = roundRobinAssigneeIds.filter(id => validMemberIds.has(id))
    if (!assignees.length) return NextResponse.json({ error: 'Aucun membre valide' }, { status: 400 })

    await Promise.all(validIds.map((leadId, i) =>
      supabaseAdmin.from('crm_leads').update({ assigned_to: assignees[i % assignees.length] }).eq('id', leadId)
    ))
    return NextResponse.json({ assigned: validIds.length, mode: 'round_robin' })
  }

  if (assigneeId !== undefined) {
    if (assigneeId !== null) {
      const { data: member } = await supabaseAdmin.from('profiles').select('team_owner_id').eq('id', assigneeId).single()
      const isOnTeam = assigneeId === teamRoot || member?.team_owner_id === teamRoot
      if (!isOnTeam) return NextResponse.json({ error: "Cette personne ne fait pas partie de l'équipe" }, { status: 400 })
    }
    const { error } = await supabaseAdmin.from('crm_leads').update({ assigned_to: assigneeId }).in('id', validIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ assigned: validIds.length, mode: 'manual' })
  }

  return NextResponse.json({ error: 'assigneeId ou roundRobinAssigneeIds requis' }, { status: 400 })
}
