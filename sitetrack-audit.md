# SiteTrack — Principal Engineer Audit

> Conducted: 2026-06-28  
> Branch: `main` (pre-slices baseline)  
> Auditor: Claude Sonnet 4.6

---

## What the App Is Actually Doing

SiteTrack is a functional CRUD application for construction site management. It has a real Express/MongoDB backend, real React frontend, real JWT auth, and real API wiring throughout. This is not a prototype — the core data flows work. A manager can create projects and tasks, assign workers, log attendance, and review work logs. A worker can check in, view tasks, and submit daily updates.

However: **the UI shell is a purchased TailAdmin template** (`client/package.json` name: `tailadmin-react`, version `2.3.0`). A significant portion of the visual polish is not custom-built. That is not a disqualifier, but it needs to be understood as the baseline — the product work is in the data layer and the wiring, not the design.

The app ran entirely on localhost at audit time. There was no deployment config, no production database, no email infrastructure, and no utility pages of any kind. It was a working local prototype that had not crossed the line into a shippable product.

---

## Classification Summary

| Area | Status |
|------|--------|
| Auth (login/register/JWT) | DONE |
| Auth (password reset) | BROKEN |
| Roles (binary manager/worker) | DONE |
| Backend routes | DONE |
| Database models | DONE |
| Database (production-ready) | NOT STARTED |
| Client pages (existing) | DONE |
| Client-server wiring | DONE |
| React routing / route protection | DONE |
| Tasks | DONE |
| Task attachments | BROKEN |
| Projects | DONE |
| Workers | DONE |
| Worker-User account linking | PARTIAL |
| Error handling (server) | PARTIAL |
| Error handling (client, monitoring) | NOT STARTED |
| Utility / calculator pages | NOT STARTED |
| File upload (storage backend) | NOT STARTED |
| Email system | NOT STARTED |
| Production deployment | NOT STARTED |
| Pagination | NOT STARTED |
| Rate limiting | NOT STARTED |
| Shared TypeScript types | NOT STARTED |
| Supabase integration | UNCLEAR |
| Calendar ↔ Project/Task link | NOT STARTED |

---

## Auth
**Classification: PARTIAL**

What works:
- JWT registration, login, token validation, and role-based redirect are all real and end-to-end.
- `ProtectedRoute` and `RoleRoute` correctly gate pages on both client and server.
- Password change flow is real.

What is broken or wrong:

- **Password reset is non-functional.** `POST /api/auth/reset-password` generates a reset token and **returns it directly in the API response** (`server/routes/authRoutes.js` line ~137). There is no email infrastructure. No SMTP, no SendGrid, no Resend — nothing. The reset flow exists in the UI and the model but cannot actually deliver a reset link to a user. This feature is broken by design.
- **JWT secret is a placeholder.** `server/.env` line 3: `JWT_SECRET=sitetrack_jwt_secret_change_in_production_2026`. The comment is in the value itself.
- **Tokens stored in localStorage.** `client/src/lib/api.ts` reads from `localStorage.getItem('st_token')`. Vulnerable to XSS.
- **CORS is wide open.** `server/server.js` uses `app.use(cors())` with no configuration. Any origin can call the API.
- **No rate limiting.** Auth endpoints (`/login`, `/register`, `/reset-password`) have no brute-force protection.

---

## Roles
**Classification: DONE**

Binary manager/worker role system. Enforced server-side via `server/middleware/requireRole.js`, enforced client-side via `client/src/components/auth/RoleRoute.tsx`. Role is stamped at registration and stored in the JWT claim. Works correctly and is consistently applied.

Limitation: the role system is binary — there is no admin, no read-only, no supervisor — which may become a constraint once professional utilities land.

---

## Backend Routes
**Classification: DONE**

25 real endpoints across 8 route groups. None are stubs. All have try/catch, real DB queries, and proper status codes (400, 401, 403, 404, 409, 500). Role enforcement is applied correctly on mutation endpoints.

One issue: **`POST /api/attendance/migrate`** was still a live endpoint at audit time. This was a one-time data migration from an older schema (Worker embedded attendance array → standalone Attendance collection). It had no business being in a production API. *(Removed in Slice 5.)*

No pagination on any list endpoint. `GET /api/task`, `GET /api/project`, `GET /api/worker` return all records. Performance risk at scale.

---

## Database Models
**Classification: DONE**

Seven Mongoose models, all complete: `User`, `Worker`, `Project`, `Task`, `Attendance`, `WorkLog`, `CalendarEvent`. Schemas have validation, enums, indexes, and nested sub-documents. The data modelling is the strongest part of the codebase.

Two observations:
- `server/models/Worker.js` still has a legacy `attendance` array field (the old schema). The migration moved data out of it, but the field definition was not removed.
- `CalendarEvent` has no foreign keys to Project or Task. Events exist in isolation. The calendar is decorative at this point.

---

## Database
**Classification: PARTIAL**

MongoDB via Mongoose. Connection is real and `.env`-driven (`server/config/db.js`). Works correctly on localhost.

What is missing:
- **No production database.** `MONGO_URI` points to `mongodb://127.0.0.1:27017/sitetrack`.
- **No database backup strategy.**
- Express 5.2.1 is in use — the first stable v5 release, not v4 battle-tested.

---

## Client Pages & Page Wiring
**Classification: DONE (for existing pages)**

All existing pages call real API endpoints via `authFetch()` in `client/src/lib/api.ts`. No mock data, no hardcoded fixtures in production code. Dashboard, Tasks, Projects, Workers, WorkLogs, Analytics, Calendar, Settings, and all Worker-role pages are real.

