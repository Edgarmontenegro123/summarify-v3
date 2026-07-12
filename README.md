# Summarify V2 📄✨

Sube un PDF o pega texto largo, generá un resumen (breve o detallado) con un
motor extractivo 100% local, escuchalo en voz alta, y guardalo en tu
historial personal — con cuenta propia y datos protegidos por usuario.

**🔗 Demo en vivo:** [summarify-v2.vercel.app](https://summarify-v2.vercel.app)
**📦 Repositorio:** [github.com/Edgarmontenegro123/summarify-v2](https://github.com/Edgarmontenegro123/summarify-v2)

Segunda generación de Summarify: mismo motor de resumen extractivo y el
mismo diseño minimalista inspirado en apple.com de la V1, pero evolucionando
de una app 100% frontend a una app con **backend real sobre Supabase**
(autenticación, base de datos e historial de resúmenes por usuario).

Esta carpeta reemplaza gradualmente a [`summarify`](../summarify) (V1). V1
se mantiene intacta como referencia hasta que V2 alcance paridad completa.

## Estado actual

**V2 con Supabase — Auth + base de datos + historial, funcionando en producción.**

- ✅ Login / Registro (email + password), rutas protegidas
- ✅ Historial de resúmenes por usuario (Postgres + Row Level Security)
- ✅ Desplegado en Vercel, conectado a un proyecto de Supabase real
- ⏳ Pendiente: buscar/paginar más allá de los últimos 5 documentos

## Qué cambia respecto a V1

| | V1 (`summarify`) | V2 (`summarify-v2`, este proyecto) |
|---|---|---|
| Backend | Ninguno | Supabase (Auth + Postgres) |
| Variables de entorno | Ninguna | `.env.local` con credenciales de Supabase |
| Autenticación | No tiene | Login + Registro (email/password) con rutas protegidas |
| Persistencia | No tiene (todo en memoria) | Historial de resúmenes por usuario (tabla `documents` + RLS) |
| Resumen de texto | Motor extractivo local en TS | Igual, sin cambios |
| Diseño | Apple minimalista, claro/oscuro | Igual, sin cambios |

## Stack

- **React 19 + TypeScript + Vite** + Tailwind CSS v4
- **shadcn/ui** (`components.json`, estilo Radix + Nova) para los componentes de UI
- **Supabase** (`@supabase/supabase-js`) — Auth (login/registro con email+password) y base de datos (historial de resúmenes con RLS)
- **react-router-dom** — rutas `/login`, `/register`, `/` y `/history` (las últimas dos, protegidas)
- **Extracción de PDF:** pdfjs-dist (100% en el navegador)
- **Resúmenes:** motor propio de resumen extractivo en TypeScript (sin IA externa, heredado tal cual de V1)
- **Texto a voz:** Web Speech API del navegador (voz en español)

## Configuración

Requisito: Node.js 18 o superior y un proyecto en [supabase.com](https://supabase.com).

```bash
cd summarify-v2
npm install
cp .env.example .env.local
# completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
# (ver la sección "Supabase Setup" más abajo para saber dónde conseguirlas)
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

## Supabase Setup

El proyecto necesita dos variables de entorno para conectarse a Supabase.
Así se consiguen:

1. **Crea (o abre) un proyecto en Supabase.** Andá a
   [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
   (si ya tenés uno para Summarify, usá ese).
2. **Buscá las credenciales del proyecto.** Dentro del proyecto, andá a
   **Project Settings → API**. Ahí vas a ver:
   - **Project URL** → esto va en `VITE_SUPABASE_URL`.
   - **Project API keys → `anon` `public`** → esto va en
     `VITE_SUPABASE_ANON_KEY`.
3. **Completá `.env.local`** (no `.env.example`, ese es solo la plantilla)
   con esos dos valores:
   ```bash
   VITE_SUPABASE_URL=https://tu-proyecto-real.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. **Reiniciá `npm run dev`** — Vite solo lee las variables `VITE_*` al
   arrancar, así que hace falta reiniciar el servidor después de editar
   `.env.local`.
5. **Creá la tabla `documents`.** Abrí **SQL Editor → New query** en el
   dashboard de Supabase, pegá el contenido de
   [`supabase/migrations/0001_create_documents_table.sql`](supabase/migrations/0001_create_documents_table.sql)
   y ejecutalo. Esto crea la tabla del historial de resúmenes con Row Level
   Security ya configurado (cada usuario solo puede ver/editar sus propios
   documentos).

### Probar el registro localmente sin esperar el email de confirmación

Por defecto Supabase pide confirmar el correo antes de dejar iniciar sesión
(la app ya maneja ese caso — ver `RegisterPage.tsx` — pero requiere revisar
el email). Para desarrollo local es más rápido desactivarlo temporalmente:
**Authentication → Sign In / Providers → Email → apagar "Confirm email"**.
Así el registro deja sesión activa al instante. Podés volver a activarlo
para producción.

### ⚠️ Importante sobre las keys

- La **`anon` key es pública por diseño**: viaja al navegador del usuario y
  está pensada para eso. La seguridad real de los datos la da **Row Level
  Security (RLS)** en las tablas de Postgres, no el secreto de esta key.
- **Nunca** uses ni expongas la **`service_role` key** en este proyecto — esa
  key se salta RLS por completo y solo debe vivir en un backend de
  confianza (Edge Functions, un servidor propio), jamás en código de
  frontend ni en un repo.
- `.env` y `.env.local` están en `.gitignore`. Si en algún momento un commit
  llega a incluir una key real, hay que rotarla desde el dashboard de
  Supabase (Project Settings → API → "Reset").

## Deploy

Desplegado en [Vercel](https://vercel.com) — proyecto `summarify-v2`,
framework detectado automáticamente (Vite).

Para desplegar tu propia copia:

1. **Conectá el repo a Vercel.** [vercel.com/new](https://vercel.com/new) →
   importá `Edgarmontenegro123/summarify-v2` desde GitHub. Vercel detecta
   Vite solo (build command `npm run build`, output `dist`).
2. **Configurá las env vars** en el proyecto de Vercel — **Settings →
   Environment Variables** — con las mismas dos variables que en local
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), marcando Production,
   Preview y Development. Sin esto el build compila igual, pero la app
   muestra pantalla en blanco al cargar (el cliente de Supabase tira el
   error de variables faltantes apenas arranca).
3. **Deploy.** Si agregaste las variables después del primer deploy, hace
   falta un redeploy — Vite las inyecta en build time, no en runtime.

Alternativa por CLI, si preferís no pasar por la UI:
```bash
npm install -g vercel
cd summarify-v2
vercel link          # asocia la carpeta a un proyecto de Vercel
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

## Estructura del proyecto

```
summarify-v2/
├── src/
│   ├── components/
│   │   ├── ui/            # Button, Card, Textarea, Input, Label (shadcn/ui real, vía CLI)
│   │   ├── Header.tsx      # Muestra el correo del usuario y "Cerrar sesión"
│   │   ├── ThemeToggle.tsx
│   │   ├── UploadZone.tsx
│   │   ├── SummaryPanel.tsx
│   │   ├── AuthLayout.tsx      # Layout compartido de /login y /register
│   │   ├── ProtectedRoute.tsx  # Redirige a /login si no hay sesión
│   │   └── PublicOnlyRoute.tsx # Redirige a / si ya hay sesión
│   ├── contexts/
│   │   └── AuthContext.tsx # Sesión de Supabase (signIn/signUp/signOut)
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── SummarizePage.tsx  # La app de resúmenes (ruta protegida "/")
│   │   └── HistoryPage.tsx    # Últimos 5 resúmenes guardados (ruta protegida "/history")
│   ├── hooks/
│   │   ├── useTheme.ts     # Modo claro/oscuro
│   │   ├── useSpeech.ts    # Web Speech API en español
│   │   └── useDocuments.ts # Guardar / traer el historial de resúmenes
│   ├── lib/
│   │   ├── summarize.ts    # Motor de resumen extractivo (heredado de V1)
│   │   ├── pdf.ts          # Extracción de texto de PDFs
│   │   ├── supabase.ts     # Cliente de Supabase (lee las env vars VITE_SUPABASE_*)
│   │   ├── authErrors.ts   # Traduce mensajes de error de Supabase Auth al español
│   │   ├── documents.ts    # Queries a la tabla "documents" (save/fetch)
│   │   └── utils.ts
│   ├── App.tsx              # Definición de rutas
│   └── main.tsx             # BrowserRouter + AuthProvider
├── supabase/
│   └── migrations/
│       └── 0001_create_documents_table.sql  # Tabla documents + RLS
├── components.json         # Config de shadcn/ui
├── .env.example             # Plantilla de variables de entorno (Supabase)
└── package.json
```

> Las specs de features nuevas no se escriben a mano: usá el skill
> `spec-creator` (instalado en `~/.claude/skills/`, disponible en
> cualquier proyecto) para generarlas de forma conversacional.

## Roadmap (próximos pasos)

1. ~~**Auth con Supabase** — registro/login (email+password), sesión persistente, rutas protegidas.~~ ✅ Hecho y verificado end-to-end contra un proyecto real.
2. ~~**Base de datos** — tabla de resúmenes por usuario con Row Level Security.~~ ✅ Hecho y verificado (insert/select reales, RLS confirmado bloqueando acceso anónimo).
3. ~~**Historial** — pantalla para ver y volver a cargar resúmenes pasados.~~ ✅ Hecho (últimos 5; falta buscar/paginar más).
4. ~~**Deploy en producción** — desplegado en Vercel, conectado al Supabase real.~~ ✅ Hecho.
5. Migrar el dominio de producción de V1 a V2 una vez V2 alcance paridad completa + las features nuevas.

## Notas

- El motor de resumen sigue siendo determinista y 100% local — Supabase solo se usa para autenticación y persistencia, no para generar resúmenes.
- `.env` y `.env.local` están en `.gitignore`; nunca subas tus credenciales de Supabase al repositorio. Usa `.env.example` como plantilla.
- El diseño (paleta iOS-blue, tipografía system-stack, botones `rounded-full`, cards `rounded-2xl`, modo claro/oscuro) es intencionalmente idéntico a V1 — ver `src/index.css`.
