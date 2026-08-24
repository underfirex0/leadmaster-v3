export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { grantCredits } from '@/lib/credits'
import { CREDIT_PACKS } from '@/lib/constants'

// NOTE: no payment gateway is wired up here — this grants credits and
// records the purchase directly. Before going live, this must sit
// BEHIND a real payment confirmation (e.g. CMI for Morocco, or Stripe),
// triggered by that provider's webhook — never by the client calling
// this route directly, or anyone could grant themselves free credits.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { packId } = await request.json()
    const pack = CREDIT_PACKS.find(p => p.id === packId)
    if (!pack) return NextResponse.json({ error: 'Pack introuvable' }, { status: 400 })

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('pack_purchases')
      .insert({ user_id: user.id, pack_id: pack.id, credits: pack.credits, price_mad: pack.price })
      .select('id').single()
    if (purchaseError) throw purchaseError

    const newBalance = await grantCredits(user.id, pack.credits, 'pack_purchase', purchase.id)

    await supabaseAdmin.from('invoices').insert({
      user_id: user.id, amount_mad: pack.price, status: 'paid',
      description: `${pack.name} — ${pack.credits} crédits`,
    })

    return NextResponse.json({ balance: newBalance })
  } catch (e) {
    console.error('purchase-pack error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
