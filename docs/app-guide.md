# Zakereen Tamreen — App Guide

A private web app for managing Marasiya/Noha recitation group practice.

---

## 1. Tech Stack Architecture

### Runtime & Framework
| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, React 19) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS v4** + `tw-animate-css` |
| UI Components | **shadcn/ui** (Radix UI primitives) |
| Icons | **Lucide React** |
| Toast notifications | **Sonner** |

### Data Layer
| Layer | Technology |
|---|---|
| ORM | **Prisma 7** with the `@prisma/adapter-pg` driver adapter |
| Database | **PostgreSQL** (any provider — Supabase, Neon, Railway, etc.) |
| DB connection | `pg` pool passed into Prisma via the driver adapter; auto-enables SSL for remote hosts |

### Auth
| Concern | Detail |
|---|---|
| Library | **NextAuth v5** (`next-auth@5.0.0-beta`) |
| Strategy | **JWT sessions** (no database session table) |
| Provider | **Credentials** only (username + password) |
| Password hashing | **bcryptjs** (cost factor 12) |
| Token payload | `id`, `role`, `partyId` stored in the JWT and exposed via `session.user` |

### File Storage
| Concern | Detail |
|---|---|
| SDK | **AWS SDK v3** (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) |
| Backend | **Cloudflare R2** (S3-compatible; configured via `STORAGE_ENDPOINT`) |
| Upload flow | Presigned PUT URL (5 min TTL) — client uploads directly to R2, never through Next.js |
| Playback/PDF flow | Presigned GET URL (15 min TTL) — returned by a server-side API route, never in HTML source |

### Deployment
| Concern | Detail |
|---|---|
| Host | **Netlify** |
| Plugin | `@netlify/plugin-nextjs` |
| Build root | `app/` directory (`base = "app"` in `netlify.toml`) |
| Build command | `npm run build` → runs `prisma generate && next build` |

---

## 2. Feature Implementation Map

### Audio Playback
Files: `src/components/evaluations/audio-player.tsx`, `src/app/api/audio/[...key]/route.ts`

- On page load, only a **"▶ Play" link** is rendered — no URL in the DOM.
- On click, the component calls `GET /api/audio/<fileKey>`.
- The API route verifies the session, then calls `getPresignedPlaybackUrl(fileKey)` in `src/lib/storage.ts`, which generates a **15-minute presigned R2 GET URL**.
- The signed URL is set as the `src` of a native `<audio controls>` element.
- Used in: kalaam detail page, practice recordings card, evaluation dialog, session recordings.

### PDF Viewer
Files: `src/components/kalaams/pdf-viewer.tsx`, `src/app/api/pdf/[...key]/route.ts`

- Renders as a **"📄 View PDF"** button.
- On click, if a `pdfLink` (external URL) is stored, it's used directly. If a `pdfFileKey` (R2) is stored, the component calls `GET /api/pdf/<fileKey>`.
- The API route verifies the session, then returns a **15-minute presigned R2 URL** with `ResponseContentDisposition: inline` and `ResponseContentType: application/pdf`.
- The PDF is displayed inside a **fullscreen modal** using a native `<iframe>`. An "Open in new tab ↗" link is also provided.
- Max PDF upload size: **20 MB**.

### File Upload (Audio & PDF)
File: `src/app/api/upload/route.ts`

Flow:
1. Client sends `POST /api/upload` with `{ contentType, contentLength, context, kalaamId?, sessionId?, userId? }`.
2. Server validates auth, permissions, file type, and size.
3. Server generates a **5-minute presigned R2 PUT URL** and returns it along with the computed `fileKey`.
4. Client uploads the file directly to R2 via `XMLHttpRequest` (to track progress).
5. Client saves the `fileKey` reference to the database via a separate API call.

File key structure:
- Kalaam audio: `kalaams/<kalaamId>/<uuid>.<ext>`
- Kalaam PDF: `kalaams/<kalaamId>/pdf/<uuid>.pdf`
- Session evaluation: `sessions/<sessionId>/<userId>/<uuid>.<ext>`
- Practice recording: `recordings/<userId>/<kalaamId>/<uuid>.<ext>`

Audio limits: **50 MB**, formats: mp3, wav, m4a, ogg, webm.

### In-Browser Live Recording
File: `src/components/kalaams/kalaam-recordings.tsx`

- Uses the browser's `MediaRecorder` API to capture mic audio as `audio/webm`.
- A live timer shows elapsed recording time.
- On stop, the recorded chunks are assembled into a `Blob`, wrapped in a `File`, and passed through the same upload flow as a file upload.

### Practice Recordings
File: `src/components/kalaams/kalaam-recordings.tsx`

