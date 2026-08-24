import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_GROUPS, type FieldGroupId } from '@/lib/constants'

// ═══════════════════════════════════════════════════════════
// The ONLY module that queries companies_v2 / taxonomy / the
// precomputed catalogs. Two hard rules, learned from the v2 rebuild:
//
// 1. Anything that would require aggregating across the whole
//    companies_v2 table (sector/city counts, field coverage %) reads
//    from a *_catalog table — NEVER a live GROUP BY over 120k+ rows.
//    Catalogs are refreshed via SELECT refresh_search_catalog() in
//    Postgres, not recomputed per request.
// 2. Matching a specific company set to a set of filters (the exact
//    count/list for what a user actually picked) IS live — that
//    combination can't be precomputed, but it's a single indexed
//    query against companies_v2.primary_taxonomy_id directly, no
//    join through company_taxonomy required for primary matching.
// ═══════════════════════════════════════════════════════════

export interface TaxonomyNode {
  id: number
  sector: string
  domaine: string
  activite: string
}

export interface TaxonomyTree {
  sector: string
  totalCount: number
  domaines: {
    domaine: string
    totalCount: number
    activites: { id: number; activite: string; count: number }[]
  }[]
}

export interface CompanyFilters {
  taxonomyIds?: number[]
  cities?: string[]
  name?: string
  effectifTranches?: string[]
  capitalMin?: number
  capitalMax?: number
  includeLowQuality?: boolean   // default false — junk/unnamed records excluded everywhere
}

// ── Taxonomy tree for the wizard's Step 2 — reads taxonomy_catalog or
// city_taxonomy_catalog directly, both tiny precomputed tables ──
export async function getTaxonomyTree(cities?: string[]): Promise<TaxonomyTree[]> {
  type Row = { taxonomy_id: number; sector: string; domaine: string; activite: string; company_count: number }
  let rows: Row[] = []

  if (cities?.length) {
    const merged = new Map<number, Row>()
    const { data, error } = await supabaseAdmin
      .from('city_taxonomy_catalog')
      .select('taxonomy_id, sector, domaine, activite, company_count')
      .in('city', cities)
    if (error) throw error
    for (const row of (data ?? []) as Row[]) {
      const prev = merged.get(row.taxonomy_id)
      if (prev) prev.company_count += row.company_count
      else merged.set(row.taxonomy_id, { ...row })
    }
    rows = [...merged.values()]
  } else {
    const { data, error } = await supabaseAdmin
      .from('taxonomy_catalog')
      .select('taxonomy_id, sector, domaine, activite, company_count')
    if (error) throw error
    rows = (data ?? []) as Row[]
  }

  const sectorMap = new Map<string, Map<string, { id: number; activite: string; count: number }[]>>()
  for (const row of rows) {
    if (row.company_count <= 0) continue
    if (!sectorMap.has(row.sector)) sectorMap.set(row.sector, new Map())
    const domMap = sectorMap.get(row.sector)!
    if (!domMap.has(row.domaine)) domMap.set(row.domaine, [])
    domMap.get(row.domaine)!.push({ id: row.taxonomy_id, activite: row.activite, count: row.company_count })
  }

  const tree: TaxonomyTree[] = []
  for (const [sector, domMap] of sectorMap) {
    const domaines = []
    let sectorTotal = 0
    for (const [domaine, activites] of domMap) {
      const domTotal = activites.reduce((s, a) => s + a.count, 0)
      sectorTotal += domTotal
      domaines.push({ domaine, totalCount: domTotal, activites: activites.sort((a, b) => a.activite.localeCompare(b.activite)) })
    }
    tree.push({ sector, totalCount: sectorTotal, domaines: domaines.sort((a, b) => a.domaine.localeCompare(b.domaine)) })
  }
  return tree.sort((a, b) => a.sector.localeCompare(b.sector))
}

