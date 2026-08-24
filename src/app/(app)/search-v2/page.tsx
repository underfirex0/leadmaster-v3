'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Building2, Users2, Wallet, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, ShieldCheck, UserRound, Calendar, Banknote, Sparkles, ArrowRight,
  Tag, ListChecks, Phone, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_GROUPS, EFFECTIF_TRANCHES, CAPITAL_TRANCHES, type FieldGroupId } from '@/lib/constants'

interface TaxActivite { id: number; activite: string; count: number }
interface TaxDomaine { domaine: string; totalCount: number; activites: TaxActivite[] }
interface TaxSector { sector: string; totalCount: number; domaines: TaxDomaine[] }
interface CityRow { city: string; count: number }

const STEPS = [
  { n: 0, label: 'Nom', icon: Tag },
  { n: 1, label: 'Où', icon: MapPin },
  { n: 2, label: 'Quoi', icon: Building2 },
  { n: 3, label: 'Profil', icon: Users2 },
  { n: 4, label: 'Champs', icon: Wallet },
  { n: 5, label: 'Confirmer', icon: CheckCircle2 },
]

const FIELD_ICONS: Record<string, React.ElementType> = {
  basic: Building2, phone: Phone, address: MapPin, website: Globe,
  ice: ShieldCheck, annee_creation: Calendar, director: UserRound,
  effectif: Users2, capital: Banknote,
}

