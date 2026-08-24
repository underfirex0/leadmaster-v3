export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { companyId } = await request.json()
  if (!companyId) return NextResponse.json({ error: 'companyId requis' }, { status: 400 })

  // Verify the user actually unlocked this company before letting them
  // add it as a lead — CRM leads shouldn't bypass the unlock system.
  const { data: unlock } = await supabaseAdmin.from('company_unlocks').select('company_id').eq('user_id', user.id).eq('company_id', companyId).maybeSingle()
  if (!unlock) return NextResponse.json({ error: 'Entreprise non débloquée' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('crm_leads')
    .upsert({ user_id: user.id, company_id: companyId, status: 'to_call' }, { onConflict: 'user_id,company_id', ignoreDuplicates: true })
    .select('id').single()

  if (error && !error.message.includes('duplicate')) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data?.id })
}
