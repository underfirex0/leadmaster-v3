export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { grantCredits, spendCredits, InsufficientCreditsError } from '@/lib/credits'

async function requireAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

  const { amount, direction } = await request.json() as { amount: number; direction?: 'add' | 'remove' }
  const parsed = Number(amount)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }
  if (parsed > 1_000_000) return NextResponse.json({ error: 'Montant trop élevé' }, { status: 400 })

  try {
    const newBalance = direction === 'remove'
      ? await spendCredits(params.id, parsed, 'admin_deduct')
      : await grantCredits(params.id, parsed, 'admin_grant')
    return NextResponse.json({ balance: newBalance })
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: `Solde insuffisant (${e.available} cr disponibles)` }, { status: 400 })
    }
    console.error('admin credit adjust error:', e)
    return NextResponse.json({ error: 'Utilisateur introuvable ou erreur serveur' }, { status: 500 })
  }
}
