import { createServerClient } from '@supabase/ssr'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Service-role client for ALL authorization checks — is_admin, paused
// status, and feature access. Deliberately bypasses RLS: these are
// gate decisions the app itself makes, not user-owned data reads that
// should be subject to row policies, and RLS reads through the normal
// cookie-bound client have proven unreliable on this project before
// (this is exactly the bug that silently made feature blocking do
// nothing — it was reading user_feature_access through the RLS client,
// which was quietly returning no data instead of the real row).
const supabaseAuthCheck = createRawClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getAuthProfile(userId: string): Promise<{ isAdmin: boolean; isPaused: boolean }> {
  const { data } = await supabaseAuthCheck.from('profiles').select('is_admin, is_paused').eq('id', userId).single()
  return { isAdmin: data?.is_admin === true, isPaused: data?.is_paused === true }
}

async function isFeatureBlocked(userId: string, feature: string): Promise<boolean> {
  const { data } = await supabaseAuthCheck.from('user_feature_access').select('enabled')
    .eq('user_id', userId).eq('feature', feature).maybeSingle()
  return data?.enabled === false
}

// Feature gates: URL prefix -> feature key that must be enabled for
// this user (checked against user_feature_access; no row = allowed).
const FEATURE_GATES: { prefix: string; feature: string }[] = [
  // Specific "spend credits" endpoints come first — they need their own
  // gate (separate from just "search") so a team owner can let someone
  // browse/search without letting them actually spend the shared balance.
  { prefix: '/api/search/execute',          feature: 'unlock' },
  { prefix: '/api/companies/unlock-fields', feature: 'unlock' },
  { prefix: '/api/upload', feature: 'data_upload' },
  { prefix: '/upload',     feature: 'data_upload' },
  { prefix: '/api/export', feature: 'export' },
  { prefix: '/api/crm',    feature: 'crm' },
  { prefix: '/crm',        feature: 'crm' },
  { prefix: '/api/search', feature: 'search' },
  { prefix: '/search',     feature: 'search' },
  { prefix: '/results',    feature: 'search' },
  { prefix: '/databases',  feature: 'search' },
]

function matchFeature(pathname: string): string | null {
  for (const gate of FEATURE_GATES) if (pathname.startsWith(gate.prefix)) return gate.feature
  return null
}

const PROTECTED_PREFIXES = [
  '/dashboard', '/search', '/results', '/wallet', '/crm', '/upload',
  '/account', '/databases', '/admin', '/kpis',
]
const AUTH_PREFIXES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthRoute = AUTH_PREFIXES.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { isAdmin, isPaused } = await getAuthProfile(user.id)

    // A paused account is blocked from everything protected — no
    // partial access, no silent failures, just a clear message.
    // Admins are exempt so support can never lock itself out.
    if (isPaused && !isAdmin && isProtected && pathname !== '/suspended') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Votre compte est suspendu.' }, { status: 403 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/suspended'
      return NextResponse.redirect(url)
    }

    if (!isPaused) {
      const feature = matchFeature(pathname)
      if (feature && !isAdmin && await isFeatureBlocked(user.id, feature)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Fonctionnalité désactivée pour ce compte.', feature }, { status: 403 })
        }
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('blocked', feature)
        return NextResponse.redirect(url)
      }
    }

    // Admin routes: require is_admin, independent of the feature-gate system above.
    if (pathname.startsWith('/admin') && !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
