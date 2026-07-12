-- =============================================================================
-- Summarify V3 — idioma del resumen guardado
-- =============================================================================
-- Como correrlo: dashboard de Supabase > SQL Editor > New query > pegar todo
-- este archivo > Run. Es seguro volver a correrlo (add column if not exists +
-- drop/create del constraint), por si necesitas aplicarlo de nuevo.
--
-- Esta migracion es aditiva: no toca la tabla, las policies de RLS ni el
-- historial que ya existen desde V2. Solo agrega una columna nueva para que
-- el historial sepa en que idioma se genero cada resumen guardado (y con
-- que voz de Text-to-Speech debe leerse al recargarlo).
-- =============================================================================

begin;

alter table public.documents
  add column if not exists summary_language text not null default 'es';

-- drop + add (en vez de "add constraint if not exists", que no existe en
-- Postgres) para que este script se pueda re-ejecutar sin errores.
alter table public.documents
  drop constraint if exists documents_summary_language_check;

alter table public.documents
  add constraint documents_summary_language_check
  check (summary_language in ('es', 'en'));

commit;
