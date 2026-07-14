# CLAUDE.md — Nexora OTT Platform

This file is long-term project memory for Claude Code sessions. It was built by reading the actual source files in this repo (not generated from assumptions). Where something could not be verified, it is explicitly marked "unclear / needs verification."

## 1. Project Overview

**Nexora** is an OTT (video streaming) web platform — a Netflix/JioHotstar-style clone. It has:
- A public-facing React SPA for browsing/watching movies & shows, managing a mock login, and viewing subscription plans.
- An admin panel (same React app, under `/admin`) for managing movies, hero banners, trays (home page rows), subscription plans, genres/languages/age-certificates/mature-themes/badges/vendors (master data), and CMS-style settings pages/menus.
- A Node.js/Express + MySQL (Sequelize) backend REST API serving both.

The project is mid-development / prototype-quality: some flows are fully wired to the real backend, others are still using demo/mock logic (see §16 "Known Technical Considerations").

## 2. Tech Stack

**Frontend**
- React 19 + Vite 8, plain JavaScript (JSX, no TypeScript)
- react-router-dom v7 (client-side routing)
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin, config lives inline in `src/index.css` using `@theme`)
- Swiper (carousels/rows), Framer Motion (installed, animations), lucide-react (icons)
- No global state library (Redux/Zustand/etc.) — state is local `useState`/`useEffect` + React Context (`PremiumModalContext`) + `localStorage`

**Backend**
- Node.js + Express 5
- Sequelize 6 ORM + `mysql2` driver → MySQL database
- `jsonwebtoken` + `bcrypt` for auth (JWT-based, stateless)
- `multer` for file uploads (local disk storage under `backend/uploads/`)
- `morgan` for request logging, `cors`, `dotenv`

**Database**: MySQL, hosted on Railway (`hayabusa.proxy.rlwy.net`, per `backend/.env`). Sequelize `sync({ alter: true })` is used instead of migrations (see §16).

**Package manager**: npm (both root frontend and `backend/` have their own `package.json` / `package-lock.json` — this is a two-package-directory repo, not a monorepo tool like Turborepo/Nx).

**Hosting** (inferred from `.env.production` / `api.js`): backend deployed on Render (`https://nexora-backend1.onrender.com`), frontend likely deployed separately (Vercel/Netlify — unclear, no deployment config found in repo).

## 3. Project Structure

```
/                        # Frontend root (Vite + React)
  src/
    App.jsx              # All routing definitions live here
    main.jsx             # React root mount
    index.css            # Tailwind entry + @theme design tokens + global styles
    App.css              # Leftover Vite template CSS (mostly unused legacy)
    components/          # Shared UI: Navbar, Sidebar, Footer, MovieCard, MovieRow,
                          #   HeroCarousel, SearchBar, ScrollToTop
    context/
      PremiumModalContext.jsx  # Global "subscribe to watch" modal, app-wide provider
    pages/                # Public route pages (HomePage, DetailPage, SearchPage,
                          #   SettingsPage, SettingsDetailPage, LoginPage, OtpPage,
                          #   PlansPage, PlayerPage)
      admin/              # Admin panel pages (AdminLayout + one page per resource,
                          #   e.g. AdminMovies.jsx + AdminMovieForm.jsx)
    services/
      api.js              # Partial fetch-wrapper API client (NOT used by all pages — see §16)
    data/
      mockData.js         # Legacy mock movie data — no longer imported anywhere (dead file)
  public/                 # Static assets served as-is (favicon, icons, video.mp4)
  dist/                   # Vite build output — generated, ignore
  vite.config.js          # Vite + React + Tailwind plugin config
  eslint.config.js        # Flat ESLint config (js recommended + react-hooks + react-refresh)
  .env / .env.development / .env.production  # VITE_API_URL only

backend/                  # Express API (separate package.json, own node_modules)
  server.js               # Entry point: connects DB, sync({alter:true}), seeds master
                          #   data if empty, then app.listen()
  app.js                  # Express app setup: middleware, route mounting, global error handler
  config/
    db.config.js          # Sequelize instance — DATABASE_URL or discrete DB_* env vars
  models/                 # One file per Sequelize model (see §7)
    index.js              # Central model registry + the ONLY defined association
                          #   (HeroBanner belongsTo Movie)
  controllers/             # One file per resource, thin Express handlers, no service layer
  routes/                  # One file per resource, mounted in app.js under /api/*
  middleware/
    auth.middleware.js     # JWT verification, sets req.user from token payload
    role.middleware.js     # authorizeRoles(...roles) factory, checks req.user.role
    upload.middleware.js   # multer config: routes files by fieldname to uploads/{audio,thumbnails,banners}
  uploads/                 # multer's disk storage destination, served statically at /uploads
  seed*.js, create-tray-table.js, fix-collation.js, test.js  # One-off dev/ops scripts,
                          #   run manually with `node <file>.js`, not part of the app boot
                          #   (see §16 for what each does)
  backend/.env             # DB credentials, JWT secret, PORT — see §11 (do not hardcode reads of actual values)

There is no `backend/services/` or `backend/utils/` content — both directories exist but are empty.
```

