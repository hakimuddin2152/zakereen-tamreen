# User Stories — Zakereen Tamreen

> **BMAD Phase: Scrum Master**  
> Status: Draft  
> Date: 2026-03-28  
> Source: prd.md + architecture.md

Stories are ordered by development phase. Each story follows: **As a [role], I want [goal], so that [benefit].**

---

## Epic 1: Authentication & Setup

### Story 1.1 — Project Scaffold
**Type:** Technical Task  
**As a** developer,  
**I want** the Next.js project scaffolded with TypeScript, Tailwind, Shadcn/ui, Prisma, and NextAuth,  
**so that** the development environment is ready.

**Acceptance Criteria:**
- [ ] `npx create-next-app` run with TypeScript + Tailwind
- [ ] Shadcn/ui initialised
- [ ] Prisma installed and connected to PostgreSQL
- [ ] NextAuth.js v5 installed
- [ ] `.env.local` template created
- [ ] App runs on `localhost:3000`

---

### Story 1.2 — Login Page
**As a** reciter or admin,  
**I want** to log in with my username and password,  
**so that** I can access the app.

**Acceptance Criteria:**
- [ ] `/login` page with username + password form
- [ ] Form validates: fields required, min password length
- [ ] On success: redirect to `/dashboard`
- [ ] On failure: show "Invalid username or password" (do not reveal which)
- [ ] After 5 failed attempts, show "Too many attempts. Try again in 15 minutes."
- [ ] Passwords stored as bcrypt hash (rounds = 12)

---

### Story 1.3 — Role-Based Route Protection
**As the** system,  
**I want** all protected routes to require authentication, and admin routes to require admin role,  
**so that** unauthorised users cannot access data.

**Acceptance Criteria:**
- [ ] Middleware redirects unauthenticated users to `/login`
- [ ] Admin-only routes return 403 for reciter role
- [ ] Reciter can only access their own evaluation data via API

---

### Story 1.4 — Admin: Create Reciter Account
**As an** admin,  
**I want** to create accounts for new reciters,  
**so that** they can log into the app.

**Acceptance Criteria:**
- [ ] Admin panel shows "Add Reciter" button
- [ ] Form: Display Name, Username, Password, Confirm Password
- [ ] Username must be unique — show error if taken
- [ ] Created account has role `RECITER`
- [ ] New reciter appears in the reciters list immediately

---

### Story 1.5 — Admin: Deactivate / Reset Password
**As an** admin,  
**I want** to deactivate a reciter account or reset their password,  
**so that** I can manage access.

**Acceptance Criteria:**
- [ ] Deactivated users cannot log in (show "Account deactivated" on attempt)
- [ ] Admin can reactivate a deactivated account
- [ ] Admin can set a new password for any reciter
- [ ] Confirmation modal before deactivation

---

## Epic 2: Sessions

### Story 2.1 — Dashboard: Session List
**As a** reciter or admin,  
**I want** to see a list of all sessions on the dashboard,  
**so that** I can see what has been practiced.

**Acceptance Criteria:**
- [ ] Sessions listed newest-first
- [ ] Each card shows: Date (formatted), Kalaam title, Lehen type, number of attendees
- [ ] Clicking a session opens the detail page
- [ ] Empty state shown when no sessions exist

---

### Story 2.2 — Admin: Create Session
**As an** admin,  
**I want** to create a new session,  
**so that** I can start recording a practice.

**Acceptance Criteria:**
- [ ] "New Session" button on dashboard (visible to admin only)
- [ ] Form: Date picker, Kalaam (select or create inline), Lehen type (dropdown), optional notes
- [ ] Attendance: multi-select of active reciters with checkboxes
- [ ] Session saved and user redirected to session detail page
- [ ] Kalaam title can be typed freely if not in library (creates new kalaam entry)

---

### Story 2.3 — Session Detail Page
**As a** reciter or admin,  
**I want** to view all details of a session,  
**so that** I can see attendance and evaluation information.

**Acceptance Criteria:**
- [ ] Shows: Date, Kalaam title, Lehen type, notes
- [ ] Attendee list with each person's ranking (stars), voice range, and audio player
- [ ] Admin sees "Edit" button and evaluation controls
- [ ] Reciter sees only their own row in full; other reciters' names visible but not their details

---

### Story 2.4 — Admin: Edit / Delete Session
**As an** admin,  
**I want** to edit or delete a session,  
**so that** I can correct mistakes.

