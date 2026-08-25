import { createServerClient } from '@supabase/ssr'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Service-role client for authorization checks only (is_admin, feature
// gates) — deliberately bypasses RLS since these are gate decisions the
// app itself makes, not user-owned data reads that should be subject to
// row policies. Edge-runtime compatible (supabase-js is fetch-based).
const supabaseAuthCheck = createRawClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAuthCheck.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
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
  '/account', '/databases', '/admin',
]
const AUTH_PREFIXES = ['/login', '/register']

// NOTE on CVE-2025-29927 (middleware authorization bypass, fixed in
// 14.2.25): we're on 14.2.35, past the patched version, so the
// x-middleware-subrequest bypass itself is closed at the framework
// level. Even so, this middleware is treated as a UX/redirect layer,
// not the sole authorization boundary — every API route and server
// component below independently re-checks supabase.auth.getUser()
// and RLS is enabled on every table. Middleware being bypassed (by a
// future framework bug or misconfiguration) should never be the only
// thing standing between a request and someone else's data.
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
    const feature = matchFeature(pathname)
    if (feature) {
      const isAdmin = await checkIsAdmin(user.id)
      if (!isAdmin) {
        const { data: access } = await supabase
          .from('user_feature_access').select('enabled')
          .eq('user_id', user.id).eq('feature', feature).maybeSingle()
        if (access && access.enabled === false) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Fonctionnalité désactivée pour ce compte.', feature }, { status: 403 })
          }
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          url.searchParams.set('blocked', feature)
          return NextResponse.redirect(url)
        }
      }
    }
  }

  // Admin routes: require is_admin, independent of the feature-gate system above.
  // Uses the service-role client here specifically, bypassing RLS — this is an
  // authorization decision, not a data read the person should be filtered by,
  // so it must never be affected by an RLS policy misbehaving.
  if (user && pathname.startsWith('/admin')) {
    const isAdmin = await checkIsAdmin(user.id)
    if (!isAdmin) {
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