## 4. Architecture — How the Pieces Talk

- **Frontend → Backend**: plain `fetch()` calls (some routed through `src/services/api.js`, most inline in page components) hitting `${VITE_API_URL}/api/...` (or a hardcoded backend URL in `api.js` — see §16). No axios, no React Query/SWR, no request caching library.
- **Backend → Database**: Sequelize models query MySQL directly from controllers. No repository/service abstraction layer — controllers call `Model.findAll/findByPk/create/update/destroy` directly.
- **Schema management**: `sequelize.sync({ alter: true })` runs on every server boot (`server.js`) — this auto-alters tables to match model definitions instead of using versioned migrations. There is no `migrations/` folder.
- **File uploads**: frontend `FormData` → `POST /api/upload` (multer, disk storage) → backend returns a relative path → frontend stores that path/URL string on the parent record (e.g. `HeroBanner.image`, movie poster fields). Files are served back via `express.static('/uploads')`.
- **Auth**: JWT is issued by `/api/auth/login` and `/api/auth/register`, verified by `auth.middleware.js`, but — important — **the actual frontend login screens do not call these endpoints** (see §8 and §16).

## 5. Frontend Architecture

**Routing** (`src/App.jsx`, single file, all routes defined here):
- `/player/:id` — standalone fullscreen video player (no Navbar/Sidebar)
- `/login`, `/verify-otp` — standalone auth screens
- `/admin/*` — `AdminLayout` wraps nested admin routes via `<Outlet />` — **no auth guard**, publicly reachable
- `*` (catch-all) — wraps `Sidebar` + `Navbar` + `Footer` around: `/`, `/search`, `/movie/:id`, `/settings`, `/page/:slug`, `/plans`

**State management**: no global store. Each page fetches its own data in `useEffect`. Cross-cutting UI state:
- `PremiumModalContext` (`src/context/PremiumModalContext.jsx`) — app-wide provider (wraps everything inside `<Router>`) exposing `showModal()`/`hideModal()` for the "you need a subscription" paywall modal; `handleSubscribe` navigates to `/plans`.
- "Logged in" user state is just a JSON blob in `localStorage.getItem('user')` — `{ phone, isSubscribed }` — read directly wherever needed (e.g. `DetailPage`, `SettingsPage`). There is no `AuthContext`.

**API handling**: two inconsistent patterns coexist (see §16):
1. `src/services/api.js` — small fetch wrapper (`get/post/put/patch/del`) exporting `settingsMenuApi`, `plansApi`, `moviesApi`, `settingsPagesApi`. Used by `SettingsPage`, `SettingsDetailPage`, `PlansPage`, `AdminSubscriptions`.
2. Inline `fetch(\`${import.meta.env.VITE_API_URL}/api/...\`)` calls directly inside components — used by `HomePage`, `DetailPage`, `SearchPage`, `PlayerPage`, most admin pages (`AdminMovies`, `AdminMovieForm`, `AdminHeroBannerForm`, etc.)

**Key components**:
- `MovieCard.jsx` — one component, four visual layouts driven by a `cardType` prop: `continue_watching`, `rectangle`, `trending`, and default square.
- `MovieRow.jsx` — Swiper-based horizontal row, renders a list of `MovieCard`s, adjusts `slidesPerView` breakpoints based on `cardType`.
- `HeroCarousel.jsx` — Swiper fade carousel for the top-of-homepage banner, has separate mobile/mobile-desktop/desktop layout math based on UA + touch sniffing.
- `Sidebar.jsx` — persistent left nav (desktop) / bottom tab bar (mobile): Home, Search, Settings.
- `Navbar.jsx` — top bar, shows search trigger on desktop/home, listens for ⌘K/Ctrl+K to jump to `/search`.

**Data caching**: `HomePage` writes fetched data to `localStorage['home_page_data_redesign']` and reads it back on mount for instant paint before revalidating — a manual stale-while-revalidate pattern, not a library.

**Admin pages pattern**: every `Admin<Resource>.jsx` follows the same shape — table/list view with a `showForm` boolean toggling an inline `Admin<Resource>Form.jsx` (not a modal route, not React Router nested routes for the form). CRUD master-data pages (genres, languages, age-certificates, mature-themes, badges) are structurally near-identical (thin wrappers over `/api/master/*`).

## 6. Backend Architecture

**Pattern**: routes → controllers → Sequelize models. No service layer, no DTOs/validation layer, no repository pattern.

