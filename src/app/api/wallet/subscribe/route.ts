export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { grantCredits } from '@/lib/credits'
import { PLANS } from '@/lib/constants'

// Same caveat as purchase-pack: no real payment gateway behind this yet.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { planId } = await request.json()
    const plan = (PLANS as Record<string, typeof PLANS[keyof typeof PLANS]>)[planId]
    if (!plan || plan.id === 'entreprise') return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })

    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await supabaseAdmin.from('subscriptions').insert({
      user_id: user.id, plan_id: plan.id, status: 'active', current_period_end: periodEnd.toISOString(),
    })
    await supabaseAdmin.from('profiles').update({ plan_id: plan.id }).eq('id', user.id)

    let newBalance: number | null = null
    if (plan.credits) newBalance = await grantCredits(user.id, plan.credits, 'plan_renewal')

    if (plan.price) {
      await supabaseAdmin.from('invoices').insert({
        user_id: user.id, amount_mad: plan.price, status: 'paid',
        description: `Abonnement ${plan.name}`,
      })
    }

    return NextResponse.json({ balance: newBalance })
  } catch (e) {
    console.error('subscribe error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