**Acceptance Criteria:**
- [ ] Edit form pre-populated with current session data
- [ ] Edit can update: date, kalaam, lehen type, notes, attendance
- [ ] Delete shows confirmation modal: "This will remove all evaluations for this session."
- [ ] After delete, redirect to dashboard

---

## Epic 3: Evaluations

### Story 3.1 — Admin: Add/Edit Evaluation per Reciter
**As an** admin,  
**I want** to add an evaluation for each reciter in a session,  
**so that** their progress is recorded.

**Acceptance Criteria:**
- [ ] On session detail, each attendee row has an edit button (admin only)
- [ ] Evaluation form: ranking (1–5 star selector), voice range (dropdown + free text option), notes
- [ ] Saving updates the row immediately without full page reload
- [ ] If evaluation already exists, form is pre-filled with existing values

---

### Story 3.2 — Admin: Upload Voice Sample
**As an** admin,  
**I want** to upload an audio recording for a reciter's evaluation,  
**so that** they can listen back to it.

**Acceptance Criteria:**
- [ ] Upload button per reciter row in session detail (admin only)
- [ ] Accepted formats: mp3, wav, m4a, ogg
- [ ] Max file size: 50 MB (client + server validation)
- [ ] Upload progress indicator shown
- [ ] After upload: audio player appears in that reciter's row
- [ ] Admin can replace existing file (old file deleted from storage)
- [ ] Admin can delete audio file (confirmation required)

---

### Story 3.3 — Reciter: Play Back Voice Sample
**As a** reciter,  
**I want** to play back my voice sample from a session,  
**so that** I can hear and reflect on my own recitation.

**Acceptance Criteria:**
- [ ] Audio player shown on each evaluation row where a file exists
- [ ] Playback uses signed URL (file is not publicly accessible)
- [ ] Player works on mobile (iOS + Android browsers)
- [ ] If no file uploaded, shows "No recording uploaded yet"

---

## Epic 4: Reciter Profiles

### Story 4.1 — Reciter Profile Page
**As a** reciter,  
**I want** to view my profile page with all my session history,  
**so that** I can track my progress over time.

**Acceptance Criteria:**
- [ ] `/reciters/[id]` shows full evaluation history for that reciter
- [ ] Each row: session date, kalaam, lehen, ranking, voice range, audio player
- [ ] Reciter can only access their own profile; admin can access any
- [ ] History ordered newest-first

---

### Story 4.2 — Ranking Trend Display
**As a** reciter,  
**I want** to see a summary of my ranking trend on my profile,  
**so that** I can see if I'm improving.

**Acceptance Criteria:**
- [ ] Profile shows a simple list of rankings with dates (e.g., "2026-03-10 — Saba — ★★★★☆")
- [ ] Average ranking shown at top of profile

---

## Epic 5: Kalaam Library & Settings

### Story 5.1 — Kalaam Library
**As an** admin,  
**I want** to manage a library of Kalaams,  
**so that** sessions can reference consistent titles.

**Acceptance Criteria:**
- [ ] `/admin/kalaam` shows all kalaam entries
- [ ] Admin can add: title (required), poet (optional), language (optional)
- [ ] Admin can edit existing entries
- [ ] Kalaams used in sessions are shown as "in use" and cannot be deleted

---

### Story 5.2 — Lehen Types & Voice Range Settings
**As an** admin,  
**I want** to manage the Lehen types and voice range options,  
**so that** consistent terminology is used across sessions.

**Acceptance Criteria:**
- [ ] `/admin/settings` shows current Lehen types (default list pre-seeded)
- [ ] Admin can add / rename / remove Lehen types (in-use types cannot be deleted)
- [ ] Same page manages voice range options
- [ ] Default Lehen types seeded at first run: Bayat, Saba, Hijaz, Rast, Nahawand, Kurd, Ajam, Sikah, Jiharkah

---

## Story Map Summary

| Phase | Stories | Status |
|-------|---------|--------|
| Phase 1 — Auth | 1.1, 1.2, 1.3, 1.4, 1.5 | Not Started |
| Phase 2 — Sessions | 2.1, 2.2, 2.3, 2.4 | Not Started |
| Phase 3 — Evaluations | 3.1, 3.2, 3.3 | Not Started |
| Phase 4 — Profiles | 4.1, 4.2 | Not Started |
| Phase 5 — Library | 5.1, 5.2 | Not Started |

---

*Next Phase: Developer — start with Phase 1*
