-- ============================================================
-- HavalGarage — схема БД Supabase
-- Выполните этот скрипт в Supabase: SQL Editor → New query → Run.
-- ============================================================

create extension if not exists pgcrypto;

-- Расчёты-заявки кредитного калькулятора
create table if not exists public.credit_applications (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  model_id         text not null,
  model_name       text not null,
  trim_id          text,
  trim_name        text,
  vehicle_price    numeric not null,
  discount_applied numeric not null default 0,
  effective_price  numeric not null,
  down_payment     numeric not null,
  credit_amount    numeric not null,
  term_months      integer not null,
  annual_rate      numeric not null,
  monthly_payment  numeric not null,
  total_paid       numeric,
  interest_overpay numeric,
  extra_costs      numeric not null default 0,
  total_cost       numeric,
  contact_name     text,
  contact_phone    text
);

comment on table public.credit_applications is
  'Предварительные расчёты кредита из калькулятора HavalGarage (не являются одобрением)';

-- Индекс для просмотра заявок по дате
create index if not exists credit_applications_created_at_idx
  on public.credit_applications (created_at desc);

-- Row Level Security: доступ только через явные политики
alter table public.credit_applications enable row level security;

-- Публичный (publishable) ключ может создавать заявки,
-- но не может читать или изменять чужие.
drop policy if exists "public can insert applications" on public.credit_applications;
create policy "public can insert applications"
  on public.credit_applications
  for insert
  to anon, authenticated
  with check (true);

-- Просмотр заявок — только для авторизованных пользователей
-- (если подключите авторизацию в будущем).
drop policy if exists "authenticated can read applications" on public.credit_applications;
create policy "authenticated can read applications"
  on public.credit_applications
  for select
  to authenticated
  using (true);