function ScopeToggle({ allLabel, specificLabel, isSpecific, onChange }: {
  allLabel: string; specificLabel: string; isSpecific: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
      <button onClick={() => onChange(false)}
        className={cn('px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors',
          !isSpecific ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
        {allLabel}
      </button>
      <button onClick={() => onChange(true)}
        className={cn('px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors',
          isSpecific ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
        {specificLabel}
      </button>
    </div>
  )
}

export default function SearchWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [queryName, setQueryName] = useState('')
  const [cityScopeSpecific, setCityScopeSpecific] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [availableCities, setAvailableCities] = useState<CityRow[]>([])

  const [tree, setTree] = useState<TaxSector[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [taxSearch, setTaxSearch] = useState('')
  const [selectedTaxIds, setSelectedTaxIds] = useState<Set<number>>(new Set())
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set())

  const [effectifScopeSpecific, setEffectifScopeSpecific] = useState(false)
  const [effectifTranches, setEffectifTranches] = useState<string[]>([])
  const [capitalScopeSpecific, setCapitalScopeSpecific] = useState(false)
  const [capitalTranches, setCapitalTranches] = useState<string[]>([])

  const [selectedFields, setSelectedFields] = useState<Set<FieldGroupId>>(new Set(['basic']))
  const [maxCompanies, setMaxCompanies] = useState(50)

  const [liveCount, setLiveCount] = useState<number | null>(null)
  const [liveCost, setLiveCost] = useState<number | null>(null)
  const [fieldCoverage, setFieldCoverage] = useState<Record<string, number>>({})
  const [balance, setBalance] = useState<number | null>(null)
  const [freeTrialEligible, setFreeTrialEligible] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef = useRef(0)

  const effectiveCities = cityScopeSpecific ? cities : []
  const effectiveEffectifs = effectifScopeSpecific ? effectifTranches : []
  const effectiveCapitalTranches = capitalScopeSpecific ? capitalTranches : []

  const capitalMin = effectiveCapitalTranches.length === 0 ? undefined :
    Math.min(...effectiveCapitalTranches.map(v => CAPITAL_TRANCHES.find(t => t.value === v)!.min))
  const capitalMax = effectiveCapitalTranches.length === 0 ? undefined :
    (effectiveCapitalTranches.some(v => CAPITAL_TRANCHES.find(t => t.value === v)!.max === null) ? undefined :
      Math.max(...effectiveCapitalTranches.map(v => CAPITAL_TRANCHES.find(t => t.value === v)!.max as number)))

  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(setAvailableCities)
  }, [])

  useEffect(() => {
    setTreeLoading(true)
    const params = effectiveCities.length ? `?cities=${effectiveCities.map(encodeURIComponent).join(',')}` : ''
    fetch(`/api/taxonomy${params}`).then(r => r.json()).then(d => { setTree(d); setTreeLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityScopeSpecific, cities.join(',')])

  const runEstimate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setEstimating(true)
    debounceRef.current = setTimeout(async () => {
      const myId = ++reqIdRef.current
      try {
        const res = await fetch('/api/search/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taxonomyIds: [...selectedTaxIds],
            cities: effectiveCities,
            name: queryName,
            effectifTranches: effectiveEffectifs,
            capitalMin, capitalMax,
            fields: [...selectedFields],
            limit: maxCompanies,
          }),
        })
        if (reqIdRef.current !== myId) return
        const data = await res.json()
        setLiveCount(data.count ?? 0)
        setLiveCost(data.estimatedCost ?? 0)
        setFieldCoverage(data.fieldCoverage ?? {})
        setBalance(data.balance ?? null)
        setFreeTrialEligible(data.freeTrialEligible ?? false)
      } finally {
        if (reqIdRef.current === myId) setEstimating(false)
      }
    }, 350)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaxIds, effectiveCities.join(','), queryName, effectiveEffectifs.join(','), capitalMin, capitalMax, selectedFields, maxCompanies])

  useEffect(() => { runEstimate() }, [runEstimate])

  function toggleField(id: FieldGroupId) {
    if (id === 'basic') return
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleTax(id: number) {
    setSelectedTaxIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const autoName = [
    effectiveCities.length ? effectiveCities.join(', ') : 'Maroc',
    selectedTaxIds.size ? `${selectedTaxIds.size} activités` : 'Toutes activités',
  ].join(' — ')

  async function launch() {
    setLaunching(true)
    setLaunchError(null)
    try {
      const res = await fetch('/api/search/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryName: queryName.trim() || autoName,
          taxonomyIds: [...selectedTaxIds],
          cities: effectiveCities,
          name: queryName,
          effectifTranches: effectiveEffectifs,
          capitalMin, capitalMax,
          fields: [...selectedFields],
          limit: maxCompanies,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setLaunchError(data.error ?? 'Erreur lors du lancement'); setLaunching(false); return }
      router.push(`/databases/${data.queryId}`)
    } catch {
      setLaunchError('Erreur réseau')
      setLaunching(false)
    }
  }

  const canGoBack = step > 0
  const canGoNext = step < 5

  const filteredTree = taxSearch.trim()
    ? tree.map(s => ({
        ...s,
        domaines: s.domaines.map(d => ({
          ...d,
          activites: d.activites.filter(a => a.activite.toLowerCase().includes(taxSearch.toLowerCase())),
        })).filter(d => d.activites.length),
      })).filter(s => s.domaines.length)
    : tree

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = step === s.n
          const done = step > s.n
          return (
            <div key={s.n} className="flex items-center flex-1">
              <div className={cn('flex flex-col items-center gap-1', i > 0 && 'flex-1')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors',
                  active ? 'bg-brand-600 text-white' : done ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400')}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn('text-[10.5px] font-semibold', active ? 'text-brand-700' : 'text-gray-400')}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('h-0.5 flex-1 mx-1', done ? 'bg-brand-300' : 'bg-gray-100')} />}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 min-h-[380px]">
        {/* STEP 0 — Name */}
        {step === 0 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Nommez votre recherche</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-5">Optionnel — un nom vous aide à la retrouver dans vos sélections.</p>
            <input value={queryName} onChange={e => setQueryName(e.target.value)} placeholder={autoName}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        )}

        {/* STEP 1 — Location */}
        {step === 1 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Où cherchez-vous ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-4">Choisissez une ou plusieurs villes, ou couvrez tout le Maroc.</p>
            <ScopeToggle allLabel="Tout le Maroc" specificLabel="Villes spécifiques" isSpecific={cityScopeSpecific} onChange={setCityScopeSpecific} />
            {cityScopeSpecific && (
              <div>
                <input value={citySearch} onChange={e => setCitySearch(e.target.value)} placeholder="Rechercher une ville..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13.5px] mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {availableCities.filter(c => c.city.toLowerCase().includes(citySearch.toLowerCase())).map(c => (
                    <label key={c.city} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <span className="flex items-center gap-2.5">
                        <input type="checkbox" checked={cities.includes(c.city)}
                          onChange={() => setCities(p => p.includes(c.city) ? p.filter(x => x !== c.city) : [...p, c.city])}
                          className="w-4 h-4 rounded accent-brand-600" />
                        <span className="text-[13px] text-gray-700">{c.city}</span>
                      </span>
                      <span className="text-[11.5px] text-gray-400">{c.count.toLocaleString('fr-FR')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Taxonomy */}
        {step === 2 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Quel secteur d&apos;activité ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-4">Laissez vide pour cibler toutes les activités.</p>
            <input value={taxSearch} onChange={e => setTaxSearch(e.target.value)} placeholder="Rechercher une activité..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13.5px] mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {treeLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredTree.map(s => (
                  <div key={s.sector}>
                    <button onClick={() => setExpandedSectors(p => { const n = new Set(p); n.has(s.sector) ? n.delete(s.sector) : n.add(s.sector); return n })}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-left">
                      <span className="text-[13px] font-semibold text-gray-800">{s.sector}</span>
                      <span className="text-[11.5px] text-gray-400">{s.totalCount.toLocaleString('fr-FR')}</span>
                    </button>
                    {expandedSectors.has(s.sector) && s.domaines.map(d => (
                      <div key={d.domaine} className="pl-4">
                        <div className="text-[11.5px] font-semibold text-gray-400 px-3 py-1">{d.domaine}</div>
                        {d.activites.map(a => (
                          <label key={a.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <span className="flex items-center gap-2.5">
                              <input type="checkbox" checked={selectedTaxIds.has(a.id)} onChange={() => toggleTax(a.id)}
                                className="w-4 h-4 rounded accent-brand-600" />
                              <span className="text-[12.5px] text-gray-600">{a.activite}</span>
                            </span>
                            <span className="text-[11px] text-gray-400">{a.count.toLocaleString('fr-FR')}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Profile */}
        {step === 3 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Profil de l&apos;entreprise</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-4">Affinez par taille ou capital social — facultatif.</p>
            <div className="mb-5">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Effectif</p>
              <ScopeToggle allLabel="Toutes tailles" specificLabel="Tranches spécifiques" isSpecific={effectifScopeSpecific} onChange={setEffectifScopeSpecific} />
              {effectifScopeSpecific && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {EFFECTIF_TRANCHES.map(t => (
                    <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={effectifTranches.includes(t)}
                        onChange={() => setEffectifTranches(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                        className="w-4 h-4 rounded accent-brand-600" />
                      <span className="text-[13px] text-gray-700">{t}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Capital social</p>
              <ScopeToggle allLabel="Tout capital" specificLabel="Tranches spécifiques" isSpecific={capitalScopeSpecific} onChange={setCapitalScopeSpecific} />
              {capitalScopeSpecific && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {CAPITAL_TRANCHES.map(t => (
                    <label key={t.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={capitalTranches.includes(t.value)}
                        onChange={() => setCapitalTranches(p => p.includes(t.value) ? p.filter(x => x !== t.value) : [...p, t.value])}
                        className="w-4 h-4 rounded accent-brand-600" />
                      <span className="text-[13px] text-gray-700">{t.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {(effectifScopeSpecific || capitalScopeSpecific) && (
              <div className="mt-5 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[12.5px] text-amber-700">
                  Ces informations ne sont pas toujours renseignées — le nombre affiché ne reflète que les entreprises où elles sont connues.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Fields */}
        {step === 4 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Quelles données débloquer ?</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-5">Le coût s&apos;actualise en direct selon ce qui est réellement disponible.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.values(FIELD_GROUPS)).map(g => {
                const Icon = FIELD_ICONS[g.id] ?? Building2
                const checked = g.id === 'basic' || selectedFields.has(g.id as FieldGroupId)
                const coverage = fieldCoverage[g.id]
                return (
                  <label key={g.id} className={cn(
                    'flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-colors',
                    checked ? 'border-brand-300 bg-brand-50/50' : 'border-gray-100 hover:border-gray-200',
                    g.id === 'basic' && 'opacity-90 cursor-default'
                  )}>
                    <input type="checkbox" checked={checked} disabled={g.id === 'basic'}
                      onChange={() => toggleField(g.id as FieldGroupId)}
                      className="w-4 h-4 rounded accent-brand-600 mt-0.5 shrink-0" />
                    <Icon className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[13px] sm:text-[13.5px] text-gray-800">{g.label}</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-brand-600 bg-white border border-brand-200 rounded-pill px-2 py-0.5 shrink-0">
                          {g.cost} cr
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-[11.5px] text-gray-400 mt-0.5">{g.description}</p>
                      {typeof coverage === 'number' && (
                        <p className={cn('text-[10.5px] sm:text-[11px] font-semibold mt-1', coverage >= 60 ? 'text-emerald-600' : coverage >= 30 ? 'text-amber-600' : 'text-red-500')}>
                          Disponible pour {coverage}% de vos résultats
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="mt-5">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Nombre d&apos;entreprises max</p>
              <div className="flex flex-wrap gap-2">
                {[10, 25, 50, 100, 500, 1000, 5000].map(n => (
                  <button key={n} onClick={() => setMaxCompanies(n)}
                    className={cn('px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors',
                      maxCompanies === n ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                    {n.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Review */}
        {step === 5 && (
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 mb-1">Vérifiez et lancez</h2>
            <p className="text-[12.5px] sm:text-[13px] text-gray-400 mb-5">Rien ne sera débité tant que vous n&apos;avez pas confirmé.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><Tag className="w-3.5 h-3.5" />Nom</span>
                <span className="text-[13px] font-semibold text-gray-800">{queryName.trim() || autoName}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Villes</span>
                <span className="text-[13px] font-semibold text-gray-800">{effectiveCities.length ? effectiveCities.join(', ') : 'Tout le Maroc'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><ListChecks className="w-3.5 h-3.5" />Activités</span>
                <span className="text-[13px] font-semibold text-gray-800">{selectedTaxIds.size || 'Toutes'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-[13px] text-gray-500 flex items-center gap-2"><Wallet className="w-3.5 h-3.5" />Champs à débloquer</span>
                <span className="text-[13px] font-semibold text-gray-800">{[...selectedFields].map(f => FIELD_GROUPS[f].label).join(', ')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-100">
                <span className="text-[14px] font-bold text-brand-800">Résultat</span>
                <span className="text-[14px] font-bold text-brand-800">
                  {(liveCount ?? 0).toLocaleString('fr-FR')} entreprises · {freeTrialEligible ? 'Gratuit' : `${(liveCost ?? 0).toLocaleString('fr-FR')} cr`}
                </span>
              </div>
              {balance !== null && !freeTrialEligible && (
                <div className="flex items-center justify-between px-4 text-[12.5px] text-gray-400">
                  <span>Solde après recherche</span>
                  <span className={cn('font-semibold', (balance - (liveCost ?? 0)) < 0 ? 'text-red-500' : 'text-gray-600')}>
                    {(balance - (liveCost ?? 0)).toLocaleString('fr-FR')} cr
                  </span>
                </div>
              )}
            </div>
            {launchError && <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">{launchError}</div>}
            <button onClick={launch} disabled={launching || !liveCount || estimating}
              className="w-full mt-6 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-[15px] hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {launching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              Lancer la recherche
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={!canGoBack}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[13px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-0 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        {canGoNext && (
          <button onClick={() => setStep(s => Math.min(5, s + 1))}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors">
            Continuer <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