**Route mounting** (`backend/app.js`), all under `/api`:
| Path | File | Notes |
|---|---|---|
| `/api/auth` | `auth.routes.js` | register, login, logout, forgot-password (stub) |
| `/api/user` | `user.routes.js` | profile, subscription — **entire router behind `authMiddleware`** |
| `/api/movies` | `movie.routes.js` | full CRUD, **no auth middleware** |
| `/api/categories` | `category.routes.js` | full CRUD, **no auth middleware** |
| `/api/subscription-plans` | `subscriptionPlan.routes.js` | CRUD + `/:id/toggle`, **no auth middleware** |
| `/api/settings-pages` | `settingsPage.routes.js` | CRUD + `/slug/:slug`, **no auth middleware** |
| `/api/settings-menu` | `settingsMenu.routes.js` | CRUD + `/reorder`, **no auth middleware** |
| `/api/admin` | `admin.routes.js` | dashboard metrics, user list/delete — **entire router behind `authMiddleware` + `authorizeRoles('admin')`** |
| `/api/upload` | `upload.routes.js` | multer file upload — auth middleware present in code but **commented out** |
| `/api/master` | `master.routes.js` | genres/languages/age-certificates/mature-themes/badges/vendors CRUD via a generic controller factory, **no auth middleware** |
| `/api/hero-banners` | `heroBanner.routes.js` | CRUD, **no auth middleware** |
| `/api/trays` | `tray.routes.js` | CRUD, imports auth middleware but never applies it — router comment says "All routes open for now to match other endpoints" |
| `/api/payments` | `payment.routes.js` | PayU UPI Intent S2S: `POST /create`, `GET /status/:txnid`, `POST /callback/success`, `POST /callback/failure`, `POST /webhook` — **no auth middleware**; see §9 |

**Controller conventions**: `exports.getAll/getOne/create/update/remove` (or `getById/delete` in `master.controller.js`), try/catch wrapping every handler, `res.status(xxx).json({ message, ... })` on error, raw `res.json(data)` on success (no envelope like `{ data, error }`).

**`master.controller.js`** is the one abstraction in the codebase: a `createMasterController(Model)` factory generates identical CRUD handlers for Genre/Language/AgeCertificate/MatureTheme/Badge; Vendor gets a custom `getAll` override since it has no `sort_order` column.

