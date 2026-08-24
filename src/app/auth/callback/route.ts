import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // The link was invalid/expired — surface that instead of silently
      // pretending it worked and letting the person hit a confusing
      // login-loop with no explanation.
      return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // No code at all means this route was hit without going through a real
  // confirmation link — never claim success in that case.
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
