export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { countMatchingCompanies, getFieldCoverage, type CompanyFilters } from '@/lib/companies'
import { FIELD_GROUPS, FREE_TRIAL_LIMIT, FREE_TRIAL_FIELDS, type FieldGroupId } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const {
      taxonomyIds = [], cities = [], name = '',
      effectifTranches = [], capitalMin, capitalMax,
      fields = [], limit = 50,
    } = await request.json()

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const filters: CompanyFilters = { taxonomyIds, cities, name, effectifTranches, capitalMin, capitalMax }

    // 1. Exact count for this exact combination — single indexed query.
    const exactCount = await countMatchingCompanies(filters)
    const actualLimit = Math.min(limit, exactCount, 10000)

    // 2. Field coverage from the precomputed catalog — instant, no live sample.
    const coverage = await getFieldCoverage(taxonomyIds)
    const fieldCoverage: Record<string, number> = { basic: 100 }
    for (const f of allFields) if (f !== 'basic') fieldCoverage[f] = coverage[f]

    // 3. Cost from real coverage rates.
    let estimatedCost = 0
    for (const f of allFields) {
      const rate = (fieldCoverage[f] ?? 100) / 100
      estimatedCost += Math.round(rate * actualLimit * FIELD_GROUPS[f].cost)
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance, free_trial_used').eq('id', user.id).single()
    const balance = profile?.credit_balance ?? 0
    const trialUsed = profile?.free_trial_used ?? false
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrialEligible = !trialUsed && isBasicOnly && actualLimit <= FREE_TRIAL_LIMIT
      && allFields.every(f => (FREE_TRIAL_FIELDS as string[]).includes(f))

    return NextResponse.json({
      count: exactCount,
      actualLimit,
      estimatedCost: freeTrialEligible ? 0 : estimatedCost,
      fieldCoverage,
      canAfford: balance >= estimatedCost || freeTrialEligible,
      balance,
      freeTrialEligible,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('estimate route error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