**Middleware**:
- `auth.middleware.js` — expects `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, sets `req.user = decoded` (contains `id`, `role`, `email`).
- `role.middleware.js` — `authorizeRoles(...roles)` factory, 403s if `req.user.role` isn't in the allowed list.
- `upload.middleware.js` — multer disk storage; routes files to `uploads/audio|thumbnails|banners` by fieldname; 50MB limit; mimetype filter per field.

**Error handling**: single global error handler in `app.js` (`app.use((err, req, res, next) => ...)`) that logs `err.stack` and returns 500 with the message only in `NODE_ENV=development`. Most errors are actually caught and responded to at the controller level before reaching this handler.

## 7. Database

- **Engine**: MySQL (Railway-hosted), accessed via Sequelize + `mysql2`.
- **Schema strategy**: `sequelize.sync({ alter: true })` on boot — **no migrations directory exists**. Changing a model changes the live table on next server start.
- **Naming**: table names are `snake_case` plural (`users`, `movies`, `subscription_plans`, `settings_pages`, `settings_menu`, `categories`, `hero_banners`, `genres`, `languages`, `age_certificates`, `mature_themes`, `badges`, `vendors`, `trays`); models use Sequelize's default `createdAt`/`updatedAt` mapped explicitly to `created_at`/`updated_at` (except `Tray`, which uses `underscored: true` instead).

**Models** (`backend/models/`):
| Model | PK | Notable columns |
|---|---|---|
| `User` | BIGINT auto-increment | `email` (unique), `password` (bcrypt hash), `role` (default `'user'`), `remember_token`, `email_verified_at` |
| `Movie` | STRING (UUID via `crypto.randomUUID()`, set in controller) | `category_id`, `posterUrl`, `backdropUrl`, `rating`, `year`, `duration`, `genres`/`cast` (TEXT storing JSON, `genres` has a custom Sequelize getter that JSON-parses), `isNew`/`isTrending`/`isOriginal` booleans, `ageRating` |
| `Category` | STRING | `title`, `type` |
| `SubscriptionPlan` | BIGINT auto-increment | `original_price`/`discounted_price` (DECIMAL), `billing_cycle`, `number_of_days`, `is_recommended`, `status` |
| `SettingsPage` | BIGINT auto-increment | `slug` (unique), `short_description`, `full_content` (long TEXT, rendered as raw HTML on frontend via `dangerouslySetInnerHTML` — see §16) |
| `SettingsMenu` | BIGINT auto-increment | `icon_key` (string key mapped to a lucide icon on the frontend), `path`, `is_highlight`, `is_logout`, `sort_order` |
| `HeroBanner` | STRING (UUID) | `show_id` (FK-like, not enforced at DB level beyond the Sequelize association), `sorting_position`, `image` |
| `Tray` | UUID (native) | `shows` (JSON array of movie ID strings), `shape` (rectangle/square/trending — drives `MovieCard` layout), `aspect_ratio`, `sorting_position` |
| `Genre`, `Language`, `AgeCertificate`, `MatureTheme`, `Badge`, `Vendor` | INTEGER auto-increment | "master data" tables, mostly `name` + `sort_order` + `status`; `Badge` also has `bg_color`/`text_color`/`border_gradient`; `Vendor` has no `sort_order` |

**Relationships**: exactly one is defined, in `models/index.js`:
```js
HeroBanner.belongsTo(Movie, { foreignKey: 'show_id', as: 'show' });
Movie.hasMany(HeroBanner, { foreignKey: 'show_id' });
```
Everything else (`Movie.category_id` → `Category`, `Tray.shows` → `Movie[]`, movie's `genres`/`language`/etc. string fields → master data tables) is a **soft reference by ID/name string only** — no Sequelize associations, no DB foreign keys, resolved manually in application code (e.g. `HomePage.jsx` maps `tray.shows` IDs to movie objects client-side after fetching both lists).

**⚠️ Known bug**: `user.controller.js` imports and uses a `Subscription` model (`const { User, Subscription } = require('../models')`) that **does not exist** in `models/index.js`'s exports. Calling `GET /api/user/subscription` will throw at runtime (`Subscription` is `undefined`). There is no `Subscription` model file in `backend/models/` at all — subscription *purchase/ownership* records are not modeled anywhere; only the subscription *plan catalog* (`SubscriptionPlan`) exists.

## 8. Authentication and Authorization

Two **disconnected** auth systems currently coexist:

**A. Real backend JWT auth** (fully implemented, currently unused by the frontend UI):
- `POST /api/auth/register` — bcrypt-hashes password, creates `User` with `role: 'user'`, returns JWT.
- `POST /api/auth/login` — verifies bcrypt password, returns JWT (`{ id, role, email }` payload, expires per `JWT_EXPIRES_IN`, default 30d).
- `POST /api/auth/logout` — no-op; stateless JWT, client just discards the token (there is no blacklist).
- `POST /api/auth/forgot-password` — returns 501 "not implemented yet".
- Protected routes read `Authorization: Bearer <token>`, verify via `auth.middleware.js`, and (for admin-only routes) additionally check `req.user.role === 'admin'` via `role.middleware.js`.

**B. Frontend mock auth** (what the UI actually uses today):
- `LoginPage.jsx` collects a 10-digit mobile number and navigates to `/verify-otp` — **no backend call**.
- `OtpPage.jsx` hardcodes two demo accounts client-side: `9999999999` + OTP `1234` → subscribed user; `8888888888` + OTP `5678` → non-subscribed user. On match, writes `localStorage.setItem('user', JSON.stringify({ phone, isSubscribed }))` and navigates home. Any other input shows "Invalid credentials". **No backend call, no real OTP is sent.**
- Paywall check (`DetailPage.jsx` `handleWatchClick`): reads `localStorage.getItem('user')`; if missing or `!isSubscribed`, opens the `PremiumModalContext` paywall modal instead of navigating to the player.
- `SettingsPage.jsx` logout just does `localStorage.removeItem('user')` and redirects to `/login`.

**Admin panel access**: `/admin/*` routes have **no authentication gate in the frontend router** — anyone can navigate directly to `/admin` and use the full CMS. Some admin `fetch` calls do send `Authorization: Bearer ${localStorage.getItem('token') || 'dev-token'}` (e.g. `AdminMovies` delete, `AdminHeroBannerForm` upload), but since nothing in the frontend ever sets `localStorage['token']`, this always sends the literal string `dev-token` — and it doesn't matter, because most of the corresponding backend routes (movies, hero-banners, categories, master data, settings) have no `authMiddleware` applied anyway (see §6 table).

**If asked to wire up real auth**, treat this as effectively greenfield on the frontend: the backend JWT plumbing already exists and can likely be reused as-is; the frontend login/OTP/admin-guard flows need to be built from scratch to actually call `/api/auth/*` and gate `/admin`.

## 9. Payment System

**PayU UPI Intent S2S is integrated** (implemented after this file was first written — if this section conflicts with what you find in code, trust the code and update this section). Official docs used: https://docs.payu.in/docs/upi-intent-server-to-server, https://docs.payu.in/docs/hashing-request-and-response, https://docs.payu.in/reference/verify_payment_api, https://docs.payu.in/docs/webhooks.

**Model**: `backend/models/Payment.js` (table `payments`) — `txnid` (unique, app-generated), `plan_id` (→ `SubscriptionPlan`), `user_id` (nullable — no real auth is wired up yet, see §8), `customer_name/email/phone`, `amount`, `payment_method` (default `'UPI'`), `status` (`pending|success|failed|cancelled`), `payu_mihpayid`, `payu_reference_id`, `payu_bank_ref_num`, `payu_mode`, `payu_response` (raw last-response JSON snapshot), `error_message`, `last_verified_at` (throttle marker for re-verification).

**Backend logic**: `backend/utils/payu.util.js` (hash generation/verification, PayU API calls, status mapping — no dependency added, uses Node's built-in `crypto` and global `fetch`) and `backend/controllers/payment.controller.js` (`createPayment`, `getPaymentStatus`, and a shared `processCallback`/`reconcileWithPayu` used by both the surl/furl callbacks and the webhook). Routes in `backend/routes/payment.routes.js`, mounted at `/api/payments` (`POST /create`, `GET /status/:txnid`, `POST /callback/success`, `POST /callback/failure`, `POST /webhook`) — none of these routes have `authMiddleware` applied, consistent with most of this codebase's other routes (see §6); `createPayment` validates its own inputs instead.

**Flow**: `PlansPage.jsx` → user picks a plan, fills in name/email (phone pre-filled from the mocked login if present — PayU requires both, and this app never collected email anywhere before this) → `POST /api/payments/create` → backend generates a unique `txnid`, computes the PayU S2S request hash server-side, and POSTs directly to PayU's `_payment` endpoint (`pg=UPI`, `bankcode=INTENT`, `txn_s2s_flow=4`) → backend returns `{ txnid, upiIntentUrl }` → frontend navigates to the `upi://pay?...` deep link and polls `GET /api/payments/status/:txnid` (every 4s, ~3 min cap) → PayU also posts to the backend's `surl`/`furl`/webhook, all funneled through the same idempotent handler, which **always calls PayU's Verify Payment API (`command=verify_payment`) before writing a final status** — the posted `status` field and any frontend URL params are never trusted directly, only used to decide when to re-verify.

**Idempotency/concurrency**: `reconcileWithPayu()` checks the payment's current status is not already final, then re-checks again inside a row-locked (`lock: true`) Sequelize transaction before writing, so concurrent webhook/callback/poll-triggered verifications can't double-process the same `txnid`.

**Env vars** (`backend/.env`, not committed — see below): `PAYU_ENV` (`test`|`production`), `PAYU_MERCHANT_KEY`, `PAYU_SALT`, `BACKEND_URL` (used to build absolute `surl`/`furl` URLs sent to PayU), `FRONTEND_URL` (redirect target if PayU ever hits `surl`/`furl` via browser). PayU's fixed endpoints (`test.payu.in` / `secure.payu.in` / `info.payu.in`) live as constants in `payu.util.js`, not env vars.

**Known limitations / things to check before extending**:
- No desktop QR-code fallback — UPI Intent deep links only work where a UPI app can actually catch them (mobile). Would need a QR-rendering dependency to add.
- "Cancelled" status is a best-effort heuristic (`mapPayuStatus` in `payu.util.js` — a `failure` result with cancel/drop-like `unmappedstatus` keywords), since PayU's Verify Payment API doesn't document a separate cancelled enum. Confirm against real PayU responses for this merchant account if this matters.
- `Payment.user_id` is nullable because there's no real authenticated user session anywhere in the frontend (see §8) — payments aren't currently linked to a real user account, only to the name/email/phone collected at checkout.
- **`backend/.env` was already committed to git with real DB/JWT secrets before this feature was added**, and PayU credential placeholders were added to that same file. It's now been added to `.gitignore`, but that does not remove it from git history — rotate the DB password/JWT secret/PayU salt and consider scrubbing history before this goes anywhere near production. See §17.

## 10. API Structure

Base path: `/api`. No versioning (no `/v1`). Conventions actually in use:
- REST-ish resource routers: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, occasionally `PATCH /:id/toggle` or `PATCH /reorder`.
- Request bodies are raw JSON (`express.json()`); file uploads are separate `multipart/form-data` requests to `/api/upload`, decoupled from the resource's own create/update call (frontend uploads first, then sends the returned path as a normal JSON field).
- Responses are the raw Sequelize instance/array — no pagination envelope, no wrapper object (except one-off messages like `{ message: '...' }`).
- IDs are inconsistent by design: some resources use MySQL auto-increment integers (`User`, `SubscriptionPlan`, `SettingsPage`, `SettingsMenu`, master data), some use app-generated UUID strings via `crypto.randomUUID()` (`Movie`, `HeroBanner`), one uses native Sequelize `DataTypes.UUID` (`Tray`).
- Filtering convention: `?active=1` query param used by `subscription-plans` and `settings-menu` GET-all endpoints to filter `status: true`.

## 11. Environment Variables

**Frontend** (`.env`, `.env.development`, `.env.production` — Vite convention, must be prefixed `VITE_`):
- `VITE_API_URL` — backend base URL (`http://localhost:5000` in dev, `https://nexora-backend1.onrender.com` in prod). `src/services/api.js`'s `BASE` constant now correctly reads this (fixed — previously hardcoded to production, see git history / §17).

**Backend** (`backend/.env`):
- `PORT` — server port (5000)
- `NODE_ENV` — `development` | `production`, gates error detail exposure and (indirectly) verbose logging
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — discrete MySQL connection params (used if `DATABASE_URL` is absent)
- `DATABASE_URL` — full MySQL connection string (takes precedence over the discrete `DB_*` vars in `db.config.js`)
- `DB_SSL` — `'true'` enables `ssl: { require: true, rejectUnauthorized: false }` dialect options (currently unset/unused in the working `.env`)
- `JWT_SECRET` — HMAC signing secret for JWTs
- `JWT_EXPIRES_IN` — token lifetime (default `30d`)
- `PAYU_ENV` — `test` | `production`, switches which PayU endpoint/credential pair is used (see §9)
- `PAYU_MERCHANT_KEY` / `PAYU_SALT` — PayU merchant credentials, backend-only, never sent to the frontend
- `BACKEND_URL` — this backend's own public base URL, used to build the `surl`/`furl` URLs sent to PayU
- `FRONTEND_URL` — frontend base URL, used only as a redirect target if PayU ever hits `surl`/`furl` via a browser

No `.env.example` file exists in either directory — if adding new env vars, consider creating one (names only, never values). **`backend/.env` (and the root `.env*` files) are now gitignored, but `backend/.env` was already committed to git history with real secrets before that fix — see §17.**

## 12. External Services and Integrations

- **TVMaze API** (`https://api.tvmaze.com/shows`) — called from `backend/seed-real-data.js` only, a one-off script to seed the `movies` table with real show data. Not called at runtime by the app.
- **Unsplash / Picsum** image URLs — used as fallback/placeholder imagery in `HomePage.jsx`, `mockData.js`, `SearchPage.jsx`, `MovieCard.jsx` `onError` handlers. Not a real integration, just hardcoded stock image URLs.
- **Railway** — MySQL database hosting (per `backend/.env` host `hayabusa.proxy.rlwy.net`).
- **Render** — backend hosting (`nexora-backend1.onrender.com`, per `.env.production` and the hardcoded URL in `src/services/api.js`).
- **PayU** — payment gateway, UPI Intent S2S integration (see §9). Backend calls PayU's `_payment` (initiate) and `merchant/postservice` (verify) APIs directly via Node's built-in `fetch`; PayU calls back into this backend via `surl`/`furl`/webhook.
- No email provider (nodemailer, SendGrid, etc.), no SMS/OTP provider (Twilio, MSG91, etc.) despite the UI implying OTP-based login — that flow is entirely mocked client-side (§8).
- No cloud storage provider (S3, Cloudinary, etc.) — uploads are saved to local disk (`backend/uploads/`) via multer and served via Express static middleware. This will not persist across redeploys on ephemeral hosts like Render's free tier — worth flagging if asked to make uploads production-durable.

## 13. Coding Conventions

- **Frontend**: functional components only, `useState`/`useEffect`, no class components. Files are `PascalCase.jsx` matching the exported component name. Tailwind utility classes inline in JSX; no CSS modules, no styled-components. Icons from `lucide-react` imported by name. Admin CRUD pages consistently follow: list/table component owns a `showForm` boolean that swaps in a sibling `*Form.jsx` component (not a modal, not a route).
- **Backend**: CommonJS (`require`/`module.exports`), not ES modules — this differs from the frontend, which is `"type": "module"` (ESM) per its `package.json`. Controllers export named handler functions (`exports.getAll = async (req, res) => {...}`), one file per resource, always wrapped in try/catch with `console.error(err)` + JSON error response. Routes are thin — just wire path → controller method, occasionally chained with middleware.
- **Naming**: DB columns and Sequelize `tableName`s are `snake_case`; JS model attribute names mostly mirror the DB column (mostly `snake_case`, with a few `camelCase` exceptions like `Movie.posterUrl`/`backdropUrl`/`isNew`/`isTrending`/`isOriginal`/`ageRating` — this model is inconsistent internally, camelCase for display-ish fields, snake_case for structural ones).
- **IDs**: see §10 — no single convention across resources; match whatever the specific model already does rather than introducing a new ID scheme.
- **No TypeScript, no PropTypes, no runtime validation library** (no Zod/Joi/Yup) anywhere in either frontend or backend. Do not introduce one without discussing — it would be inconsistent with the rest of the codebase unless the user asks for it.
- **No test suite**: `backend/package.json`'s `"test"` script is the default `echo "Error: no test specified" && exit 1` placeholder; no `*.test.js` files exist anywhere.

## 14. UI and Styling Rules

- Tailwind v4, configured entirely inline via `@theme` in `src/index.css` — brand colors are CSS custom properties: `--color-brand: #00A8E1` (the signature cyan/blue), `--color-brand-hover`, `--color-bg-dark: #02040a`, `--color-bg-card: #090d16`, `--color-bg-lighter`.
- Dark theme only — no light mode, no theme toggle (the "🌙" icon in `AdminLayout` header is decorative/non-functional).
- Public site uses `#02040a`/`#00A8E1` (Nexora brand); the admin panel uses a visually distinct palette (`#1c2333`/`#5a6ef7` indigo, `#22c55e` green for toggles/save actions, `#4aa5ff` accents) — **do not blend the two palettes**, they are intentionally different design systems (public consumer UI vs internal admin tool).
- Responsive strategy: mobile-first Tailwind breakpoints (`md:`, `lg:`), plus manual UA/touch-detection JS (`navigator.userAgent`, `maxTouchPoints`) in `Navbar`, `HeroCarousel`, `DetailPage`, `PlayerPage` to distinguish "mobile", "mobile-desktop" (tablet-ish touch device at desktop width), and "desktop" — this is a deliberate, already-tuned pattern; if adding new responsive components, prefer reusing this `deviceMode` pattern over inventing a new one.
- **Preserve existing UI unless explicitly asked to redesign.** Both the public site's cinematic dark styling and the admin panel's dashboard styling are deliberate and already reviewed/accepted — do not restyle in the course of unrelated feature work.

## 15. Build, Development, and Deployment

**Frontend** (run from repo root):
```
npm install
npm run dev       # vite dev server
npm run build     # vite build -> dist/
npm run preview   # preview the production build
npm run lint      # eslint .
```

**Backend** (run from `backend/`):
```
npm install
npm run dev        # nodemon server.js
npm start           # node server.js
```
No build step for the backend (plain CommonJS Node, no bundler/TS compile).

**No CI/CD config found** in the repo (no `.github/workflows`, no `Dockerfile`, no `render.yaml`/`vercel.json`) — deployment to Render/wherever the frontend lives appears to be manual or configured outside this repo. Treat deployment as unclear/needs verification if it becomes relevant.

**Boot-time side effects to be aware of**: starting the backend (`server.js`) runs `sequelize.sync({ alter: true })` against whatever database `DATABASE_URL`/`DB_*` points to, then seeds master data if empty. Running the backend locally against the Railway production DB (as the checked-in `backend/.env` currently points to) will alter that live database's schema. Be careful before running `npm run dev`/`npm start` in `backend/` unless you're certain which database it's pointed at.

## 16. Important Business Logic

- **Paywall gate**: only `DetailPage.jsx`'s "Watch now" button checks subscription status (via the mocked `localStorage['user'].isSubscribed`) before allowing navigation to `/player/:id`. The player route itself (`PlayerPage.jsx`) has no guard — navigating directly to `/player/:id` bypasses the paywall entirely.
- **Video playback**: `PlayerPage.jsx` always plays the same static `public/video.mp4` regardless of which movie `:id` is requested — it only fetches the movie record to display the title. There is no per-movie video source wired up yet.
- **Home page composition**: `HomePage.jsx` fetches categories, movies, hero banners, and trays in parallel, then assembles the page as: Hero (from active `HeroBanner`s, or a fallback built from `movies` filtered by `category_id === 'hero'`, or the first 5 movies) → "Continue Watching" row (hardcoded to movie IDs `['11','16','17','18','19']` with hardcoded fake progress percentages, or a fallback slice if those IDs aren't present) → dynamic `Tray` rows (each tray's `shows` array of movie IDs resolved against the fetched movie list, sorted by `sorting_position`).
- **Hero banner / tray deletion re-sequencing**: deleting a `HeroBanner` or `Tray` re-numbers the remaining records' `sorting_position` to stay contiguous (`heroBanner.controller.js` / `tray.controller.js` `remove` handlers) — preserve this behavior if touching those controllers, it's intentional, not incidental.
- **Movie `genres`/`cast` storage**: stored as JSON-stringified TEXT columns; `genres` has a custom Sequelize getter that JSON-parses on read (falling back to comma-split on parse failure); `cast` has no such getter — it's returned as a raw JSON string to callers. Any code reading `movie.cast` needs to `JSON.parse()` it manually; this is inconsistent with `genres` and easy to trip over.

## 17. Known Technical Considerations

- **`Subscription` model does not exist** but is imported/used in `user.controller.js` (`GET /api/user/subscription`) — this endpoint will throw at runtime. Needs a real `Subscription`/`UserSubscription` model before it can work, or the endpoint needs to be reworked.
- **`src/services/api.js`'s hardcoded-production-URL bug is fixed** (was: `BASE = 'https://nexora-backend1.onrender.com/api'` ignoring `VITE_API_URL`; now: `BASE = \`${import.meta.env.VITE_API_URL}/api\``). Fixed while adding the PayU `paymentsApi` there, since untested/wrong-environment payment calls would have been a correctness bug for that feature. Pages using `api.js` (`SettingsPage`, `SettingsDetailPage`, `PlansPage`, `AdminSubscriptions`, and now `paymentsApi` callers) now correctly hit whatever `VITE_API_URL` points to.
- **`backend/.env` was already committed to git with real secrets before the PayU work** (Railway DB password, JWT secret) — confirmed via `git ls-files`, this repo's root `.gitignore` never excluded `.env` files. PayU credential placeholders (`PAYU_MERCHANT_KEY`/`PAYU_SALT`) were added to that same file, and `.gitignore` has now been updated to exclude `.env`/`backend/.env` going forward — **but this does not remove already-committed secrets from git history**. Before filling in real PayU credentials (or going anywhere near production), rotate the DB password and JWT secret, and strongly consider scrubbing `backend/.env` from git history (e.g. `git filter-repo`) — this is a manual decision for the repo owner, not something to do unprompted.
- **`/admin` has no frontend route guard** and most admin-facing backend endpoints have no `authMiddleware` — effectively the entire CMS is publicly writable by anyone who knows/guesses the URL. Flag this explicitly if the user asks for anything security-adjacent; do not assume it's intentional/acceptable without asking.
- **Frontend login/OTP is fully mocked** (§8) — it does not call the real, already-implemented backend `/api/auth/*` endpoints. If a task involves "fixing login" or "adding real auth," the backend groundwork already exists; the disconnect is entirely on the frontend side.
- **No DB migrations** — schema changes happen via `sequelize.sync({ alter: true })` on every boot. This is workable for a prototype but risky for any real production data; if the user wants safer schema evolution, migrations (`sequelize-cli`) would need to be introduced.
- **`src/data/mockData.js` is dead code** — not imported anywhere in the current app. Confirm before deleting (it's harmless to leave, but don't extend it thinking it's live).
- **`SettingsPage.full_content` is rendered via `dangerouslySetInnerHTML`** in `SettingsDetailPage.jsx` with only a code-comment warning about sanitization — there is no DOMPurify or backend sanitization currently in place. Since this content is only editable via the (currently unguarded) admin panel, this is an XSS risk if admin write access is ever exposed to untrusted users.
- **Uploaded files are stored on local disk** (`backend/uploads/`), not cloud storage — will not survive redeploys on most PaaS hosts. Flag this if productionizing uploads.
- **One-off backend scripts** (`seed*.js`, `create-tray-table.js`, `fix-collation.js`, `test.js`) are meant to be run manually via `node backend/<file>.js`, not imported or run automatically. Several of them **destructively clear tables first** (`seedRemainingData.js`, `seed-trays.js` variants) — never run them against a database with real data without checking their contents first.
- **Backend uses CommonJS, frontend uses ESM** — this is an intentional/inherent split (Node backend vs. Vite/browser frontend), not a bug; don't try to unify module systems across the two package.json boundaries.
- **`backend/.env` in this working copy contains real Railway DB credentials and a placeholder JWT secret** (`your_super_secret_jwt_key_change_in_production`) — flag the placeholder JWT secret if doing any security-related work; it should be rotated before any real production use.

## 18. Rules for Future Claude Sessions

- Always read this file (`CLAUDE.md`) before making changes.
- Inspect the relevant existing code (model, controller, route, and the frontend page/component that consumes it) before implementing any feature — this codebase has enough internal inconsistency (§16/§17) that assumptions from one resource won't necessarily hold for another.
- Follow the existing project architecture and conventions described in §13 rather than introducing new patterns (state libraries, validation libraries, TypeScript, service layers, etc.) unless the user explicitly asks for that change.
- Reuse existing utilities, services, components, and patterns (e.g. the `createMasterController` factory pattern, the `deviceMode` responsive pattern, the list+inline-form admin page pattern) instead of creating parallel new ones.
- Do not create duplicate systems or unnecessary new files/abstractions for something already handled elsewhere.
- Do not modify unrelated code while completing a task.
- Do not redesign the UI (public site or admin) unless explicitly requested — see §14.
- Do not change existing functionality unless required by the task at hand.
- Never expose secrets or backend credentials in frontend code or in this file — see §11 (names only, never values).
- Never put real secret values inside CLAUDE.md.
- Review existing database models (`backend/models/`) before creating new tables/models — check `models/index.js` to see what's actually registered and associated.
- Review existing API route/controller patterns (§6, §10) before adding new endpoints — match the existing thin-controller, try/catch, `{ message }`-on-error style.
- Run `npm run lint` (frontend) after frontend changes; there is no backend lint config or test suite to run currently.
- Be extremely careful before running any backend script or `npm run dev`/`start` in `backend/` — it will `sync({ alter: true })` and potentially seed/mutate whatever database is configured, which currently points at a live Railway MySQL instance (§15).
- Do not implement PayU or any payment provider integration unless separately and explicitly instructed — see §9.
- Keep this file updated when architecture, integrations, payment flows, database structure, or conventions materially change.
