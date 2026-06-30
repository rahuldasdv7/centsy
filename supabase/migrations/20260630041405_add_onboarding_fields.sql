alter table public.profiles
  add column needs_pct numeric default 50,
  add column wants_pct numeric default 30,
  add column save_pct numeric default 20,
  add column emergency_fund_target numeric default 0,
  add column emergency_fund_current numeric default 0,
  add column onboarding_completed boolean default false;