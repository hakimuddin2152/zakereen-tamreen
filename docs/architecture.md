# Architecture Document — Zakereen Tamreen

> **BMAD Phase: Architect**  
> Status: Draft  
> Date: 2026-03-28  
> Source: prd.md

---

## 1. Technology Stack Decisions

### Rationale
The app is a small-group community tool. The stack prioritises:
- Rapid development
- Easy deployment (single developer)
- Strong ecosystem for auth + file uploads
- Mobile-friendly UI out of the box

### Chosen Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | Full-stack React framework; SSR for SEO-free apps is still convenient; great DX |
| **UI Library** | Shadcn/ui + Tailwind CSS | Accessible components, highly customisable, mobile-first |
| **Backend** | Next.js API Routes (Route Handlers) | Single repo — avoids separate backend service for v1 |
| **Database** | PostgreSQL (via Neon or Supabase) | Relational data fits perfectly; hosted free tier available |
| **ORM** | Prisma | Type-safe DB access; easy migrations |
| **Auth** | NextAuth.js v5 (Auth.js) | Credentials provider for username/password; role support |
| **File Storage** | Cloudflare R2 or AWS S3 | Cheap object storage for audio files; signed URLs for security |
| **Audio Playback** | Native HTML5 `<audio>` element | No extra dependency; works on all browsers |
| **Deployment** | Vercel (frontend + API) | Zero-config Next.js deployment |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│         Next.js App Router (React Components)            │
│              Tailwind CSS + Shadcn/ui                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                  Next.js Server (Vercel)                  │
│  ┌─────────────────┐   ┌────────────────────────────┐   │
│  │  App Router UI  │   │  API Route Handlers        │   │
│  │  (RSC + Client) │   │  /api/auth/*               │   │
│  │                 │   │  /api/sessions/*            │   │
│  │                 │   │  /api/reciters/*            │   │
│  │                 │   │  /api/upload/*              │   │
│  └─────────────────┘   └──────────────┬─────────────┘   │
└──────────────────────────────────────┼──────────────────┘
                                        │
           ┌────────────────────────────┼──────────────┐
           │                            │               │
┌──────────▼──────────┐   ┌────────────▼──────────┐   │
│   PostgreSQL DB      │   │  Object Storage (R2)   │   │
│   (Neon / Supabase)  │   │  Audio files           │   │
│   Prisma ORM         │   │  Signed URL access     │   │
└─────────────────────┘   └───────────────────────┘
```

---

## 3. Database Schema

### 3.1 Entity Relationship Overview

```
User (1) ──── (M) SessionAttendee (M) ──── (1) Session
User (1) ──── (M) ReciterEvaluation (M) ── (1) Session
Session (M) ─ (1) Kalaam
Kalaam (M) ── (1) LehenType (optional predefined)
```

### 3.2 Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  RECITER
}

model User {
  id          String   @id @default(cuid())
  username    String   @unique
  displayName String
  password    String   // bcrypt hashed
  role        Role     @default(RECITER)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attendances  SessionAttendee[]
  evaluations  ReciterEvaluation[]
}

model Kalaam {
  id        String   @id @default(cuid())
  title     String
  poet      String?
  language  String?  @default("Urdu")
  lyrics    String?  // optional full text
  createdAt DateTime @default(now())

  sessions  Session[]
}

model LehenType {
  id       String    @id @default(cuid())
  name     String    @unique  // e.g., "Bayat", "Saba"
  sessions Session[]
}

model Session {
  id          String   @id @default(cuid())
  date        DateTime
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  kalaamId    String
  kalaam      Kalaam   @relation(fields: [kalaamId], references: [id])

  lehenTypeId String?
  lehenType   LehenType? @relation(fields: [lehenTypeId], references: [id])
  lehenNotes  String?   // free-text override if needed

  attendees   SessionAttendee[]
  evaluations ReciterEvaluation[]
}

model SessionAttendee {
  id        String  @id @default(cuid())
  sessionId String
  userId    String

  session   Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id])

  @@unique([sessionId, userId])
}

model ReciterEvaluation {
  id           String   @id @default(cuid())
  sessionId    String
  userId       String
  ranking      Int?     // 1–5
  voiceRange   String?  // "Tenor", "Bass", etc. or free text
  audioFileKey String?  // S3/R2 object key
  audioFileName String? // original filename for display
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  session      Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user         User    @relation(fields: [userId], references: [id])

  @@unique([sessionId, userId])
}
```

---

## 4. API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signin` | NextAuth credentials sign-in |
| POST | `/api/auth/signout` | Sign out |
| GET | `/api/auth/session` | Get current session/user |

### Sessions
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET | `/api/sessions` | List all sessions (paginated) | Auth |
| POST | `/api/sessions` | Create new session | Admin |
| GET | `/api/sessions/:id` | Get session detail | Auth |
| PATCH | `/api/sessions/:id` | Update session | Admin |
| DELETE | `/api/sessions/:id` | Delete session | Admin |
| POST | `/api/sessions/:id/attendance` | Set attendees | Admin |

### Evaluations
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET | `/api/sessions/:id/evaluations` | Get all evaluations for session | Auth |
| PUT | `/api/sessions/:id/evaluations/:userId` | Upsert evaluation for reciter | Admin |
| DELETE | `/api/sessions/:id/evaluations/:userId` | Remove evaluation | Admin |

### Audio Upload
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| POST | `/api/upload/audio` | Get presigned upload URL | Admin |
| DELETE | `/api/upload/audio/:key` | Delete audio file | Admin |
| GET | `/api/upload/audio/:key/url` | Get signed playback URL | Auth |

### Reciters
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET | `/api/reciters` | List all reciters | Admin |
| POST | `/api/reciters` | Create reciter | Admin |
| GET | `/api/reciters/:id` | Get reciter profile | Auth (own) / Admin |
| PATCH | `/api/reciters/:id` | Update reciter | Admin |
| POST | `/api/reciters/:id/reset-password` | Reset password | Admin |

### Kalaam Library
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET | `/api/kalaam` | List kalaams | Auth |
| POST | `/api/kalaam` | Create kalaam | Admin |
| PATCH | `/api/kalaam/:id` | Update kalaam | Admin |

---

## 5. Frontend Pages & Routing

```
/                           → Redirect to /dashboard or /login
/login                      → Login page
/dashboard                  → Session list (all users)
/sessions/new               → Create session form (admin)
/sessions/[id]              → Session detail + evaluation panel
/reciters                   → Reciter list (admin)
/reciters/[id]              → Reciter profile (own + admin)
/admin                      → Admin panel (user management)
/admin/kalaam               → Kalaam library management
/admin/settings             → Lehen types + voice range options
```

---

## 6. Security Design

| Concern | Approach |
|---------|---------|
| Password storage | bcrypt with salt rounds = 12 |
| Session tokens | JWT via NextAuth, httpOnly cookies |
| Route protection | Middleware checks session + role before every protected route |
| File access | Audio files served via time-limited signed URLs (15 min expiry) — never public |
| SQL injection | Prisma parameterised queries — not vulnerable |
| XSS | React escapes output by default; no dangerouslySetInnerHTML |
| CSRF | NextAuth handles CSRF tokens on sign-in |
| Brute force | Rate limit login endpoint (5 attempts → 15 min lockout) |
| Input validation | Zod schemas on all API route inputs |

---

## 7. File Upload Flow

```
Admin browser
    │
    ├─ 1. POST /api/upload/audio  →  Server generates presigned PUT URL (R2/S3)
    │                                Returns: { uploadUrl, fileKey }
    │
    ├─ 2. PUT {uploadUrl} (audio file bytes)  →  Direct upload to R2/S3
    │                                            (bypasses server — saves bandwidth)
    │
    └─ 3. PUT /api/sessions/:id/evaluations/:userId
            body: { audioFileKey: fileKey, ... }
            → Stores fileKey in DB

Reciter playback
    │
    ├─ 1. GET /api/upload/audio/:key/url  →  Server generates presigned GET URL (15 min)
    │
    └─ 2. Browser plays audio from signed URL
```

---

## 8. Environment Variables

```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Object Storage (Cloudflare R2 or AWS S3)
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_ENDPOINT=        # R2-specific endpoint

# App
NEXT_PUBLIC_APP_NAME="Zakereen Tamreen"
```

---

## 9. Project Folder Structure

```
zakereen-tamreen/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (protected)/
│   │   │   ├── layout.tsx            # Auth guard wrapper
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── sessions/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── reciters/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── kalaam/page.tsx
│   │   │       └── settings/page.tsx
│   │   └── api/                      # API Route Handlers
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── sessions/
│   │       ├── reciters/
│   │       ├── kalaam/
│   │       └── upload/
│   ├── components/
│   │   ├── ui/                       # Shadcn components
│   │   ├── layout/                   # Navbar, Sidebar
│   │   ├── sessions/                 # Session-specific components
│   │   ├── evaluations/              # Evaluation forms, audio player
│   │   └── reciters/                 # Reciter profile components
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── storage.ts                # R2/S3 helpers
│   │   └── validations/              # Zod schemas
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/                             # BMAD docs (this folder)
├── public/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 10. Development Phases

| Phase | Milestone | Stories |
|-------|-----------|---------|
| **Phase 1** | Auth + Scaffold | Login, role middleware, nav shell |
| **Phase 2** | Core Data | Sessions CRUD, attendance, kalaam |
| **Phase 3** | Evaluations | Rankings, voice range, evaluation forms |
| **Phase 4** | Audio | Upload flow, playback, storage |
| **Phase 5** | Profiles & Admin | Reciter profiles, admin panel |
| **Phase 6** | Polish | Search/filter, validation, UX improvements |

---

*Next Phase: Stories → Scrum Master*
