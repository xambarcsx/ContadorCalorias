-- Contador de Macros: tabla de datos por usuario.
-- Se puede agregar a un proyecto de Supabase que ya uses: no toca tus otras tablas.
-- Pega todo este archivo en Supabase → SQL Editor → New query → Run.

create table if not exists public.macros_user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,  -- perfil, comidas, mediciones, rutina…
  updated_at timestamptz not null default now()
);

-- Seguridad: cada usuario solo puede ver y modificar sus propios datos.
alter table public.macros_user_data enable row level security;

drop policy if exists "leer mis datos" on public.macros_user_data;
drop policy if exists "crear mis datos" on public.macros_user_data;
drop policy if exists "actualizar mis datos" on public.macros_user_data;
drop policy if exists "borrar mis datos" on public.macros_user_data;

create policy "leer mis datos" on public.macros_user_data
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "crear mis datos" on public.macros_user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "actualizar mis datos" on public.macros_user_data
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "borrar mis datos" on public.macros_user_data
  for delete to authenticated using ((select auth.uid()) = user_id);
