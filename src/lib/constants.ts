// ═══════════════════════════════════════════════════════════
// Business model constants — field pricing, plans, packs.
// Single source of truth; every route and page imports from here,
// nothing hardcodes a price or a column list.
// ═══════════════════════════════════════════════════════════

export const FIELD_GROUPS = {
  basic: {
    id: 'basic', label: 'Profil de base', cost: 1, required: true,
    columns: ['name', 'city', 'sector', 'domaine', 'activite', 'forme_juridique'],
    coverageKey: null,  // always 100%, never metered
    description: 'Raison sociale · Ville · Secteur · Activité · Forme juridique',
    icon: 'building2',
  },
  phone: {
    id: 'phone', label: 'Téléphone', cost: 1,
    columns: ['phone_1', 'phone_2'],
    coverageKey: 'phone_coverage' as const,
    description: 'Téléphone fixe + mobile', icon: 'phone',
  },
  website: {
    id: 'website', label: 'Site web', cost: 1,
    columns: ['website'],
    coverageKey: 'website_coverage' as const,
    description: 'URL du site internet', icon: 'globe',
  },
  address: {
    id: 'address', label: 'Adresse complète', cost: 1,
    columns: ['address_raw', 'latitude', 'longitude'],
    coverageKey: null,   // no dedicated address_coverage column; not metered
    description: 'Adresse + coordonnées GPS', icon: 'map-pin',
  },
  ice: {
    id: 'ice', label: 'ICE', cost: 2,
    columns: ['ice', 'rc'],
    coverageKey: 'ice_coverage' as const,
    description: 'Identifiant fiscal + RC', icon: 'shield-check',
  },
  annee_creation: {
    id: 'annee_creation', label: 'Année création', cost: 2,
    columns: ['annee_creation'],
    coverageKey: null,
    description: 'Année de création de la société', icon: 'calendar',
  },
  director: {
    id: 'director', label: 'Nom dirigeant', cost: 2,
    columns: ['director'],
    coverageKey: 'director_coverage' as const,
    description: 'Nom du gérant / dirigeant', icon: 'user-round',
  },
  effectif: {
    id: 'effectif', label: 'Effectif', cost: 2,
    columns: ['effectif_tranche'],
    coverageKey: 'effectif_coverage' as const,
    description: 'Tranche de salariés', icon: 'users2',
  },
  capital: {
    id: 'capital', label: 'Capital social', cost: 5,
    columns: ['capital_mad'],
    coverageKey: 'capital_coverage' as const,
    description: 'Montant du capital social', icon: 'banknote',
  },
} as const

// NOTE: email deliberately excluded — the source dataset has 0% email
// coverage (verified against companies_master.csv). No point charging
// for or displaying a field that never has data. Website coverage is
// real but very low (~0.3%) — kept as a field but expect it to almost
// always show "indisponible".

export type FieldGroupId = keyof typeof FIELD_GROUPS
export const ALL_FIELD_IDS = Object.keys(FIELD_GROUPS) as FieldGroupId[]
export const FIELD_COST = (id: FieldGroupId): number => FIELD_GROUPS[id].cost

export const PREVIEW_COLUMNS = ['name', 'city', 'sector', 'domaine', 'activite'] as const

export const FREE_TRIAL_LIMIT = 100
export const FREE_TRIAL_FIELDS: FieldGroupId[] = ['basic']

export const EFFECTIF_TRANCHES = [
  'De 1 à 9 salariés', 'De 10 à 19 salariés', 'De 20 à 49 salariés',
  'De 50 à 99 salariés', 'De 100 à 249 salariés', 'De 250 à 499 salariés',
  'De 500 à 999 salariés', 'De 1 000 à 4 999 salariés', 'Plus de 5 000 salariés',
] as const

export const CAPITAL_TRANCHES = [
  { value: '0-100000',          label: 'Moins de 100 000 MAD',  min: 0,        max: 100000 as number | null },
  { value: '100000-500000',     label: '100 000 — 500 000 MAD', min: 100000,   max: 500000 },
  { value: '500000-1000000',    label: '500 000 — 1M MAD',      min: 500000,   max: 1000000 },
  { value: '1000000-5000000',   label: '1M — 5M MAD',           min: 1000000,  max: 5000000 },
  { value: '5000000-10000000',  label: '5M — 10M MAD',          min: 5000000,  max: 10000000 },
  { value: '10000000-50000000', label: '10M — 50M MAD',         min: 10000000, max: 50000000 },
  { value: '50000000-',         label: 'Plus de 50M MAD',       min: 50000000, max: null },
] as const

export const PLANS = {
  decouverte: { id: 'decouverte', name: 'Découverte', price: 0,   credits: 100,  maxSeats: 1,   desc: 'Essai gratuit' },
  solo:       { id: 'solo',       name: 'Solo',        price: 149, credits: 400,  maxSeats: 1,   desc: 'Indépendant' },
  equipe:     { id: 'equipe',     name: 'Équipe',      price: 390, credits: 1500, maxSeats: 3,   desc: "Jusqu'à 3 users" },
  business:   { id: 'business',   name: 'Business',    price: 990, credits: 5000, maxSeats: 10,  desc: "Jusqu'à 10 users" },
  entreprise: { id: 'entreprise', name: 'Entreprise',  price: null, credits: null, maxSeats: 999, desc: 'Sur mesure' },
} as const

export const CREDIT_PACKS = [
  { id: 'boost',     name: 'Pack Boost',     credits: 500,   price: 99 },
  { id: 'essential', name: 'Pack Essential', credits: 2000,  price: 349 },
  { id: 'growth',    name: 'Pack Growth',    credits: 5000,  price: 799 },
  { id: 'pro',       name: 'Pack Pro',       credits: 15000, price: 1990 },
] as const

export const CRM_STATUSES = [
  'to_call', 'in_progress', 'callback', 'interested', 'not_interested', 'converted', 'archived',
] as const
export type CrmStatus = (typeof CRM_STATUSES)[number]

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  to_call: 'À appeler', in_progress: 'En cours', callback: 'À rappeler',
  interested: 'Intéressé', not_interested: 'Pas intéressé',
  converted: 'Converti', archived: 'Archivé',
}

export const REFUND_REASONS = {
  closed: 'Entreprise fermée', wrong_number: 'Numéro incorrect',
  wrong_director: 'Dirigeant incorrect', wrong_address: 'Adresse incorrecte',
  not_exist: "Entreprise n'existe pas", other: 'Autre',
} as const
