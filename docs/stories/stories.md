# User Stories — Zakereen Tamreen

> **BMAD Phase: Scrum Master**
> Status: Revamped — MVP 1
> Date: 2026-03-29
> Source: prd.md + architecture.md

Stories are ordered by development phase. Each story follows: **As a [role], I want [goal], so that [benefit].**

---

## Epic 1: Authentication & Roles

### Story 1.1 — Project Scaffold
**Type:** Technical Task
**As a** developer,
**I want** the Next.js project scaffolded with TypeScript, Tailwind, Shadcn/ui, Prisma, and NextAuth,
**so that** the development environment is ready.

**Acceptance Criteria:**
- [ ] Next.js project runs on localhost:3000
- [ ] Shadcn/ui initialised
- [ ] Prisma connected to PostgreSQL with revamped schema (GOD/ADMIN/PARTY_MEMBER, KalaamCategory, MemberGrade)
- [ ] NextAuth.js v5 installed with credentials provider
- [ ] .env.local template created

---

### Story 1.2 — Login Page
**As a** Party Member, Admin, or God user,
**I want** to log in with my username and password,
**so that** I can access the app.

**Acceptance Criteria:**
- [ ] /login page with username + password form
- [ ] On success: redirect to /kalaams (main screen)
- [ ] On failure: show "Invalid username or password"
- [ ] After 5 failed attempts: 15-minute lockout message

---

### Story 1.3 — Role-Based Route Protection
**As the** system,
**I want** all protected routes to enforce role requirements,
**so that** unauthorised access is prevented.

**Acceptance Criteria:**
- [ ] Unauthenticated users redirected to /login
- [ ] Admin-only routes return 403 for PARTY_MEMBER role
- [ ] God-only routes return 403 for ADMIN and PARTY_MEMBER
- [ ] Party Members can only access their own evaluation data

---

### Story 1.4 — Admin: Add Party Member
**As an** Admin or God user,
**I want** to create a Party Member account,
**so that** they can log in and see their progress.

**Acceptance Criteria:**
- [ ] "Add Party Member" form: display name, Party Name, username, password, confirm password
- [ ] Party Name field stored (for future multi-party MVP 2)
- [ ] Username must be unique
- [ ] Created account has role PARTY_MEMBER

---

### Story 1.5 — Admin: Deactivate / Reset Password
**As an** Admin or God user,
**I want** to deactivate a member or reset their password,
**so that** I can manage access.

**Acceptance Criteria:**
- [ ] Deactivated members cannot log in
- [ ] Admin can reactivate a deactivated account
- [ ] Admin can set a new password for any Party Member
- [ ] Confirmation modal before deactivation

---

### Story 1.6 — God User: Promote / Demote Admin
**As a** God user,
**I want** to promote a Party Member to Admin, or demote an Admin,
**so that** I control who has admin privileges.

**Acceptance Criteria:**
- [ ] /admin/users shows all users with their current roles
- [ ] God can set role to ADMIN or PARTY_MEMBER for any non-GOD user
- [ ] GOD role cannot be changed via UI
- [ ] Change takes effect on next login of affected user

---

## Epic 2: Kalaam Library

### Story 2.1 — Main Screen: Kalaams by Category
**As a** logged-in user,
**I want** to see all Kalaams grouped by category on the main screen,
**so that** I can browse the group's repertoire.

**Acceptance Criteria:**
- [ ] /kalaams is the post-login landing page
- [ ] Kalaams displayed in four sections: Marasiya, Salaam, Madeh, Misc
- [ ] Each Kalaam card shows: title, "recited by" text
- [ ] Empty category section is hidden or shows "No Kalaams yet"

---

### Story 2.2 — Kalaam Detail Page
**As a** logged-in user,
**I want** to click on a Kalaam and see its full details,
**so that** I can see how many times it has been practiced and access its audio/PDF.

**Acceptance Criteria:**
- [ ] /kalaams/[id] shows: title, category, recited by, PDF link/icon, audio player
- [ ] Session list shows all sessions this Kalaam was practiced in (date, attendee count)
- [ ] Audio player is inline HTML5 (if audio uploaded)
- [ ] PDF shown as icon + link (opens in new tab)

---

### Story 2.3 — Admin: Add / Edit Kalaam
**As an** Admin or God user,
**I want** to add and edit Kalaams in the library,
**so that** the group's repertoire is always up to date.

**Acceptance Criteria:**
- [ ] Add Kalaam form: title (required), category (required dropdown), recited by (text, optional), PDF link (URL, optional), audio upload (optional)
- [ ] Audio upload goes to R2/S3 via presigned URL flow
- [ ] Editing pre-fills the existing values
- [ ] Kalaam appears in correct category on main screen after save

---

### Story 2.4 — Admin: Delete Kalaam
**As an** Admin or God user,
**I want** to delete a Kalaam that is not yet in any session,
**so that** I can clean up mistakes.

**Acceptance Criteria:**
- [ ] Delete button shown only for Kalaams with no sessions
- [ ] Kalaams with sessions show "In Use" badge — delete disabled
- [ ] Confirmation modal before delete

---

## Epic 3: Sessions

### Story 3.1 — Sessions List
**As a** logged-in user,
**I want** to see a list of all sessions,
**so that** I know what has been practiced.

**Acceptance Criteria:**
- [ ] /sessions shows sessions newest-first
- [ ] Each item shows: date, Kalaam title, attendee count
- [ ] Clicking opens session detail
- [ ] "New Session" button visible to Admin / God only

---