- Each member can upload or record up to **3 practice recordings** per kalaam (oldest auto-dropped on save).
- Recordings can be shared with specific other members via `POST /api/kalaams/<kalaamId>/recordings/<recordingId>/share`.

### Evaluation System
- Members self-track two prerequisites per kalaam: **Grasped Lehen** and **Read Twice** (component: `prerequisite-toggle.tsx`).
- Once both are done (and at least one recording exists for non-coordinators), a **"Request Evaluation"** button appears (`eval-request-button.tsx`).
- Coordinators review pending requests via `src/app/(protected)/my-kalaams` / admin eval request table.
- Evaluations in sessions are done via `EvaluationDialog` — star ranking (1–5), voice range notes, free-text notes.

### Kalaam Browser
File: `src/components/kalaams/kalaam-browser.tsx`

- Grouped by category (Marasiya → Salaam → Madeh → Misc).
- Categories are **collapsible**; auto-expand when searching.
- Inline search filters by title and reciter name.
- Each row shows session count, audio play button, and PDF button if available.
- Supports a **selectable/checkbox mode** (used by the Majlis add-kalaams dialog).

### Majlis (Event Setlist)
- MC creates a Majlis with a date and occasion.
- Kalaams are added to the setlist; specific members (from any party) are assigned to recite each kalaam.
- PC can only assign members from their own party.

---

## 3. Role & Permission System
File: `src/lib/permissions.ts`

| Role | Description |
|---|---|
| `GOD` | Developer/owner. Bypasses all permission checks. Access to `/admin/users`. |
| `MC` | Mauze Coordinator. Can manage all parties, sessions, majlis, evaluations, grades. |
| `PC` | Party Coordinator. Manages their own party — sessions, members, evaluations within party. |
| `PM` | Party Member. Has a `partyId`. Can manage own prerequisites/recordings. |
| `IM` | Individual Member. No party. Same permissions as PM. |

Permission checks use `can(role, Permission.SOME_PERMISSION)` and `isCoordinator(role)` (returns true for GOD/MC/PC) from `src/lib/permissions.ts`. All API routes and page guards check these.

Route protection is in two places:
- **`src/middleware.ts`** — Edge-compatible, guards page routes, redirects unauthenticated users and unauthorised roles.
- **API routes** — Each route calls `auth()` and checks permissions inline.

---

## 4. Database Schema Summary

Core models in `prisma/schema.prisma`:

| Model | Purpose |
|---|---|
| `User` | Members with role, optional partyId, hashed password |
| `Party` | Group with one coordinator, many members |
| `Kalaam` | A recitation piece — category, audio/PDF file keys, vocal range |
| `Session` | Practice session — date, party (or open), attendees, kalaams |
| `SessionKalaam` | Junction: which kalaams were practiced in a session |
| `SessionAttendee` | Junction: who attended a session |
| `ReciterEvaluation` | Coordinator's evaluation of a member for a kalaam in a session |
| `KalaamPrerequisite` | Per-user lehenDone + hifzDone flags per kalaam |
| `KalaamRecording` | Practice audio uploaded by a member |
| `KalaamRecordingShare` | Who a recording has been shared with |
| `KalaamEvalRequest` | Member's request for an official evaluation (PENDING → EVALUATED/REJECTED) |
| `Majlis` | An event/occasion setlist |
| `MajlisKalaam` | Kalaams selected for a Majlis |
| `MajlisKalaamMember` | Members assigned to recite a MajlisKalaam |

IDs are `cuid()`. All relations that make logical sense have `onDelete: Cascade`.

---

## 5. Project Structure

```
app/
├── prisma/
│   ├── schema.prisma       # Single source of truth for the DB
│   └── seed.ts             # Full clean-slate seed with test users
├── src/
│   ├── app/
│   │   ├── (protected)/    # All authenticated pages (layout checks auth)
│   │   │   ├── kalaams/    # Browse + detail pages
│   │   │   ├── sessions/   # Session list + detail
│   │   │   ├── majlis/     # Majlis list + detail
│   │   │   ├── members/    # Member list
│   │   │   ├── my-kalaams/ # Member's personal practice tracker
│   │   │   ├── my-majlis/  # Member's upcoming majlis assignments
│   │   │   └── admin/      # Coordinator-only management pages
│   │   ├── api/            # All API routes (REST, server-side only)
│   │   └── login/          # Public login page
│   ├── components/
│   │   ├── evaluations/    # AudioPlayer, EvaluationDialog, EvalRequestButton
│   │   ├── kalaams/        # KalaamBrowser, PdfViewer, KalaamRecordings, PrerequisiteToggle
│   │   ├── majlis/         # Majlis management components
│   │   ├── parties/        # Party management components
│   │   ├── sessions/       # Session form + actions
│   │   ├── layout/         # Navbar
│   │   └── ui/             # shadcn/ui primitives (Button, Dialog, Badge, etc.)
│   └── lib/
│       ├── auth.ts         # NextAuth config + authorize logic
│       ├── db.ts           # Prisma client singleton (pool-based)
│       ├── storage.ts      # R2/S3 helpers (presigned URLs, validation)
│       ├── permissions.ts  # RBAC — all Permission constants + role maps
│       ├── validations.ts  # Zod schemas for API request bodies
│       └── utils.ts / utils-date.ts  # Misc helpers
```

