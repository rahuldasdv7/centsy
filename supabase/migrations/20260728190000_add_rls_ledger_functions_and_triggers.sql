-- ============================================================
-- Migration: RLS policies, SECURITY DEFINER ledger functions,
-- and the triggers/event triggers that bind them.
--
-- Captures state that existed live in Supabase but was never
-- committed to git. Verified against the live project via:
--   - pg_policies (RLS policies)
--   - pg_proc / pg_get_functiondef (function bodies)
--   - information_schema.triggers (table triggers)
--   - pg_event_trigger (event triggers)
--   - pg_trigger joined against auth.users (handle_new_user)
--
-- Safe to re-run: policies are dropped before recreation,
-- functions use CREATE OR REPLACE, triggers are dropped before
-- recreation, RLS enable is a no-op if already enabled.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enable Row Level Security on tables
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.transactions enable row level security;

-- ------------------------------------------------------------
-- 2. RLS Policies
-- ------------------------------------------------------------

-- profiles
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  as permissive
  for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  as permissive
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  as permissive
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- debts
drop policy if exists debts_delete_own on public.debts;
create policy debts_delete_own
  on public.debts
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists debts_insert_own on public.debts;
create policy debts_insert_own
  on public.debts
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists debts_select_own on public.debts;
create policy debts_select_own
  on public.debts
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists debts_update_own on public.debts;
create policy debts_update_own
  on public.debts
  as permissive
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- transactions
drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own
  on public.transactions
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
  on public.transactions
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
  on public.transactions
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own
  on public.transactions
  as permissive
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 3. Functions (verbatim from pg_get_functiondef)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.adjust_debt_balance(p_debt_id uuid, p_new_balance numeric, p_reason text DEFAULT 'Manual balance correction'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_debt public.debts%ROWTYPE;
v_new numeric(12,2) := round(p_new_balance, 2);
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'CENTSY:UNAUTHENTICATED: no authenticated user'
USING ERRCODE = '28000';
END IF;

IF v_new IS NULL OR v_new < 0 THEN
RAISE EXCEPTION 'CENTSY:INVALID_AMOUNT: balance must be zero or positive'
USING ERRCODE = '22023';
END IF;

SELECT * INTO v_debt
FROM public.debts
WHERE id = p_debt_id AND user_id = v_uid
FOR UPDATE;

IF NOT FOUND THEN
RAISE EXCEPTION 'CENTSY:DEBT_NOT_FOUND: debt does not exist or is not yours'
USING ERRCODE = 'P0002';
END IF;

UPDATE public.debts SET balance = v_new WHERE id = v_debt.id;

RETURN jsonb_build_object(
'debt_id', v_debt.id,
'old_balance', v_debt.balance,
'new_balance', v_new,
'reason', p_reason
);
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_ai_query(p_daily_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_new_count int;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'CENTSY:UNAUTHENTICATED: no authenticated user'
USING ERRCODE = '28000';
END IF;

UPDATE public.profiles
SET ai_queries_today = CASE WHEN ai_queries_date = CURRENT_DATE
THEN ai_queries_today + 1 ELSE 1 END,
ai_queries_date = CURRENT_DATE
WHERE id = v_uid
AND (ai_queries_date <> CURRENT_DATE OR ai_queries_today < p_daily_limit)
RETURNING ai_queries_today INTO v_new_count;

IF NOT FOUND THEN
RETURN jsonb_build_object('allowed', false, 'remaining', 0);
END IF;

RETURN jsonb_build_object(
'allowed', true,
'remaining', greatest(p_daily_limit - v_new_count, 0)
);
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
insert into public.profiles (id, full_name)
values (new.id, new.raw_user_meta_data->>'full_name');
return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_debt_payment(p_debt_id uuid, p_amount numeric, p_description text DEFAULT NULL::text, p_idempotency_key uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_debt public.debts%ROWTYPE;
v_amount numeric(12,2);
v_tx_id uuid;
v_new_balance numeric(12,2);
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'CENTSY:UNAUTHENTICATED: no authenticated user'
USING ERRCODE = '28000';
END IF;

v_amount := round(p_amount, 2);
IF v_amount IS NULL OR v_amount <= 0 THEN
RAISE EXCEPTION 'CENTSY:INVALID_AMOUNT: payment must be a positive amount'
USING ERRCODE = '22023';
END IF;

-- Idempotency: if this exact payment was already recorded (network retry),
-- return the original result instead of double-charging the ledger.
IF p_idempotency_key IS NOT NULL THEN
SELECT t.id INTO v_tx_id
FROM public.transactions t
WHERE t.user_id = v_uid AND t.id = p_idempotency_key;
IF FOUND THEN
SELECT balance INTO v_new_balance FROM public.debts
WHERE id = p_debt_id AND user_id = v_uid;
RETURN jsonb_build_object(
'transaction_id', v_tx_id,
'new_balance', v_new_balance,
'duplicate', true
);
END IF;
END IF;

-- Row lock: the heart of the concurrency fix
SELECT * INTO v_debt
FROM public.debts
WHERE id = p_debt_id AND user_id = v_uid
FOR UPDATE;

IF NOT FOUND THEN
RAISE EXCEPTION 'CENTSY:DEBT_NOT_FOUND: debt does not exist or is not yours'
USING ERRCODE = 'P0002';
END IF;

IF v_amount > v_debt.balance THEN
RAISE EXCEPTION 'CENTSY:OVERPAYMENT: payment % exceeds remaining balance %',
v_amount, v_debt.balance
USING ERRCODE = '23514';
END IF;

-- Ledger entry (negative = money out), then the balance decrement.
-- Both succeed or both roll back — they can never diverge.
INSERT INTO public.transactions
(id, user_id, amount, category, description, transaction_date)
VALUES
(coalesce(p_idempotency_key, gen_random_uuid()),
v_uid, -v_amount, 'Debt Payment',
coalesce(p_description, 'Payment: ' || v_debt.name), CURRENT_DATE)
RETURNING id INTO v_tx_id;

UPDATE public.debts
SET balance = balance - v_amount
WHERE id = v_debt.id
RETURNING balance INTO v_new_balance;

RETURN jsonb_build_object(
'transaction_id', v_tx_id,
'new_balance', v_new_balance,
'paid_off', v_new_balance = 0,
'duplicate', false
);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
cmd record;
BEGIN
FOR cmd IN
SELECT *
FROM pg_event_trigger_ddl_commands()
WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
AND object_type IN ('table','partitioned table')
LOOP
IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
BEGIN
EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
EXCEPTION
WHEN OTHERS THEN
RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
END;
ELSE
RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
END IF;
END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.split_transaction(p_transaction_id uuid, p_splits jsonb)
RETURNS SETOF transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_parent public.transactions%ROWTYPE;
v_split jsonb;
v_amount numeric(12,2);
v_category text;
v_sum numeric(12,2) := 0;
v_count int;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'CENTSY:UNAUTHENTICATED: no authenticated user'
USING ERRCODE = '28000';
END IF;

IF p_splits IS NULL OR jsonb_typeof(p_splits) <> 'array' THEN
RAISE EXCEPTION 'CENTSY:INVALID_SPLITS: p_splits must be a JSON array'
USING ERRCODE = '22023';
END IF;

v_count := jsonb_array_length(p_splits);
IF v_count < 2 OR v_count > 20 THEN
RAISE EXCEPTION 'CENTSY:INVALID_SPLIT_COUNT: need 2–20 splits, got %', v_count
USING ERRCODE = '22023';
END IF;

SELECT * INTO v_parent
FROM public.transactions
WHERE id = p_transaction_id AND user_id = v_uid
FOR UPDATE;

IF NOT FOUND THEN
RAISE EXCEPTION 'CENTSY:TX_NOT_FOUND: transaction does not exist or is not yours'
USING ERRCODE = 'P0002';
END IF;

IF v_parent.is_split_parent THEN
RAISE EXCEPTION 'CENTSY:ALREADY_SPLIT: unsplit this transaction first'
USING ERRCODE = '23505';
END IF;

IF v_parent.parent_id IS NOT NULL THEN
RAISE EXCEPTION 'CENTSY:NESTED_SPLIT: a split child cannot be split again'
USING ERRCODE = '23514';
END IF;

FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
LOOP
BEGIN
v_amount := round((v_split->>'amount')::numeric, 2);
EXCEPTION WHEN others THEN
RAISE EXCEPTION 'CENTSY:INVALID_SPLITS: each split needs a numeric "amount"'
USING ERRCODE = '22023';
END;

v_category := trim(coalesce(v_split->>'category', ''));

IF v_amount = 0 THEN
RAISE EXCEPTION 'CENTSY:INVALID_SPLITS: split amounts must be non-zero'
USING ERRCODE = '22023';
END IF;
IF sign(v_amount) <> sign(v_parent.amount) THEN
RAISE EXCEPTION 'CENTSY:SIGN_MISMATCH: split amounts must match the parent''s sign'
USING ERRCODE = '22023';
END IF;
IF v_category = '' THEN
RAISE EXCEPTION 'CENTSY:INVALID_SPLITS: each split needs a non-empty "category"'
USING ERRCODE = '22023';
END IF;

v_sum := v_sum + v_amount;
END LOOP;

IF v_sum <> v_parent.amount THEN
RAISE EXCEPTION 'CENTSY:SPLIT_SUM_MISMATCH: splits total % but transaction is %',
v_sum, v_parent.amount
USING ERRCODE = '23514';
END IF;

UPDATE public.transactions
SET is_split_parent = true
WHERE id = v_parent.id;

RETURN QUERY
INSERT INTO public.transactions
(user_id, amount, category, description, transaction_date, parent_id)
SELECT
v_uid,
round((s->>'amount')::numeric, 2),
trim(s->>'category'),
nullif(trim(coalesce(s->>'description', '')), ''),
v_parent.transaction_date,
v_parent.id
FROM jsonb_array_elements(p_splits) AS s
RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_protect_split_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
v_parent_is_split boolean;
BEGIN
IF TG_OP = 'UPDATE' THEN
IF OLD.is_split_parent AND NEW.amount <> OLD.amount THEN
RAISE EXCEPTION 'CENTSY:SPLIT_LOCKED: unsplit this transaction before changing its amount'
USING ERRCODE = '23514';
END IF;
IF OLD.parent_id IS NOT NULL AND NEW.amount <> OLD.amount THEN
RAISE EXCEPTION 'CENTSY:SPLIT_LOCKED: split children amounts are fixed; unsplit and re-split instead'
USING ERRCODE = '23514';
END IF;
RETURN NEW;
END IF;

IF TG_OP = 'DELETE' THEN
IF OLD.parent_id IS NOT NULL THEN
SELECT is_split_parent INTO v_parent_is_split
FROM public.transactions WHERE id = OLD.parent_id;
IF coalesce(v_parent_is_split, false) THEN
RAISE EXCEPTION 'CENTSY:SPLIT_LOCKED: delete splits via unsplit_transaction, not row-by-row'
USING ERRCODE = '23514';
END IF;
END IF;
RETURN OLD;
END IF;

RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
NEW.updated_at := now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unsplit_transaction(p_transaction_id uuid)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_parent public.transactions%ROWTYPE;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'CENTSY:UNAUTHENTICATED: no authenticated user'
USING ERRCODE = '28000';
END IF;

SELECT * INTO v_parent
FROM public.transactions
WHERE id = p_transaction_id AND user_id = v_uid
FOR UPDATE;

IF NOT FOUND THEN
RAISE EXCEPTION 'CENTSY:TX_NOT_FOUND: transaction does not exist or is not yours'
USING ERRCODE = 'P0002';
END IF;

IF NOT v_parent.is_split_parent THEN
RAISE EXCEPTION 'CENTSY:NOT_SPLIT: this transaction has no splits'
USING ERRCODE = 'P0002';
END IF;

UPDATE public.transactions SET is_split_parent = false WHERE id = v_parent.id;
DELETE FROM public.transactions WHERE parent_id = v_parent.id AND user_id = v_uid;

SELECT * INTO v_parent FROM public.transactions WHERE id = v_parent.id;
RETURN v_parent;
END;
$function$;

-- ------------------------------------------------------------
-- 4. Table triggers (bind the trigger functions above)
-- ------------------------------------------------------------

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at_debts on public.debts;
create trigger set_updated_at_debts
  before update on public.debts
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at_transactions on public.transactions;
create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.tg_set_updated_at();

-- Single trigger firing on both UPDATE and DELETE (verified via
-- information_schema.triggers: one trigger name, two event rows)
drop trigger if exists protect_split_integrity on public.transactions;
create trigger protect_split_integrity
  before update or delete on public.transactions
  for each row execute function public.tg_protect_split_integrity();

-- handle_new_user: creates a profiles row on signup. Lives on
-- auth.users, not a public-schema table — confirmed via pg_trigger
-- (tgname = on_auth_user_created, tgrelid = auth.users, tgtype = 5
-- i.e. ROW + INSERT, no BEFORE bit => AFTER INSERT).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5. Event trigger (auto-enable RLS on new public tables)
-- ------------------------------------------------------------

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();
