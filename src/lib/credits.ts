import { supabaseAdmin } from '@/lib/supabase/admin'

// ═══════════════════════════════════════════════════════════
// All credit balance changes go through here — never a bare
// UPDATE profiles SET credit_balance = ... scattered across routes.
// One place to guarantee: balance never goes negative from a race,
// every change is logged to credit_transactions, and balance_after
// is always the value actually committed (read-modify-write done
// via a single atomic RPC, not read-then-write from the app layer).
// ═══════════════════════════════════════════════════════════

export type CreditReason = 'unlock' | 'pack_purchase' | 'plan_renewal' | 'refund' | 'free_trial' | 'admin_grant'

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Solde insuffisant: ${available} cr disponibles, ${required} cr requis`)
  }
}

// Debits credits atomically via a Postgres function (see
// schema_v3_full.sql's `spend_credits` — must run with
// `FOR UPDATE` row locking so two simultaneous unlocks on the same
// account can't both read a stale balance and overdraw it).
export async function spendCredits(userId: string, amount: number, reason: CreditReason, referenceId?: string): Promise<number> {
  if (amount <= 0) throw new Error('spendCredits: amount must be positive')
  const { data, error } = await supabaseAdmin.rpc('spend_credits', {
    p_user_id: userId, p_amount: amount, p_reason: reason, p_reference_id: referenceId ?? null,
  })
  if (error) {
    if (error.message?.includes('insufficient_credits')) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', userId).single()
      throw new InsufficientCreditsError(amount, profile?.credit_balance ?? 0)
    }
    throw error
  }
  return data as number  // new balance
}

export async function grantCredits(userId: string, amount: number, reason: CreditReason, referenceId?: string): Promise<number> {
  if (amount <= 0) throw new Error('grantCredits: amount must be positive')
  const { data, error } = await supabaseAdmin.rpc('grant_credits', {
    p_user_id: userId, p_amount: amount, p_reason: reason, p_reference_id: referenceId ?? null,
  })
  if (error) throw error
  return data as number
}

export async function getBalance(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', userId).single()
  if (error) throw error
  return data?.credit_balance ?? 0
}
