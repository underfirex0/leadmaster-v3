import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. SERVER-SIDE ONLY.
// Never import this file from a 'use client' component.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Fails loudly at boot in dev rather than silently at request time.
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set — supabaseAdmin calls will fail.')
  }
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
