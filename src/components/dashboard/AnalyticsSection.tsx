'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Building2, ShieldCheck, Phone, UserRound } from 'lucide-react'

const COLORS = ['#5a63f0', '#7c87fb', '#a3adff', '#c7cdff', '#e6e9ff']

interface Slice { name: string; value: number }

function DonutCard({ title, data, total }: { title: string; data: Slice[]; total: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-[13.5px] text-gray-900 mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={54} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString('fr-FR')} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 truncate">{d.name}</span>
              </span>
              <span className="font-semibold text-gray-800 shrink-0">{Math.round(100 * d.value / total)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CoverageBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsSection({
  totalCompanies, phonePct, icePct, directorPct, effectifPct, capitalPct,
  topCities, topSectors, topLegalForms,
}: {
  totalCompanies: number; phonePct: number; icePct: number; directorPct: number; effectifPct: number; capitalPct: number
  topCities: Slice[]; topSectors: Slice[]; topLegalForms: Slice[]
}) {
  const citiesTotal = topCities.reduce((s, c) => s + c.value, 0)
  const sectorsTotal = topSectors.reduce((s, c) => s + c.value, 0)
  const legalTotal = topLegalForms.reduce((s, c) => s + c.value, 0)

  return (
    <div>
      <h2 className="font-bold text-[15px] text-gray-900 mb-3">Aperçu de la base de données</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { icon: Building2, label: 'Entreprises', value: totalCompanies.toLocaleString('fr-FR') },
          { icon: Phone, label: 'Avec téléphone', value: `${phonePct}%` },
          { icon: ShieldCheck, label: 'Avec ICE vérifié', value: `${icePct}%` },
          { icon: UserRound, label: 'Avec dirigeant', value: `${directorPct}%` },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <Icon className="w-4 h-4 text-brand-500 mb-2" />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <DonutCard title="Villes principales" data={topCities} total={citiesTotal} />
        <DonutCard title="Secteurs principaux" data={topSectors} total={sectorsTotal} />
        <DonutCard title="Formes juridiques" data={topLegalForms} total={legalTotal} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-[13.5px] text-gray-900 mb-4">Disponibilité des champs</h3>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          <CoverageBar label="Téléphone" pct={phonePct} />
          <CoverageBar label="ICE" pct={icePct} />
          <CoverageBar label="Nom du dirigeant" pct={directorPct} />
          <CoverageBar label="Effectif" pct={effectifPct} />
          <CoverageBar label="Capital social" pct={capitalPct} />
        </div>
      </div>
    </div>
  )
}
