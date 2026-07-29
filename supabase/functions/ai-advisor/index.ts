import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FREE_DAILY_LIMIT = 3;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401 });
    }

    // Service-role client for admin ops (reading profile, calling RPC)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // User-scoped client — needed so consume_ai_query sees the right auth.uid()
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }
    const userId = userData.user.id;

    // Parse message first — fail fast on bad input
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400 });
    }

    // ---- Atomic quota check via RPC (Migration 02) ----
    // This replaces the old direct .update() on ai_queries_today which
    // Migration 01 revoked. The RPC handles date-reset + increment atomically.
    const { data: quota, error: quotaError } = await userClient.rpc('consume_ai_query', {
      p_daily_limit: FREE_DAILY_LIMIT,
    });

    if (quotaError) {
      return new Response(JSON.stringify({ error: quotaError.message }), { status: 500 });
    }

    if (!quota?.allowed) {
      return new Response(
        JSON.stringify({
          error: `Daily limit reached (${FREE_DAILY_LIMIT} questions/day on the free plan).`,
        }),
        { status: 429 }
      );
    }

    // ---- Build financial snapshot for context ----
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    const { data: debts } = await adminClient
      .from('debts')
      .select('*')
      .eq('user_id', userId);

    const { data: transactions } = await adminClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_split_parent', false)       // ← exclude split envelopes
      .order('transaction_date', { ascending: false })
      .limit(20);

    const totalDebt = (debts || []).reduce((sum: number, d: any) => sum + Number(d.balance), 0);

    const snapshot = `
User: ${profile.full_name || 'friend'}.
Monthly take-home income: $${profile.monthly_income || 0}.
Budget split: ${profile.needs_pct}% needs / ${profile.wants_pct}% wants / ${profile.save_pct}% save.
Total debt across ${debts?.length || 0} accounts: $${totalDebt.toFixed(2)}.
Recent transactions (last 20): ${JSON.stringify(
      transactions?.map((t: any) => ({
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.transaction_date,
      }))
    )}.
    `.trim();

    const SYSTEM_PROMPT = `You are Centsy's AI financial advisor. You ONLY discuss the user's personal finances: budgeting, debt payoff, saving, and spending habits, using the data snapshot provided below. Politely decline anything unrelated to personal finance. Be encouraging, concise, and practical. Never give specific tax, legal, or investment advice beyond general education — recommend a licensed professional for those.

User's financial snapshot:
${snapshot}`;

    // ---- Call Claude ----
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      }),
    });

    const result = await response.json();
    const reply = result?.content?.[0]?.text || 'Sorry, I had trouble responding. Try again.';

    return new Response(
      JSON.stringify({ reply, queriesRemaining: quota.remaining }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});