export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { countMatchingCompanies, fetchMatchingCompanyIds, getFieldCoverage, type CompanyFilters } from '@/lib/companies'
import { FIELD_GROUPS, FREE_TRIAL_LIMIT, FREE_TRIAL_FIELDS, type FieldGroupId } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const {
      queryName, taxonomyIds = [], cities = [], name = '',
      effectifTranches = [], capitalMin, capitalMax, fields = [], limit = 50,
    } = await request.json()

    if (!queryName?.trim()) return NextResponse.json({ error: 'Nom de recherche requis' }, { status: 400 })

    const allFields: FieldGroupId[] = [...new Set(['basic', ...fields])] as FieldGroupId[]
    const filters: CompanyFilters = { taxonomyIds, cities, name, effectifTranches, capitalMin, capitalMax }

    // Recompute everything server-side — never trust a client-sent cost.
    // Prevents a tampered request from unlocking data for less than it costs.
    const exactCount = await countMatchingCompanies(filters)
    const actualLimit = Math.min(limit, exactCount, 10000)
    const coverage = await getFieldCoverage(taxonomyIds)

    let estimatedCost = 0
    for (const f of allFields) {
      const rate = f === 'basic' ? 1 : (coverage[f] ?? 100) / 100
      estimatedCost += Math.round(rate * actualLimit * FIELD_GROUPS[f].cost)
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('free_trial_used').eq('id', user.id).single()
    const isBasicOnly = allFields.length === 1 && allFields[0] === 'basic'
    const freeTrialEligible = !profile?.free_trial_used && isBasicOnly && actualLimit <= FREE_TRIAL_LIMIT
      && allFields.every(f => (FREE_TRIAL_FIELDS as string[]).includes(f))
    const finalCost = freeTrialEligible ? 0 : estimatedCost

    const companyIds = await fetchMatchingCompanyIds(filters, actualLimit)
    if (!companyIds.length) return NextResponse.json({ error: 'Aucune entreprise ne correspond à ces critères' }, { status: 400 })

    const { data: queryId, error } = await supabaseAdmin.rpc('execute_search', {
      p_user_id: user.id,
      p_query_name: queryName.trim(),
      p_company_ids: companyIds,
      p_fields: allFields,
      p_filters: filters,
      p_cost: finalCost,
      p_is_free_trial: freeTrialEligible,
    })

    if (error) {
      if (error.message?.includes('insufficient_credits')) {
        return NextResponse.json({ error: 'Solde de crédits insuffisant' }, { status: 402 })
      }
      throw error
    }

    return NextResponse.json({ queryId, count: companyIds.length, cost: finalCost }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('execute route error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
