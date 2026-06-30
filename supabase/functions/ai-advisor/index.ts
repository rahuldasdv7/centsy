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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user's token and get their ID
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }
    const userId = userData.user.id;

    // Fetch profile for usage limit + financial snapshot
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    // Reset daily counter if it's a new day
    const today = new Date().toISOString().slice(0, 10);
    let queriesToday = profile.ai_queries_today;
    if (profile.ai_queries_date !== today) {
      queriesToday = 0;
    }

    if (!profile.premium && queriesToday >= FREE_DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Daily limit reached (${FREE_DAILY_LIMIT} questions/day on the free plan).` }),
        { status: 429 }
      );
    }

    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400 });
    }

    // Build a financial snapshot so the AI has real context, not generic advice
    const { data: debts } = await supabase.from('debts').select('*').eq('user_id', userId);
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(20);

    const totalDebt = (debts || []).reduce((sum, d) => sum + Number(d.balance), 0);
    const snapshot = `
User: ${profile.full_name || 'friend'}.
Monthly take-home income: $${profile.monthly_income || 0}.
Budget split: ${profile.needs_pct}% needs / ${profile.wants_pct}% wants / ${profile.save_pct}% save.
Total debt across ${debts?.length || 0} accounts: $${totalDebt}.
Recent transactions (last 20): ${JSON.stringify(transactions?.map(t => ({ amount: t.amount, category: t.category, description: t.description })))}.
    `.trim();

    const SYSTEM_PROMPT = `You are Centsy's AI financial advisor. You ONLY discuss the user's personal finances: budgeting, debt payoff, saving, and spending habits, using the data snapshot provided below. Politely decline anything unrelated to personal finance. Be encouraging, concise, and practical. Never give specific tax, legal, or investment advice beyond general education — recommend a licensed professional for those.

User's financial snapshot:
${snapshot}`;

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

    // Increment usage counter
    await supabase
      .from('profiles')
      .update({ ai_queries_today: queriesToday + 1, ai_queries_date: today })
      .eq('id', userId);

    return new Response(JSON.stringify({ reply, queriesRemaining: FREE_DAILY_LIMIT - (queriesToday + 1) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});