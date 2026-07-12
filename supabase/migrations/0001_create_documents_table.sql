-- =============================================================================
-- Summarify V2 — historial de resumenes por usuario
-- =============================================================================
-- Como correrlo: dashboard de Supabase > SQL Editor > New query > pegar todo
-- este archivo > Run. Es seguro volver a correrlo (usa "if not exists" y
-- recrea las policies), por si necesitas aplicarlo de nuevo.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Extension necesaria para gen_random_uuid() (Supabase ya la trae en la
--    mayoria de los proyectos, pero lo dejamos explicito por las dudas).
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 2) Tabla documents
--    Un resumen generado en la app = una fila. brief_summary y
--    detailed_summary son nullable porque la UI solo genera un modo por vez.
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: si se borra el usuario de auth.users, se borran
  -- automaticamente sus documentos (evita filas huerfanas).
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  original_text text not null,
  brief_summary text,
  detailed_summary text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3) Indice recomendado
--    Cubre la consulta real de la app: "ultimos N documentos de ESTE
--    usuario, mas nuevos primero". El orden (user_id, created_at desc)
--    importa: primero filtra por usuario, despues ya viene ordenado.
-- -----------------------------------------------------------------------------
create index if not exists documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4) Row Level Security
--    Sin esto, cualquiera con la anon key podria leer/escribir TODAS las
--    filas de la tabla. Con RLS activado + estas policies, Postgres filtra
--    automaticamente: cada usuario autenticado solo ve y toca sus propias
--    filas (auth.uid() = user_id). No hace falta filtrar por user_id a mano
--    en el frontend por seguridad (igual lo hacemos, como capa extra).
-- -----------------------------------------------------------------------------
alter table public.documents enable row level security;

-- drop + create (en vez de "create policy if not exists", que no existe en
-- Postgres) para que este script se pueda re-ejecutar sin errores.
drop policy if exists "Users can view their own documents" on public.documents;
create policy "Users can view their own documents"
  on public.documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own documents" on public.documents;
create policy "Users can insert their own documents"
  on public.documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own documents" on public.documents;
create policy "Users can update their own documents"
  on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own documents" on public.documents;
create policy "Users can delete their own documents"
  on public.documents
  for delete
  using (auth.uid() = user_id);

commit;
