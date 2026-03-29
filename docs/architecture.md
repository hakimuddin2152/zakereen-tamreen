# Architecture Document — Zakereen Tamreen

> **BMAD Phase: Architect**
> Status: Revamped — MVP 1
> Date: 2026-03-29
> Source: prd.md

---

## 1. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | Next.js (App Router) + TypeScript | Full-stack React; SSR + RSC; great DX |
| **UI Library** | Shadcn/ui + Tailwind CSS | Accessible components; mobile-first |
| **Backend** | Next.js API Route Handlers | Single-repo; avoids separate service for MVP 1 |
| **Database** | PostgreSQL (Neon / Supabase free tier) | Relational fit; hosted |
| **ORM** | Prisma | Type-safe DB access; migrations |
| **Auth** | NextAuth.js v5 (Auth.js) | Credentials provider; role support |
| **File Storage** | Cloudflare R2 / AWS S3 | Object storage for audio; signed URLs |
| **Audio Playback** | Native HTML5 `<audio>` element | No extra dependency |
| **Deployment** | Netlify | Zero-config Next.js deployment |

---

## 2. System Architecture

```
Browser (Client)
  Next.js App Router (React Components)
  Tailwind CSS + Shadcn/ui
         | HTTP/HTTPS
Next.js Server (Netlify)
  App Router UI (RSC + Client)    API Route Handlers
                                  /api/auth/*
                                  /api/kalaams/*
                                  /api/sessions/*
                                  /api/members/*
                                  /api/upload/*
                                  /api/audio/*
         |
  PostgreSQL DB                   Object Storage (R2/S3)
  (Neon / Supabase)               Audio files + signed URLs
  Prisma ORM
```

---

## 3. Database Schema

### 3.1 Entity Relationships

```
User (1) ---- (M) SessionAttendee (M) ---- (1) Session
User (1) ---- (M) ReciterEvaluation (M) -- (1) Session
Session (M) - (1) Kalaam
```

### 3.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  GOD
  ADMIN
  PARTY_MEMBER
}

enum KalaamCategory {
  MARASIYA
  SALAAM
  MADEH
  MISC
}

enum MemberGrade {
  A
  B
  C
  D
}

model User {
  id          String       @id @default(cuid())
  username    String       @unique
  displayName String
  partyName   String?                    // stored for future multi-party (MVP 2)
  password    String                     // bcrypt hashed
  role        Role         @default(PARTY_MEMBER)
  grade       MemberGrade?               // overall admin-assigned grade
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  attendances SessionAttendee[]
  evaluations ReciterEvaluation[]
}

model Kalaam {
  id            String         @id @default(cuid())
  title         String
  category      KalaamCategory
  recitedBy     String?
  pdfLink       String?
  audioFileKey  String?
  audioFileName String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  sessions      Session[]
}

model Session {
  id        String   @id @default(cuid())
  date      DateTime
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  kalaamId  String
  kalaam    Kalaam   @relation(fields: [kalaamId], references: [id])

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
  id            String   @id @default(cuid())
  sessionId     String
  userId        String
  ranking       Int?
  voiceRange    String?
  audioFileKey  String?
  audioFileName String?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  session       Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user          User     @relation(fields: [userId], references: [id])

  @@unique([sessionId, userId])
}
```

---

## 4. Business Logic: My Kalaams Status

For a given `(userId, kalaamId)` pair:

1. Find all sessions for that Kalaam where the user is a `SessionAttendee`.
2. Sort by `session.date DESC` — take the most recent session.
3. Check `ReciterEvaluation` for `(latestSession, userId)`:
   - No evaluation on **any** attended session → **Attended Practice**
   - Latest-session evaluation exists, `ranking >= 4` → **Ready**
   - Latest-session evaluation exists, `ranking < 4` → **In Progress**
   - Attended multiple sessions but only older ones evaluated → **Attended Practice**

---

## 5. API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signin` | NextAuth credentials sign-in |
| POST | `/api/auth/signout` | Sign out |
| GET  | `/api/auth/session` | Get current user session |