// ── City picker — reads the tiny precomputed cities_catalog table,
// never the old paginated full-table scan ──
export async function getAvailableCities(): Promise<{ city: string; count: number }[]> {
  const { data, error } = await supabaseAdmin
    .from('cities_catalog')
    .select('city, company_count')
    .order('company_count', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => ({ city: r.city as string, count: r.company_count as number }))
}

// ── Instant field-coverage lookup for Step 4 ("available for X% of
// your results") — from taxonomy_catalog, weighted by company_count
// across whichever taxonomy ids are selected. No live sampling. ──
export async function getFieldCoverage(taxonomyIds: number[]): Promise<Record<FieldGroupId, number>> {
  const cols = 'taxonomy_id,company_count,phone_coverage,email_coverage,website_coverage,ice_coverage,director_coverage,effectif_coverage,capital_coverage'
  let q = supabaseAdmin.from('taxonomy_catalog').select(cols)
  if (taxonomyIds.length) q = q.in('taxonomy_id', taxonomyIds)
  const { data, error } = await q
  const fallback = Object.fromEntries(ALL_FIELD_IDS().map(f => [f, 50])) as Record<FieldGroupId, number>
  if (error || !data?.length) return fallback

  const totalCompanies = data.reduce((s, r) => s + (r.company_count as number), 0) || 1
  const out = { ...fallback }
  for (const fieldId of ALL_FIELD_IDS()) {
    const key = FIELD_GROUPS[fieldId].coverageKey
    if (!key) { out[fieldId] = 100; continue }  // unmetered fields (basic, address, année, etc.) always shown
    out[fieldId] = Math.round(
      data.reduce((s, r) => s + ((r as Record<string, number>)[key] * (r.company_count as number)), 0) / totalCompanies
    )
  }
  return out
}
function ALL_FIELD_IDS(): FieldGroupId[] { return Object.keys(FIELD_GROUPS) as FieldGroupId[] }

// ── Apply the small live filters (city/name/effectif/capital) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBaseFilters(q: any, f: CompanyFilters) {
  if (f.cities?.length) q = q.in('city', f.cities)
  if (f.name?.trim())   q = q.ilike('name', `%${f.name.trim()}%`)
  if (f.effectifTranches?.length === 1) q = q.eq('effectif_tranche', f.effectifTranches[0])
  if (f.effectifTranches?.length && f.effectifTranches.length > 1) q = q.in('effectif_tranche', f.effectifTranches)
  if (f.capitalMin != null) q = q.gte('capital_mad', f.capitalMin)
  if (f.capitalMax != null) q = q.lte('capital_mad', f.capitalMax)
  if (!f.includeLowQuality) q = q.eq('is_low_quality', false)
  return q
}

// ── Exact count for the SPECIFIC filter combination the user built ──
// Live, but a single indexed query directly on primary_taxonomy_id —
// no join through company_taxonomy for primary matching.
export async function countMatchingCompanies(f: CompanyFilters): Promise<number> {
  let q = supabaseAdmin.from('companies_v2').select('*', { count: 'exact', head: true })
  if (f.taxonomyIds?.length) q = q.in('primary_taxonomy_id', f.taxonomyIds)
  q = applyBaseFilters(q, f)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

export async function fetchMatchingCompanies(
  f: CompanyFilters,
  columns: string,
  limit: number,
  offset = 0
): Promise<Record<string, unknown>[]> {
  let q = supabaseAdmin.from('companies_v2').select(columns)
    .order('completeness_score', { ascending: false })
    .order('id', { ascending: true })   // stable tiebreaker for pagination
    .range(offset, offset + limit - 1)
  if (f.taxonomyIds?.length) q = q.in('primary_taxonomy_id', f.taxonomyIds)
  q = applyBaseFilters(q, f)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as Record<string, unknown>[]
}

// ── Fetch just the ids matching filters, ordered by completeness —
// used by execute to freeze the exact result set into queries.company_ids ──
export async function fetchMatchingCompanyIds(f: CompanyFilters, limit: number): Promise<string[]> {
  const rows = await fetchMatchingCompanies(f, 'id', limit)
  return rows.map(r => r.id as string)
}