### Story 3.2 — Admin: Create Session
**As an** Admin or God user,
**I want** to create a new session,
**so that** I can start recording a practice.

**Acceptance Criteria:**
- [ ] Form: date picker, Kalaam (select from library), optional notes
- [ ] Attendance: multi-select of active Party Members
- [ ] Session saved; user redirected to session detail

---

### Story 3.3 — Session Detail Page
**As a** logged-in user,
**I want** to view the full details of a session,
**so that** I can see attendance and evaluations.

**Acceptance Criteria:**
- [ ] Shows: date, Kalaam title, notes
- [ ] Attendee list with evaluation data per row
- [ ] Admin sees full evaluation controls; Party Member sees only their own row
- [ ] Audio player shown if audio uploaded for that evaluation

---

### Story 3.4 — Admin: Edit / Delete Session
**As an** Admin or God user,
**I want** to edit or delete a session,
**so that** I can correct mistakes.

**Acceptance Criteria:**
- [ ] Edit form pre-populated with current data
- [ ] Can update: date, Kalaam, notes, attendance
- [ ] Delete shows confirmation warning: all evaluations will be removed
- [ ] After delete, redirect to /sessions

---

## Epic 4: Evaluations

### Story 4.1 — Admin: Add / Edit Evaluation per Member
**As an** Admin or God user,
**I want** to evaluate each attendee in a session,
**so that** their progress for this Kalaam is recorded.

**Acceptance Criteria:**
- [ ] Each attendee row has an "Evaluate" button (Admin / God only)
- [ ] Evaluation form: star rating (1–5), voice range (optional), notes (optional)
- [ ] Saving updates the row; if evaluation exists it is updated (upsert)
- [ ] Rating >= 4 makes this Kalaam "Ready" for that member in My Kalaams

---

### Story 4.2 — Admin: Upload Voice Sample
**As an** Admin or God user,
**I want** to upload a voice recording for a member's evaluation,
**so that** they can listen back.

**Acceptance Criteria:**
- [ ] Upload button per attendee row (Admin / God only)
- [ ] Accepted: mp3, wav, m4a, ogg; max 50 MB
- [ ] Upload via presigned URL (direct to R2/S3)
- [ ] After upload: audio player appears in that row
- [ ] Admin can replace or delete the file

---

### Story 4.3 — Party Member: Play Back Audio
**As a** Party Member,
**I want** to play back my voice sample from a session,
**so that** I can hear and reflect on my recitation.

**Acceptance Criteria:**
- [ ] Audio player shown on my evaluation row when a file exists
- [ ] Playback via signed URL (not publicly accessible)
- [ ] Works on iOS and Android browsers
- [ ] Shows "No recording yet" if no file

---

## Epic 5: My Kalaams

### Story 5.1 — My Kalaams Page
**As a** Party Member,
**I want** to see all my Kalaams grouped by status,
**so that** I know which ones I'm ready for and which need more work.

**Acceptance Criteria:**
- [ ] /my-kalaams shows three sections: Ready, In Progress, Attended Practice
- [ ] Ready: latest session evaluation for (me, Kalaam) has ranking >= 4
- [ ] In Progress: latest session evaluation exists with ranking < 4
- [ ] Attended Practice: I attended a session for this Kalaam but have no evaluation
- [ ] Only the latest-session evaluation determines status
- [ ] Each Kalaam links to /kalaams/[id]

---

## Epic 6: Member Grades & Profiles

### Story 6.1 — Admin: Assign Overall Grade
**As an** Admin or God user,
**I want** to assign an overall grade (A, B, C, or D) to a Party Member,
**so that** their holistic capability level is recorded.

**Acceptance Criteria:**
- [ ] Grade selector (A / B / C / D) on member management page
- [ ] Grade displayed on member profile and admin member list
- [ ] Admin can update the grade at any time
- [ ] Grade is independent of per-session star ratings

---

### Story 6.2 — Member Profile Page
**As a** logged-in user,
**I want** to view a Party Member's profile,
**so that** I can see their full evaluation history.

**Acceptance Criteria:**
- [ ] /members/[id] shows: display name, Party Name, grade, evaluation history
- [ ] Evaluation history: session date, Kalaam title, rating, voice range, audio player
- [ ] History ordered newest-first
- [ ] Party Member can only access their own profile; Admin/God can access any

---

## Epic 7: All Practice Sessions

### Story 7.1 — All Sessions List
**As a** logged-in user,
**I want** to see a list of all practice sessions,
**so that** I can browse the group's complete practice history.

**Acceptance Criteria:**
- [ ] /sessions shows all sessions sorted newest-first
- [ ] Each row/card shows: date, Kalaam title, category badge, attendee count
- [ ] Clicking a session opens its detail page (/sessions/[id])
- [ ] "New Session" button visible only to Admin / God
- [ ] Empty state shown when no sessions have been created yet
- [ ] Page accessible from the navigation menu for all roles

---

## Story Map Summary

| Phase | Stories | Status |
|-------|---------|--------|
| Phase 1 — Auth & Roles | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 | Not Started |
| Phase 2 — Kalaam Library | 2.1, 2.2, 2.3, 2.4 | Not Started |
| Phase 3 — Sessions (Admin) | 3.1, 3.2, 3.3, 3.4 | Not Started |
| Phase 4 — Evaluations | 4.1, 4.2, 4.3 | Not Started |
| Phase 5 — My Kalaams | 5.1 | Not Started |
| Phase 6 — Grades & Profiles | 6.1, 6.2 | Not Started |
| Phase 7 — All Sessions | 7.1 | Not Started |

---

*Next Phase: Developer — start with Phase 1*
