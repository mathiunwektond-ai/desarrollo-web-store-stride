-- ============================================================
-- SISTEMA INVENTARIO & POS — Supabase (PostgreSQL)
-- Ejecutar todo en Supabase → SQL Editor
-- ============================================================

-- 1. Extensión UUID
create extension if not exists "pgcrypto";

-- 2. Enum de roles
do $$ begin
  create type user_role as enum ('admin','jefe','administracion','vendedor');
exception when duplicate_object then null; end $$;

-- 3. Tabla: profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  role user_role not null default 'vendedor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Tabla: products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique not null,
  name text not null,
  price_per_kg numeric not null default 0,
  stock_kg numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_barcode on public.products (barcode);

-- 5. Tabla: sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  total_amount numeric not null default 0,
  payment_method text not null default 'Efectivo',
  created_at timestamptz not null default now()
);

-- 6. Tabla: sale_items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  weight_sold_kg numeric not null default 0,
  price_per_kg_at_sale numeric not null default 0,
  subtotal numeric not null default 0
);

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- Crea perfil automático al crear usuario en auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'vendedor');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ACTIVAR RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- ============================================================
-- POLÍTICAS
-- ============================================================

-- PROFILES: el usuario ve/edita su propio perfil; admin gestiona todos
create policy "usuarios_leer_propio_perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "admin_gestiona_usuarios" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- PRODUCTS: todos ven; admin/jefe escriben; vendedor solo descuenta stock
create policy "usuarios_leer_productos" on public.products
  for select using (auth.uid() is not null);

create policy "admin_jefe_escriben_productos" on public.products
  for all using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','jefe') and p.is_active)
  ) with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','jefe') and p.is_active)
  );

create policy "vendedor_actualiza_stock" on public.products
  for update using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'vendedor' and p.is_active)
  );

-- SALES
create policy "usuarios_leer_ventas" on public.sales
  for select using (auth.uid() is not null);

create policy "venta_insert" on public.sales
  for insert with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','jefe','vendedor') and p.is_active)
  );

-- SALE_ITEMS
create policy "sale_items_insert" on public.sale_items
  for insert with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','jefe','vendedor') and p.is_active)
  );

create policy "usuarios_leer_sale_items" on public.sale_items
  for select using (auth.uid() is not null);

-- ============================================================
-- PRIMER ADMIN (ejecutar tras crear el usuario en Authentication)
-- Reemplaza TU_USER_ID por el UUID del usuario
-- ============================================================
-- update public.profiles set role = 'admin' where id = 'TU_USER_ID';

-- ============================================================
-- DATOS DE EJEMPLO (opcional)
-- ============================================================
insert into public.products (barcode, name, price_per_kg, stock_kg) values
('7791001001001', 'Pierna de Pavo', 22.50, 40),
('7791001001002', 'Chuleta de Cerdo', 18.00, 25),
('7791001001003', 'Gallina', 12.00, 30),
('7791001001004', 'Mondongo', 15.00, 10);
