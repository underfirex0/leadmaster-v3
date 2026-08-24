export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getTaxonomyTree } from '@/lib/companies'

export async function GET(request: NextRequest) {
  try {
    const cities = request.nextUrl.searchParams.get('cities')
    const cityList = cities ? cities.split(',').map(decodeURIComponent) : undefined
    const tree = await getTaxonomyTree(cityList)
    return NextResponse.json(tree, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('taxonomy route error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