One fragile pattern: **`client/src/pages/Worker/WorkerProfile.tsx`** has a fallback that searches all workers by name if `/api/worker/me` fails. If a worker account is not linked to a Worker record, the page silently falls back to a name-search that may return the wrong record or no record.

**Hardcoded API base URLs** existed in four separate files at audit time:
- `client/src/lib/api.ts` line 1
- `client/src/context/AuthContext.tsx` line 3
- `client/src/components/auth/ResetPasswordForm.tsx` line 7
- `client/src/components/auth/UpdatePasswordForm.tsx` line 7

All pointed to `http://localhost:5000`. *(Fixed in Slice 1.)*

---

## React Routing
**Classification: DONE**

React Router v7, `ProtectedRoute`, `RoleRoute`. All routes are protected correctly. Public routes are clearly separated. No issues with the routing setup itself.

---

## Tasks
**Classification: DONE (core) / BROKEN (attachments)**

Full CRUD, kanban drag-drop, filtering, saved views (persisted in localStorage), recurring task support, subtasks, comments, attachments, activity log. The most feature-complete part of the app.

**Attachments are UI-only.** The attachment tab in the task drawer (`client/src/pages/Tasks.tsx`) renders an upload zone and displays uploaded file names, but there is no file storage backend. No S3, no Cloudinary, no server endpoint for file upload. Files are tracked in state only and lost on page refresh. *(Removed in Slice 3.)*

---

## Projects
**Classification: DONE**

Full CRUD, milestones, comments, activity feed, budget tracking. Well-implemented.

---

## Workers
**Classification: DONE**

Full CRUD, certifications, attendance history, notes. The attendance tab in the worker drawer correctly fetches from `/api/attendance?workerId=<id>`. Solid implementation.

---

## Error Handling
**Classification: PARTIAL**

Server: consistent try/catch with meaningful status codes and JSON error messages.  
Client: toast notifications and error state banners exist in most pages.

What is missing:
- **No error monitoring.** No Sentry, no LogRocket, no structured logging on the server.
- **`console.log` debugging left in production code.** Several pages log API responses to the console.
- **No 404 handling on the server.** No catch-all 404 handler in `server/server.js`. *(Fixed in Slice 5.)*
- **No global error boundary on the client.** A JS exception in a page component crashes the full app view. *(Fixed in Slice 5.)*

---

## Utility Pages
**Classification: NOT STARTED**

There were no utility or calculator pages at audit time. None. The analytics page and calendar exist as part of the main app, but there were zero public-facing utilities, zero calculators, and zero standalone tools. *(First utility page added in Slice 6.)*

---

## Architecture — Messy Areas

### 1. Supabase installed but unused
`client/package.json` declared `@supabase/supabase-js` as a dependency. `client/.env` contained real Supabase credentials. `client/src/lib/supabase.ts` initialised a Supabase client. **None of it was used anywhere in the app.** Auth is JWT-based via the custom server. A live Supabase project was sitting there with credentials exposed in the env file, connected to nothing. *(Removed in Slice 2.)*

### 2. `client-old/` should not have existed
An abandoned old React version was in the repo root. Not linked, not imported, not deployed. *(Deleted in Slice 1.)*

### 3. Test files at the repo root
`test-*.mjs` and `test-screenshots/` scattered at the root alongside `package.json`. Should be in a `tests/` or `e2e/` directory.

### 4. Client package named `tailadmin-react`
`client/package.json` `name` field was `tailadmin-react`, version `2.3.0`. *(Renamed to `sitetrack-client` in Slice 1.)*

### 5. No shared TypeScript types
TypeScript types for Task, Project, Worker, etc. are re-declared inline in each page component. No `types/` or `@shared/` directory. When a model changes, it needs updating in multiple places.

---

## Duplicated Code

- `getStatusStyles()`, `getPriorityStyles()` — defined separately in `Tasks.tsx`, `Projects.tsx`, and `Workers.tsx`. Should be in a shared `utils/styles.ts`.
- Date formatting functions duplicated across pages.
- Form validation patterns duplicated in every CRUD form.

Low severity now, will compound as the codebase grows.

---

## What Was Missing (at audit time)

| Gap | Severity |
|-----|----------|
| Email infrastructure (password reset broken) | Critical |
| File upload backend (attachments UI was fake) | High |
| Production deployment config (localhost everywhere) | High |
| API URL as environment variable | High |
| No utility pages (core product direction) | High |
| No pagination on list endpoints | Medium |
| No rate limiting on auth endpoints | Medium |
| No error monitoring (Sentry or equivalent) | Medium |
| No global error boundary on client | Medium |
| No server-side 404 handler | Low |
| Supabase client installed but unused | Low |
| Migration endpoint still live | Low |
| Shared TypeScript types | Low |
| `client-old/` still in repo | Low |

---

## Slices Executed Post-Audit

| # | Slice | Outcome |
|---|-------|---------|
| 1 | Config & dead code | API URLs moved to `VITE_API_URL` env var across 4 files; `client-old/` deleted; package renamed |
| 2 | Remove Supabase | Package, credentials, and `supabase.ts` removed entirely |
| 3 | Remove fake attachments | Attachment tab, state, handler, and types removed from `Tasks.tsx`; 13 targeted edits; TypeScript clean |
| 4 | Email + password reset | Resend wired up; reset endpoint sends email link; token never returned in response; client forms rewritten |
| 5 | Server hardening | CORS restricted to `ALLOWED_ORIGINS`; rate limiting on auth endpoints; 404 handler; global error handler; migration endpoint removed; React `ErrorBoundary` added |
| 6 | First public utility | `/utilities/brick-calculator` — public route, no auth, live brick/mortar calculation, CTA to `/signup` |
