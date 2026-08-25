import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Search, Wallet, Users2, Calendar, FileDown, ShieldCheck, Phone, MapIcon, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS, FIELD_GROUPS } from '@/lib/constants'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { data: stats } = await supabaseAdmin.from('admin_stats_catalog').select('*').single()
  const total = stats?.total_companies ?? 119000
  const phonePct = stats ? Math.round(100 * stats.with_phone / stats.total_companies) : 73
  const icePct = stats ? Math.round(100 * stats.with_ice / stats.total_companies) : 62
  const directorPct = stats ? Math.round(100 * stats.with_director / stats.total_companies) : 48

  const FEATURES = [
    { icon: Search, tag: 'Ciblage', title: 'Recherche multi-critères', desc: 'Secteur, ville, effectif, capital, raison sociale. Combinez vos filtres et voyez le nombre de résultats en temps réel, avant de payer quoi que ce soit.' },
    { icon: Wallet, tag: 'Économique', title: 'Paiement au champ débloqué', desc: 'Téléphone à 1 cr, capital social à 5 cr. Vous contrôlez exactement ce que vous payez, entreprise par entreprise.' },
    { icon: Users2, tag: 'CRM', title: 'Pipeline CRM intégré', desc: "Statuts d'appel, notes, priorités. Votre pipeline complet sans quitter LeadMaster — automatiquement, dès qu'une recherche est lancée." },
    { icon: Calendar, tag: 'Suivi', title: 'Callbacks et relances', desc: 'Programmez vos rappels et suivez chaque prospect au fil de votre pipeline, du premier contact à la conversion.' },
    { icon: FileDown, tag: 'Export', title: 'Vos données, où vous voulez', desc: "Consultez vos entreprises débloquées à tout moment dans 'Mes données', triées et prêtes à l'emploi." },
    { icon: ShieldCheck, tag: 'Anti-doublon', title: 'Zéro double facturation', desc: "Un champ déjà débloqué s'affiche automatiquement, gratuitement — la prochaine fois que vous consultez cette entreprise." },
  ]

  const TIERS = [
    { name: 'Tier 1 — Gratuit', price: 'Inclus', fields: 'Raison sociale · Secteur · Ville · Forme juridique' },
    { name: 'Tier 2 — 1 cr / entreprise', price: '1 cr', fields: [FIELD_GROUPS.phone.label, FIELD_GROUPS.website.label, FIELD_GROUPS.address.label].join(' · ') },
    { name: 'Tier 3 — 2 cr / entreprise', price: '2 cr', fields: [FIELD_GROUPS.ice.label, FIELD_GROUPS.annee_creation.label, FIELD_GROUPS.director.label, FIELD_GROUPS.effectif.label].join(' · ') },
    { name: 'Tier 4 — 5 cr / entreprise', price: '5 cr', fields: FIELD_GROUPS.capital.label },
  ]

  return (
    <div className="bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-brand-600 text-[17px]">LeadMaster</span>
          <div className="hidden sm:flex items-center gap-6 text-[13.5px] font-semibold text-gray-500">
            <a href="#features" className="hover:text-gray-900">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-gray-900">Tarification</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13.5px] font-semibold text-gray-600 hover:text-gray-900">Se connecter</Link>
            <Link href="/register" className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[13.5px] font-bold hover:bg-brand-700 transition-colors">Commencer gratuitement</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <span className="inline-block text-[12.5px] font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-pill mb-5">
          {total.toLocaleString('fr-FR')} entreprises marocaines
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">Prospectez le Maroc.<br />Avec précision.</h1>
        <p className="text-[15px] text-gray-500 max-w-xl mx-auto mb-8">
          Données B2B marocaines. Contacts directs des dirigeants quand ils sont disponibles. Payez uniquement les champs dont vous avez besoin — 1 crédit par numéro de téléphone.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/register" className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-[14.5px] hover:bg-brand-700 transition-colors">Commencer gratuitement</Link>
          <a href="#features" className="px-6 py-3 text-gray-600 font-semibold text-[14.5px] hover:text-gray-900">Voir comment ça marche</a>
        </div>
      </section>

      {/* Real stats bar */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{total.toLocaleString('fr-FR')}</div>
            <div className="text-[12.5px] text-gray-400 mt-1">Entreprises référencées</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{phonePct}%</div>
            <div className="text-[12.5px] text-gray-400 mt-1">Avec téléphone direct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{icePct}%</div>
            <div className="text-[12.5px] text-gray-400 mt-1">Avec ICE vérifié</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-[12.5px] font-bold text-brand-600 uppercase tracking-wide text-center mb-2">Comment ça marche</p>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">De la recherche au premier appel en quelques minutes.</h2>
          <p className="text-[14px] text-gray-500 text-center max-w-lg mx-auto mb-10">Pas d&apos;abonnement obligatoire. Pas de surprise. Achetez uniquement les données qui vous intéressent.</p>
          <div className="grid sm:grid-cols-3 gap-6 mb-16">
            {[
              { n: '01', title: 'Filtrez par secteur, ville, effectif', desc: 'Choisissez vos critères parmi des centaines de secteurs et de villes marocaines. Voyez le nombre de résultats avant de valider.' },
              { n: '02', title: 'Estimez le coût avant de dépenser', desc: 'Le calculateur affiche combien d\'entreprises correspondent et combien ça coûte réellement — avant de débiter un seul crédit.' },
              { n: '03', title: 'Payez uniquement ce que vous utilisez', desc: 'Téléphone = 1 cr, capital social = 5 cr. Un champ déjà débloqué n\'est jamais refacturé.' },
            ].map(s => (
              <div key={s.n}>
                <div className="text-[13px] font-bold text-brand-300 mb-2">{s.n}</div>
                <h3 className="font-bold text-[15px] text-gray-900 mb-2">{s.title}</h3>
                <p className="text-[13px] text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Tout ce qu&apos;il faut pour prospecter au Maroc.</h2>
          <p className="text-[14px] text-gray-500 text-center max-w-lg mx-auto mb-10">Plus qu&apos;une base de données — un système de prospection B2B complet.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <Icon className="w-5 h-5 text-brand-500 mb-3" />
                  <p className="text-[11px] font-bold text-brand-500 uppercase tracking-wide mb-1">{f.tag}</p>
                  <h3 className="font-bold text-[14.5px] text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-[13px] text-gray-500">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing tiers explanation */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-[12.5px] font-bold text-brand-600 uppercase tracking-wide text-center mb-2">Tarification transparente</p>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">1 crédit = 1 champ, pour 1 entreprise.</h2>
        <p className="text-[14px] text-gray-500 text-center max-w-lg mx-auto mb-10">
          Vous ne payez que pour les données que vous déverrouillez. Jamais pour une base entière. Jamais deux fois pour le même champ.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {TIERS.map(t => (
            <div key={t.name} className="bg-gray-50 rounded-2xl p-5">
              <div className="font-bold text-[14px] text-gray-900 mb-1">{t.name}</div>
              <div className="text-[13px] text-gray-500">{t.fields}</div>
            </div>
          ))}
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 text-center">
          <p className="text-[13.5px] text-brand-800">
            <strong>Exemple concret :</strong> 10 entreprises · Téléphone + ICE + Effectif = (1 + 2 + 2) × 10 = <strong>50 crédits</strong>
          </p>
        </div>
      </section>

      {/* Plans */}
      <section id="pricing" className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Commencez gratuitement. Évoluez à votre rythme.</h2>
          <p className="text-[14px] text-gray-500 text-center mb-10">Paiement par virement bancaire. Activation sous 24h.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.values(PLANS).map(p => (
              <div key={p.id} className={`bg-white rounded-2xl border p-5 text-center ${p.id === 'equipe' ? 'border-brand-300 shadow-sm' : 'border-gray-100'}`}>
                {p.id === 'equipe' && <div className="text-[10.5px] font-bold text-brand-600 mb-2">⭐ POPULAIRE</div>}
                <div className="font-bold text-[15px] text-gray-900 mb-1">{p.name}</div>
                <div className="text-[12px] text-gray-400 mb-3">{p.desc}</div>
                <div className="font-bold text-[18px] text-gray-900 mb-4">
                  {p.price === null ? 'Sur devis' : p.price === 0 ? 'Gratuit' : `${p.price} MAD/mois`}
                </div>
                <Link href="/register" className="block w-full py-2 bg-gray-900 text-white rounded-lg text-[12.5px] font-semibold hover:bg-gray-800 transition-colors">
                  {p.id === 'entreprise' ? 'Nous contacter' : 'Choisir'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Questions fréquentes</h2>
        <div className="space-y-3">
          {[
            { q: "Qu'est-ce qu'un crédit LeadMaster ?", a: "Un crédit permet de débloquer un champ de données (téléphone, ICE, dirigeant...) pour une entreprise. Le coût varie selon le champ, de 1 à 5 crédits." },
            { q: 'Suis-je facturé deux fois pour le même contact ?', a: "Non. Un champ déjà débloqué pour une entreprise s'affiche automatiquement lors de vos prochaines consultations, sans frais supplémentaires." },
            { q: 'Comment fonctionne le paiement des abonnements ?', a: 'Par virement bancaire. Activation manuelle sous 24h après réception du paiement.' },
            { q: 'Puis-je annuler à tout moment ?', a: "Les crédits achetés en pack n'expirent pas. Les abonnements peuvent être arrêtés à tout moment sans engagement." },
          ].map(item => (
            <details key={item.q} className="group bg-gray-50 rounded-2xl p-5">
              <summary className="font-semibold text-[14px] text-gray-800 cursor-pointer flex items-center justify-between">
                {item.q}
                <CheckCircle2 className="w-4 h-4 text-gray-300 group-open:text-brand-500 transition-colors" />
              </summary>
              <p className="text-[13px] text-gray-500 mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-600 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Prêt à prospecter intelligemment ?</h2>
          <p className="text-[14px] text-brand-100 mb-8">Créez votre compte et recevez 100 crédits gratuits pour commencer dès aujourd&apos;hui.</p>
          <Link href="/register" className="inline-block px-6 py-3 bg-white text-brand-700 rounded-xl font-bold text-[14.5px] hover:bg-gray-50 transition-colors">Créer mon compte gratuitement</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12.5px] text-gray-400">
        <span>LeadMaster · Maroc</span>
        <div className="flex items-center gap-2 text-gray-300">
          <Phone className="w-3.5 h-3.5" /><MapIcon className="w-3.5 h-3.5" />
          <span>© {new Date().getFullYear()} LeadMaster. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  )
}
