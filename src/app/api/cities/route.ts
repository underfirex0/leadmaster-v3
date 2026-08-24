export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAvailableCities } from '@/lib/companies'

export async function GET() {
  try {
    const cities = await getAvailableCities()
    return NextResponse.json(cities, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('cities route error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
