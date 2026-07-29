// ============================================================================
// CENTSY CLIENT LEDGER API (Expo / React Native / TypeScript)
// Typed wrappers around the Postgres ledger engine (Migration 02).
// Drop into e.g. src/lib/ledger.ts
//
// Rules this file enforces on the client side:
//   * NEVER compute a new balance in JS and write it — always call the RPC.
//   * Budget/spend queries must exclude split parents (is_split_parent=false).
//   * Every engine error carries a stable CENTSY:<CODE> prefix -> map to UI.
// ============================================================================

import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Error mapping: "CENTSY:OVERPAYMENT: payment 500 exceeds..." -> OVERPAYMENT
// ---------------------------------------------------------------------------
export type LedgerErrorCode =
  | 'UNAUTHENTICATED'
  | 'TX_NOT_FOUND'
  | 'DEBT_NOT_FOUND'
  | 'ALREADY_SPLIT'
  | 'NOT_SPLIT'
  | 'NESTED_SPLIT'
  | 'INVALID_SPLITS'
  | 'INVALID_SPLIT_COUNT'
  | 'SPLIT_SUM_MISMATCH'
  | 'SIGN_MISMATCH'
  | 'SPLIT_LOCKED'
  | 'INVALID_AMOUNT'
  | 'OVERPAYMENT'
  | 'UNKNOWN';

export class LedgerError extends Error {
  code: LedgerErrorCode;
  constructor(message: string) {
    super(message);
    const match = /CENTSY:([A-Z_]+):/.exec(message);
    this.code = (match?.[1] as LedgerErrorCode) ?? 'UNKNOWN';
    this.name = 'LedgerError';
  }
}

const USER_MESSAGES: Record<LedgerErrorCode, string> = {
  UNAUTHENTICATED:     'Your session expired. Please sign in again.',
  TX_NOT_FOUND:        "We couldn't find that transaction.",
  DEBT_NOT_FOUND:      "We couldn't find that debt.",
  ALREADY_SPLIT:       'This transaction is already split. Unsplit it first.',
  NOT_SPLIT:           'This transaction has no splits to remove.',
  NESTED_SPLIT:        'Split items can’t be split again.',
  INVALID_SPLITS:      'Each split needs an amount and a category.',
  INVALID_SPLIT_COUNT: 'Use between 2 and 20 splits.',
  SPLIT_SUM_MISMATCH:  'Your splits must add up exactly to the original amount.',
  SIGN_MISMATCH:       'All splits must be the same type (spend or income) as the original.',
  SPLIT_LOCKED:        'Unsplit this transaction before editing or deleting its parts.',
  INVALID_AMOUNT:      'Enter a valid positive amount.',
  OVERPAYMENT:         'That payment is more than the remaining balance.',
  UNKNOWN:             'Something went wrong. Please try again.',
};

export const userMessageFor = (e: unknown): string =>
  e instanceof LedgerError ? USER_MESSAGES[e.code] : USER_MESSAGES.UNKNOWN;

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new LedgerError(error.message);
  return data as T;
}

// ---------------------------------------------------------------------------
// 1. Split a transaction
// ---------------------------------------------------------------------------
export interface SplitLine {
  amount: number;              // same sign as the parent, 2dp
  category: string;
  description?: string;
}

export function splitTransaction(transactionId: string, splits: SplitLine[]) {
  // Round on the client too, so honest UIs never trip the exactness check
  const clean = splits.map(s => ({ ...s, amount: Math.round(s.amount * 100) / 100 }));
  return rpc('split_transaction', {
    p_transaction_id: transactionId,
    p_splits: clean,
  });
}

export function unsplitTransaction(transactionId: string) {
  return rpc('unsplit_transaction', { p_transaction_id: transactionId });
}

// ---------------------------------------------------------------------------
// 2. Debt payment — with idempotency so retries can't double-pay
// ---------------------------------------------------------------------------
import * as Crypto from 'expo-crypto';

export interface DebtPaymentResult {
  transaction_id: string;
  new_balance: number;
  paid_off: boolean;
  duplicate: boolean;
}

export async function recordDebtPayment(
  debtId: string,
  amount: number,
  description?: string,
): Promise<DebtPaymentResult> {
  // Generate ONE key per user intent (per button press), reuse it on retries.
  const idempotencyKey = Crypto.randomUUID();
  return rpc<DebtPaymentResult>('record_debt_payment', {
    p_debt_id: debtId,
    p_amount: Math.round(amount * 100) / 100,
    p_description: description ?? null,
    p_idempotency_key: idempotencyKey,
  });
}

export function adjustDebtBalance(debtId: string, newBalance: number, reason?: string) {
  return rpc('adjust_debt_balance', {
    p_debt_id: debtId,
    p_new_balance: Math.round(newBalance * 100) / 100,
    p_reason: reason ?? 'Manual balance correction',
  });
}

// ---------------------------------------------------------------------------
// 3. AI quota — call from your ai-advisor Edge Function BEFORE hitting the
//    Anthropic API (server-side, with the caller's JWT):
//
//    const { data } = await supabaseClient.rpc('consume_ai_query', { p_daily_limit: 10 });
//    if (!data.allowed) return new Response(JSON.stringify({ error: 'QUOTA' }), { status: 429 });
// ---------------------------------------------------------------------------
export interface QuotaResult { allowed: boolean; remaining: number; }

export const checkAiQuota = (dailyLimit = 10) =>
  rpc<QuotaResult>('consume_ai_query', { p_daily_limit: dailyLimit });

// ---------------------------------------------------------------------------
// 4. Query rule reminder: exclude split parents from ALL spend aggregations
// ---------------------------------------------------------------------------
export function monthTransactionsQuery(userId: string, monthStart: string, monthEnd: string) {
  return supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_split_parent', false)      // <- envelopes excluded; children counted
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)
    .order('transaction_date', { ascending: false });
}