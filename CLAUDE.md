# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server (port 5173, or $PORT if set)
npm run build     # tsc -b (typecheck) && vite build
npm run preview   # preview the production build locally
npm run lint      # oxlint
```

There is no test suite. `npm run build` is the closest thing to a CI gate — it fails on TypeScript errors, which is the main thing to check before considering a change done.

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (copy from `.env.example`) — see the "Supabase Setup" section of README.md for where to get real values. Without them, `src/lib/supabase.ts` throws on load.

## Architecture

Summarify V2 is the evolution of [`summarify`](../summarify) (V1, 100% client-side, no backend) into an app with a **real Supabase backend** — Auth (email+password) and Postgres (per-user document history). The summarisation engine itself is unchanged from V1: still a local, deterministic extractive algorithm, not an LLM call. Don't reintroduce an external summarisation API.

### Routing and auth gating

`react-router-dom` with three route groups defined in `App.tsx`:
- `PublicOnlyRoute` wraps `/login` and `/register` — redirects to `/` if a session already exists.
- `ProtectedRoute` wraps `/` (`SummarizePage`) and `/history` (`HistoryPage`) — redirects to `/login` if there's no session.

`AuthContext` (`src/contexts/AuthContext.tsx`) wraps Supabase's session (`getSession` + `onAuthStateChange`) and exposes `signIn`/`signUp`/`signOut`. `signUp` explicitly checks whether Supabase returned a session — if not, the project has "Confirm email" enabled and the UI shows a "check your inbox" state instead of assuming login succeeded.

### Data layer pattern

Strict separation, don't blur this:
- `src/lib/*.ts` — pure functions, no React state. Supabase queries live here (`documents.ts`), plus non-Supabase logic (`summarize.ts`, `pdf.ts`, `authErrors.ts`).
- `src/hooks/*.ts` — React wrappers around the `lib/` functions, owning `isLoading`/`error`/state (`useDocuments.ts`, `useSpeech.ts`, `useTheme.ts`).

### Database

One table, `public.documents` (see `supabase/migrations/0001_create_documents_table.sql`): `id`, `user_id`, `title`, `original_text`, `brief_summary`, `detailed_summary`, `created_at`. RLS is mandatory on every user-data table in this project — four explicit policies (select/insert/update/delete) gated on `auth.uid() = user_id`, plus a composite index on `(user_id, created_at desc)` for the "last N documents" query pattern. New migrations follow the same shape: `begin`/`commit`, `drop policy if exists` before each `create policy` so the script is safely re-runnable.

The UI only ever generates one summary mode at a time, so `brief_summary`/`detailed_summary` are nullable — a saved document has exactly one of the two populated.

### UI components

`src/components/ui/` are **real shadcn/ui components installed via the CLI** (`components.json` exists, style `radix-nova`), unlike V1's hand-written lookalikes. `button.tsx` and `card.tsx` were hand-edited after generation to match V1's pill/rounded-2xl look (`rounded-full` buttons, `rounded-2xl` cards) — if you regenerate them with `npx shadcn@latest add --overwrite`, you'll need to reapply those tweaks.

## Design decisions

Identical to V1, carried over deliberately — don't drift from these without being asked:
- **Visual language:** Apple.com-inspired — pill-shaped buttons (`rounded-full`), `rounded-2xl` cards, `--radius: 1rem` base, no heavy shadows/gradients except the hero text gradient.
- **Color:** HSL CSS variables in `src/index.css` (Tailwind v4 `@theme inline`), primary is iOS-blue. Never hardcode a colour in a component — adjust the CSS variable instead.
- **Typography:** system font stack, no imported webfonts.
- **Language:** all UI copy and error messages are Latin American Spanish. Code comments are Spanish too, only when they explain a non-obvious *why*.
- **Dark mode:** every new component gets checked in both themes.

## Spec workflow

Before implementing a non-trivial new feature, use the `spec-creator` skill (installed globally at `~/.claude/skills/spec-creator/`, not project-scoped) to produce a spec document first — it encodes the same Supabase/RLS and design rules above as a conversational checklist. Don't skip straight to code for anything beyond a trivial fix.

## Git conventions

- Global `~/.gitignore_global` excludes `package-lock.json` from all of Edgar's personal repos — don't fight this or re-add the lockfile.
- Repo is public on GitHub (`Edgarmontenegro123/summarify-v2`), connected to Vercel for auto-deploy on push to `main`.
- **Commit message standard (applies to all of Edgar's projects, agreed 2026-07-12):** subject line is `<emoji> <Short imperative message in British English>`, body also in British English explaining *why*, not *what*. Fixed emoji-per-type mapping (gitmoji-style):
  - ✨ new feature · 🐛 bug fix · 📝 documentation · ♻️ refactor (no behaviour change) · ⚡️ performance · ✅ tests · 🔧 configuration/tooling · 🔒️ security fix · 🚀 deploy · 💄 UI/styling · 🗃️ database/migrations · 🔥 remove code/files · ⬆️ upgrade dependencies · 🎉 milestone/project start
  - Example: `🗃️ Add documents table with RLS policies` with a body explaining the access-control rationale.
  - This standard only applies going forward — do not rewrite past commit history to match it.

## User preferences

- Wants things verified against the *real* Supabase project (not just local placeholders) before being told something works — Auth signup, RLS-blocked anonymous access, and the save/history round-trip were all exercised live against production.
- Cares about a reproducible production build (`npm run build`) passing cleanly before deploying.
- Keeps personal process tooling (spec templates, skills) out of product repos — see `Claude/Templates/` and `Claude/Outputs/` at the personal-folder level, not inside `Claude-Projects/<repo>`.