---

## 6. Environment Variables

Create `app/.env.local`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/zakereen_tamreen"

# NextAuth — generate with: openssl rand -hex 32
AUTH_SECRET="..."
AUTH_URL="https://your-domain.netlify.app"   # http://localhost:3000 for dev

# Cloudflare R2 (or any S3-compatible store)
STORAGE_BUCKET="zakereen-audio"
STORAGE_REGION="auto"
STORAGE_ACCESS_KEY_ID="..."
STORAGE_SECRET_ACCESS_KEY="..."
STORAGE_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"

# Optional — override default seed passwords
SEED_GOD_PASSWORD="..."
SEED_MC_PASSWORD="..."
SEED_PC_PASSWORD="..."
SEED_MEMBER_PASSWORD="..."
```

---

## 7. Deployment Steps

### Local Development

```bash
cd app
cp .env.example .env.local   # then fill in values
npm install
npm run db:push              # applies schema to the DB
npm run db:seed              # seeds initial users and sample data
npm run dev                  # starts on http://localhost:3000
```

### Netlify Production

1. **Connect the repo** to Netlify. Set build settings:
   - Base directory: `app`
   - Build command: `npm run build`
   - Publish directory: `.next`
   - The `netlify.toml` at the repo root already configures all of this.

2. **Add environment variables** in Netlify → Site settings → Environment variables (all vars from the section above, with production values for `AUTH_URL` and the database/storage credentials).

3. **Generate Prisma client** — `npm run build` already runs `prisma generate` before `next build`, so no extra step is needed.

4. **Apply DB schema** — Run once from local against the production `DATABASE_URL`:
   ```bash
   DATABASE_URL="<prod-url>" npm run db:push
   ```

5. **Seed production (first deploy only)**:
   ```bash
   DATABASE_URL="<prod-url>" npm run db:seed
   ```
   Default `GOD` account username is `god` — change the password immediately after first login.

6. **Subsequent deploys** — push to the connected branch; Netlify auto-builds and deploys.

---

## 8. Good to Know

### Health Check
`GET /api/health` — runs `SELECT 1` against the DB and returns `{ db: "connected" }`. Excluded from auth middleware. Useful for uptime monitoring.

### Prisma Driver Adapter
The app uses `@prisma/adapter-pg` (the pg pool adapter) instead of the default Prisma TCP connection. This avoids connection limits on serverless hosts like Netlify Functions. SSL is auto-enabled for any non-localhost `DATABASE_URL`.

### Presigned URL Security
R2 file keys are never exposed in page HTML. All access goes through the Next.js API (`/api/audio/...` and `/api/pdf/...`) which verify the JWT session before issuing a signed URL. The signed URLs expire in 15 minutes.

### Edge-Safe Auth Config
`src/auth.config.ts` (used in middleware) does **not** import Prisma or pg — those are not Edge-compatible. The full `src/lib/auth.ts` uses a dynamic `import()` for `db` inside the `authorize` function to avoid bundling Node.js modules into the Edge runtime.

### Prisma Client Location
Generated client is output to `src/generated/prisma/` (configured in `schema.prisma`). This is intentional to keep it inside the `src/` tree for the TypeScript compiler.

### Styling Approach
Tailwind v4 is used with the new CSS-first configuration (`@import "tailwindcss"` in `globals.css`). There is no `tailwind.config.js`. Theme tokens (colors, radius, shadows) are defined as CSS custom properties in `globals.css`. shadcn components follow the `shadcn/tailwind.css` import.

### Seed Accounts
After running `npm run db:seed`, the following test users are created (passwords defined by seed env vars, defaulting to `admin@123` / `user@123`):

| Username | Role |
|---|---|
| `god` | GOD |
| `mc1` | MC |
| `pc1`, `pc2` | PC (one per party) |
| various members | PM / IM |

### DB Studio
```bash
npm run db:studio
```
Opens Prisma Studio at `http://localhost:5555` — a browser-based DB editor. Useful for quickly inspecting or editing data during development.

### Middleware Redirects
Legacy paths are redirected in `src/middleware.ts`:
- `/` → `/kalaams` (if logged in) or `/login`
- `/dashboard` → `/kalaams`
- `/reciters` → `/admin/members`
- `/admin` or `/admin/` → `/admin/members`