### Kalaams
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET    | `/api/kalaams` | List all Kalaams (`?category=` optional) | Auth |
| POST   | `/api/kalaams` | Create Kalaam | Admin / God |
| GET    | `/api/kalaams/:id` | Kalaam detail + session list | Auth |
| PATCH  | `/api/kalaams/:id` | Update Kalaam | Admin / God |
| DELETE | `/api/kalaams/:id` | Delete Kalaam (if not in use) | Admin / God |

### Sessions
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET    | `/api/sessions` | List sessions newest-first | Auth |
| POST   | `/api/sessions` | Create session | Admin / God |
| GET    | `/api/sessions/:id` | Session detail + evaluations | Auth |
| PATCH  | `/api/sessions/:id` | Update session | Admin / God |
| DELETE | `/api/sessions/:id` | Delete session + evaluations | Admin / God |

### Evaluations
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| PUT    | `/api/sessions/:id/evaluations/:userId` | Upsert evaluation | Admin / God |
| DELETE | `/api/sessions/:id/evaluations/:userId` | Remove evaluation | Admin / God |

### Members
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET    | `/api/members` | List all members | Admin / God |
| POST   | `/api/members` | Create member | Admin / God |
| GET    | `/api/members/:id` | Member profile + history | Auth (own) / Admin / God |
| PATCH  | `/api/members/:id` | Update name, partyName, grade, isActive | Admin / God |
| POST   | `/api/members/:id/reset-password` | Reset password | Admin / God |

### My Kalaams
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET    | `/api/my-kalaams` | Kalaams grouped by status for current user | Auth |

### User Role Management (God only)
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| GET    | `/api/users` | List all users with roles | God |
| PATCH  | `/api/users/:id/role` | Set role (ADMIN or PARTY_MEMBER) | God |

### Audio
| Method | Route | Description | Role |
|--------|-------|-------------|------|
| POST   | `/api/upload` | Get presigned PUT URL | Admin / God |
| DELETE | `/api/upload/:key` | Delete file from storage | Admin / God |
| GET    | `/api/audio/:key` | Get signed playback URL (15 min TTL) | Auth |

---

## 6. Frontend Pages & Routing

```
/                           -> redirect to /kalaams
/login                      -> Login page
/kalaams                    -> Main screen: Kalaams by category
/kalaams/[id]               -> Kalaam detail: session history, audio player, PDF link
/my-kalaams                 -> My Kalaams: Ready / In Progress / Attended Practice
/sessions                   -> Sessions list
/sessions/new               -> Create session (Admin / God)
/sessions/[id]              -> Session detail + evaluation panel
/members                    -> Party Members list (Admin / God)
/members/[id]               -> Member profile + evaluation history
/admin/kalaams              -> Kalaam management
/admin/members              -> Member management: add, grade, deactivate
/admin/users                -> User role management (God only)
```

---

## 7. Security Design

| Concern | Approach |
|---------|---------|
| Password storage | bcrypt, salt rounds = 12 |
| Session tokens | JWT via NextAuth, httpOnly cookies |
| Route protection | Middleware checks session + role on every protected route |
| File access | Audio served via time-limited signed URLs (15 min) |
| SQL injection | Prisma parameterised queries |
| XSS | React default escaping; no dangerouslySetInnerHTML |
| CSRF | NextAuth CSRF tokens on sign-in |
| Brute force | 5 failed attempts -> 15 min lockout |
| Input validation | Zod schemas on all API route inputs |
| Role escalation | GOD role seeded only; cannot be set via normal API |

---

## 8. File Upload Flow

```
Admin uploads audio (Kalaam or evaluation):
  1. POST /api/upload       -> returns { uploadUrl, fileKey } (presigned PUT, 10 min TTL)
  2. PUT {uploadUrl}        -> browser uploads bytes direct to R2/S3
  3. PATCH /api/kalaams/:id
     OR PUT /api/sessions/:id/evaluations/:userId
       body: { audioFileKey }  -> stored in DB

Playback (any authenticated user):
  1. GET /api/audio/:key    -> returns signed GET URL (15 min TTL)
  2. Browser plays from signed URL
```

---

## 9. Environment Variables

```env
DATABASE_URL=

NEXTAUTH_SECRET=
NEXTAUTH_URL=

STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_ENDPOINT=
```
