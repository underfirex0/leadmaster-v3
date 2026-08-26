'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#5a63f0', '#7c87fb', '#a3adff', '#c7cdff', '#e6e9ff', '#4548dc', '#292a72']

export function StatusDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => v.toLocaleString('fr-FR')} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-gray-600 truncate">{d.name}</span>
            </span>
            <span className="font-semibold text-gray-800 shrink-0">{d.value} ({Math.round(100 * d.value / total)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendBarChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f5" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#5a63f0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AssigneeBarChart({ data }: { data: { name: string; total: number; converted: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f5" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={100} />
          <Tooltip />
          <Bar dataKey="total" fill="#c7cdff" radius={[0, 4, 4, 0]} name="Total leads" />
          <Bar dataKey="converted" fill="#5a63f0" radius={[0, 4, 4, 0]} name="Convertis" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
