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

Summarify V3 (this repo) is the international evolution of [`summarify-v2`](https://github.com/Edgarmontenegro123/summarify-v2), which itself evolved [`summarify`](../summarify) (V1, 100% client-side, no backend) into an app with a **real Supabase backend** — Auth (email+password) and Postgres (per-user document history). The summarisation engine is still unchanged from V1 in spirit: a local, deterministic extractive algorithm, not an LLM call. Don't reintroduce an external summarisation/translation API — this was a deliberate decision (2026-07-12) to keep the project on free resources with no per-request cost.

### Internationalisation (V3)

Two independent language concerns, don't conflate them:
- **UI language** (`src/contexts/LanguageContext.tsx`, `useLanguage()`) — chrome/labels/buttons, toggled by the user via `LanguageToggle` in the header, persisted to `localStorage`. Dictionary lives in `src/lib/i18n.ts` (`translations.es` / `translations.en`, both must satisfy the same `Translations` interface).
- **Summary content language** — which language the *currently displayed summary text* is actually written in. Tracked separately as `summaryLanguage` state in `SummarizePage`, because it doesn't necessarily match the current UI language (e.g. reloading an old Spanish summary from history while the UI toggle is set to English). TTS (`useSpeech().speak(text, language)`) and the saved `documents.summary_language` column always follow this, never the UI toggle.

Because the summarisation engine is local/extractive (not a translator), selecting English mode does **not** translate non-English source text. `src/lib/summarize.ts` exports `detectLikelyLanguage()`, a stopword-hit-rate heuristic used only to block English-mode generation when the source is clearly Spanish (shows `summarize.notEnglishWarning` instead of producing a nonsense summary). Low-signal/short text falls back to `"unknown"` and is allowed through rather than blocked, to avoid false positives.

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

One table, `public.documents` (see `supabase/migrations/0001_create_documents_table.sql`): `id`, `user_id`, `title`, `original_text`, `brief_summary`, `detailed_summary`, `created_at`, plus `summary_language` (`'es' | 'en'`, default `'es'`, added in `0002_add_summary_language.sql`). RLS is mandatory on every user-data table in this project — four explicit policies (select/insert/update/delete) gated on `auth.uid() = user_id`, plus a composite index on `(user_id, created_at desc)` for the "last N documents" query pattern. New migrations follow the same shape: `begin`/`commit`, `drop policy if exists`/`drop constraint if exists` before each `create` so the script is safely re-runnable. Migrations are additive only in this project — never rewrite `0001` in place.

**V3 shares the same Supabase project as V2** (ref `dlxrcctrckdritkpiuvm`, decided 2026-07-12) — same users, same `documents` table extended in place, not a separate project. Any migration added here must be run against that one shared project before it'll work end-to-end (Supabase dashboard → SQL Editor).

The UI only ever generates one summary mode at a time, so `brief_summary`/`detailed_summary` are nullable — a saved document has exactly one of the two populated.

### UI components

`src/components/ui/` are **real shadcn/ui components installed via the CLI** (`components.json` exists, style `radix-nova`), unlike V1's hand-written lookalikes. `button.tsx` and `card.tsx` were hand-edited after generation to match V1's pill/rounded-2xl look (`rounded-full` buttons, `rounded-2xl` cards) — if you regenerate them with `npx shadcn@latest add --overwrite`, you'll need to reapply those tweaks.

## Design decisions

Identical to V1, carried over deliberately — don't drift from these without being asked:
- **Visual language:** Apple.com-inspired — pill-shaped buttons (`rounded-full`), `rounded-2xl` cards, `--radius: 1rem` base, no heavy shadows/gradients except the hero text gradient.
- **Color:** HSL CSS variables in `src/index.css` (Tailwind v4 `@theme inline`), primary is iOS-blue. Never hardcode a colour in a component — adjust the CSS variable instead.
- **Typography:** system font stack, no imported webfonts.
- **Language:** UI copy is bilingual (Spanish/English) via `useLanguage()`/`src/lib/i18n.ts` — see "Internationalisation" above. Never hardcode user-facing strings in components; add a key to both `translations.es` and `translations.en` instead. Code comments stay in Spanish, only when they explain a non-obvious *why*.
- **Dark mode:** every new component gets checked in both themes.

## Spec workflow

Before implementing a non-trivial new feature, use the `spec-creator` skill (installed globally at `~/.claude/skills/spec-creator/`, not project-scoped) to produce a spec document first — it encodes the same Supabase/RLS and design rules above as a conversational checklist. Don't skip straight to code for anything beyond a trivial fix.

## Git conventions

- Global `~/.gitignore_global` excludes `package-lock.json` from all of Edgar's personal repos — don't fight this or re-add the lockfile.
- Repo is public on GitHub (`Edgarmontenegro123/summarify`). **Vercel deployment: configured and active**, connected via GitHub Integration — every push to `main` automatically triggers a new production deployment (no manual `vercel deploy` needed). Production URL: `summarify-app.vercel.app`.
- **Commit message standard (applies to all of Edgar's projects, agreed 2026-07-12):** subject line is `<emoji> <Short imperative message in British English>`, body also in British English explaining *why*, not *what*. Fixed emoji-per-type mapping (gitmoji-style):
  - ✨ new feature · 🐛 bug fix · 📝 documentation · ♻️ refactor (no behaviour change) · ⚡️ performance · ✅ tests · 🔧 configuration/tooling · 🔒️ security fix · 🚀 deploy · 💄 UI/styling · 🗃️ database/migrations · 🔥 remove code/files · ⬆️ upgrade dependencies · 🎉 milestone/project start
  - Example: `🗃️ Add documents table with RLS policies` with a body explaining the access-control rationale.
  - This standard only applies going forward — do not rewrite past commit history to match it.

## User preferences

- Wants things verified against the *real* Supabase project (not just local placeholders) before being told something works — Auth signup, RLS-blocked anonymous access, and the save/history round-trip were all exercised live against production.
- Cares about a reproducible production build (`npm run build`) passing cleanly before deploying.
- Keeps personal process tooling (spec templates, skills) out of product repos — see `Claude/Templates/` and `Claude/Outputs/` at the personal-folder level, not inside `Claude-Projects/<repo>`.
