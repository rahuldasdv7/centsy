-- ============================================
-- PROFILES (extends auth.users with app data)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  monthly_income numeric default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- DEBTS
-- ============================================
create table public.debts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  balance numeric not null,
  interest_rate numeric default 0,
  minimum_payment numeric default 0,
  created_at timestamptz default now()
);

alter table public.debts enable row level security;

create policy "Users can view their own debts"
  on public.debts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own debts"
  on public.debts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own debts"
  on public.debts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own debts"
  on public.debts for delete
  using (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS
-- ============================================
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric not null,
  category text not null,
  description text,
  transaction_date date default current_date,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();