alter table public.profiles
  add column ai_queries_today integer default 0,
  add column ai_queries_date date default current_date;