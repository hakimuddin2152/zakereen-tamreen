# MVP 3 — Full Architecture Redesign: Mauze Multi-Party BMAD

> **Supersedes:** `majlis-mvp3.md`  
> **BMAD Phases:** Business Analyst → Product Manager → Architect → Developer  
> **Status:** APPROVED — ready for implementation  
> **Date:** 2026-03-30  
> **Last updated:** 2026-03-30 (Q&A resolved)  

---

## Phase 1 — Business Analyst: Context & Rules

### 1.1 What Changed

The app was built for one party managed by one admin. MVP 3 lifts it to a **Mauze (congregation area)** level:
- Multiple parties exist under one Mauze
- A Mauze Coordinator (MC) oversees all parties and their members
- Each party has its own Party Coordinator (PC)
- Members belong to a party — or no party (Individual Member)
- Majlis (live performance) is now a first-class event managed at the Mauze level

### 1.2 Role Hierarchy (Revised)

Roles are **permission levels**, not mutually exclusive categories. Higher roles inherit all permissions of lower roles.

```
MC — Mauze Coordinator   (multiple MCs allowed)
  ↓ inherits
PC — Party Coordinator   (coordinator of exactly one Party, or no party)
  ↓ inherits
PM — Party Member        (belongs to a Party)

IM — Individual Member   (same permissions as PM, just no party)
```

| Role | Code | Permission Level | Party Relationship |
|------|------|-----------------|--------------------|
| Mauze Coordinator | MC | Highest | Can be coordinator of a party (PC-level) OR unaffiliated (IM-level). Has `partyId` if attached to a party. |
| Party Coordinator | PC | Mid | Always also a PM — inherits all PM permissions. Linked to one party via `Party.coordinatorId`. |
| Party Member | PM | Base | Belongs to a party (`partyId` is set). |
| Individual Member | IM | Same as PM | No party (`partyId` is null). When assigned to a party by MC, role automatically changes to PM. |

> **Clean slate:** Database will be reset for MVP 3. No data migration scripts needed.  
> **Multiple MCs:** Any number of users can hold the MC role.  
> **IM → PM:** When MC assigns an IM to a party, their role is changed to PM automatically. If ever removed from a party they revert to IM.

### 1.3 Party as First-Class Entity

A **Party** is a named sub-group of the Mauze (e.g. "Anjuman Hussainia", "Markazi Party"):
- Has one PC (coordinator)
- Has many PMs (members)
- Has its own Sessions and Majlis assignments

Previously `partyName` was a free-text string on User. It becomes a proper `Party` record. The database is being reset from a clean slate for MVP 3.

### 1.4 Key Business Rules

**Roles & Access**
1. MC can do everything. PC can do everything within their party. PM/IM can manage their own data only.
2. MC is the only role that can create/delete Parties and assign IMs to Parties.
3. MC can create/assign PCs to parties.
4. A PC can add Party Members to their own party only.

**Sessions**
5. PC creates practice sessions for their party (attendees must be from their party).
6. MC creates practice sessions for any combination of parties or individual members.
7. A session is "party-scoped" if created by PC (partyId is set). It is "open" if created by MC (partyId is null, any member can attend).
8. PC and PM see only sessions they attended. MC sees all sessions.

**Majlis**
9. MC creates a Majlis and curates the setlist (list of kalaams).
10. MC assigns each kalaam directly to any user — Party Member, Individual Member, or even another PC/MC. The display groups assignees by their party.
11. PC assigns specific members from their own party to kalaams (they cannot touch other parties or IMs).
12. Everyone can view the Majlis programme (setlist + who recites what).

**Recordings**
13. PM uploads a practice recording — visible to PM (self) and their PC by default.
14. IM uploads a recording — visible to IM (self) and MC by default.
15. PM or IM can manually share a recording with any specific member.

**Kalaam Evaluation Request (standalone — no session required)**
16. Once a PM/IM has: `lehenDone=true AND hifzDone=true AND at least 1 recording uploaded` for a kalaam, a "Request Evaluation" button appears on their My Kalaams page.
17. The request creates a pending `KalaamEvalRequest` record.
18. PC (for PM) or MC (for IM) sees pending requests and can evaluate them (set rating + notes).
19. Once evaluated, it appears on the member's My Kalaams as evaluated.

**Members Visibility**
20. All authenticated users can see all members grouped by party. Members with no party appear under "Individuals".

**Password**
21. Any authenticated user can change their own password from their profile dropdown.

---

## Phase 2 — Product Manager: User Stories

### Epic R-1: Authentication & Roles

#### Story R-1.1 — Role Rename (Migration)
**As the** system,  
**I want** existing roles mapped to new codes,  
**so that** the codebase uses the new role names.

**Acceptance Criteria:**
- [ ] Enum values renamed: `GOD → MC`, `ADMIN → PC`, `PARTY_MEMBER → PM`, new `IM`
- [ ] All existing GOD accounts have role MC
- [ ] All existing ADMIN accounts have role PC
- [ ] All existing PARTY_MEMBER accounts have role PM
- [ ] UI role labels updated: "God" → "MC", "Admin" → "PC", "Member" → "PM" / "Individual"

---

#### Story R-1.2 — Change Own Password
**As any** authenticated user,  
**I want** to change my own password from my profile,  
**so that** I control my account security.

**Acceptance Criteria:**
- [ ] Profile dropdown has "Change Password" option
- [ ] Form requires: current password, new password, confirm new password
- [ ] Server validates current password before accepting change
- [ ] Success shows toast; failure shows error

---

### Epic P-1: Party Management (MC)

#### Story P-1.1 — Create Party
**As an** MC,  
**I want** to create a named Party,  
**so that** sub-groups of the Mauze are formally defined.

**Acceptance Criteria:**
- [ ] MC sees "Parties" section in admin panel
- [ ] "New Party" form: Name (required), optional description
- [ ] Party name must be unique
- [ ] After creation, MC can assign a PC to the party

---

#### Story P-1.2 — Assign PC to Party
**As an** MC,  
**I want** to assign a user with PC role to a Party,  
**so that** the Party has a coordinator who manages it.

**Acceptance Criteria:**
- [ ] MC can select any user with role PC from a dropdown when editing a party
- [ ] A PC can only be assigned to one party at a time
- [ ] Reassigning a PC removes them from their previous party

---

#### Story P-1.3 — Assign Individual Member to Party
**As an** MC,  
**I want** to move an IM into an existing Party,  
**so that** individuals can be brought into a party structure.

**Acceptance Criteria:**
- [ ] On an IM's profile, MC sees "Assign to Party" action
- [ ] Dropdown shows available parties
- [ ] On assignment, user's `partyId` is updated; role remains IM until explicitly promoted to PM by MC/PC
- [ ] MC can also promote an IM to PM when assigning

---

#### Story P-1.4 — Members Page (Grouped by Party)
**As any** authenticated user,  
**I want** to see all members grouped by their party,  
**so that** I understand how the Mauze is structured.

**Acceptance Criteria:**
- [ ] `/members` page (was `/reciters`) shows all active members
- [ ] Members grouped by Party name; unaffiliated members shown under "Individuals"
- [ ] Each member card shows: name, party, grade, role badge
- [ ] Clicking a member opens their profile `/members/[id]`
- [ ] Nav link renamed from "Reciters" to "Members"

---

### Epic S-1: Session Management

#### Story S-1.1 — PC Creates Party Session
**As a** PC,  
**I want** to create a practice session for my party,  
**so that** I can record attendance and evaluations for my members.

**Acceptance Criteria:**
- [ ] PC's "New Session" form shows only their party's members in the attendee list
- [ ] Session is tagged with PC's `partyId`
- [ ] After creation, PC is taken to the session detail page

---

#### Story S-1.2 — MC Creates Cross-Party Session
**As an** MC,  
**I want** to create a session that includes members from any party or no party,  
**so that** I can run joint practice across parties or assess individual members.

**Acceptance Criteria:**
- [ ] MC's "New Session" form shows all members (grouped by party + Individuals)
- [ ] MC can pick any combination of members
- [ ] No `partyId` is set on this session (it is "open")

---

#### Story S-1.3 — Session Visibility Rules
**As any** authenticated user,  
**I want** to see sessions relevant to me,  
**so that** I see my own record without being overwhelmed.

**Acceptance Criteria:**
- [ ] MC sees all sessions on `/sessions`
- [ ] PC sees sessions where `partyId = their party` OR their own sessions
- [ ] PM and IM see only sessions they attended
- [ ] Session list shows: date, notes, kalaam count, attendee count

---

### Epic M-1: Majlis Management

#### Story M-1.1 — MC Creates Majlis
**As an** MC,  
**I want** to create a Majlis event with a date and occasion title,  
**so that** performance events are formally logged.

**Acceptance Criteria:**
- [ ] MC-only "New Majlis" button on `/majlis` page
- [ ] Form: Date (required), Occasion (optional, e.g. "Chehlum 1446 AH"), Notes
- [ ] After creation, redirected to detail page

---

#### Story M-1.2 — MC Curates Setlist + Assigns Reciters
**As an** MC,  
**I want** to add kalaams to a Majlis and assign reciters (any user — party member or individual),  
**so that** the full programme is defined at once.

**Acceptance Criteria:**
- [ ] MC can add kalaams from the library (multi-select browser)
- [ ] For each kalaam, MC opens `assign-kalaam-dialog` showing all active members grouped by Party name, with an "Individuals" section for IMs
- [ ] MC can select/deselect any member as a reciter for that kalaam
- [ ] Members with `lehenDone && hifzDone` show a ✓ "Ready" badge
- [ ] MC can remove a kalaam from the setlist (cascades all assignee records)
- [ ] The setlist shows: kalaam title, assigned member names grouped by party

---

#### Story M-1.3 — PC Assigns Members to Kalaam
**As a** PC,  
**I want** to assign members from my party to a kalaam in a Majlis,  
**so that** I designate who from my party will recite.

**Acceptance Criteria:**
- [ ] On the Majlis detail page, PC sees an "Assign" button on each kalaam (they can assign for all kalaams, not just ones pre-designated to their party)
- [ ] Opens `assign-kalaam-dialog` showing **only** the PC's own party members
- [ ] "Ready" badge shown for members with prerequisites met
- [ ] PC selects one or more members → saved
- [ ] PC cannot see or modify other parties' or IMs' assignments

---

#### Story M-1.4 — View Majlis Programme (Everyone)
**As any** authenticated user,  
**I want** to see the Majlis setlist with who is reciting each kalaam,  
**so that** I know the full programme.

**Acceptance Criteria:**
- [ ] `/majlis` page lists all Majlis events split into "Upcoming" and "Past"
- [ ] Each card: Date, Occasion, kalaam count
- [ ] Detail page `/majlis/[id]`: ordered setlist with party assignments + member names
- [ ] Kalaams with no members assigned show "— TBA —"

---

#### Story M-1.5 — My Majlis Page
**As a** PM or IM,  
**I want** to see which Majlis events I have been assigned to,  
**so that** I know my upcoming recitation responsibilities.

**Acceptance Criteria:**
- [ ] `/my-majlis` shows Majlis events where the current user is an assigned member
- [ ] Shows: Majlis date, occasion, which kalaam(s) they are assigned
- [ ] Ordered upcoming first, then past

---

### Epic K-1: Kalaam Recording Visibility & Sharing

#### Story K-1.1 — Default Recording Visibility
**As the** system,  
**I want** recordings to be visible based on role rules by default,  
**so that** privacy is maintained automatically.

**Acceptance Criteria:**
- [ ] PM's recording: visible to PM (self) + their PC
- [ ] IM's recording: visible to IM (self) + MC
- [ ] PC's recording: visible to PC + MC
- [ ] MC's recording: visible to MC only

---

#### Story K-1.2 — Share Recording
**As a** PM or IM,  
**I want** to share a specific practice recording with another member,  
**so that** I can get feedback from peers.

**Acceptance Criteria:**
- [ ] On a recording in My Kalaams / Kalaam detail, "Share" button opens a member picker
- [ ] Member picker shows all active members
- [ ] Selected member can then play the recording
- [ ] "Unshare" option removes access
- [ ] Shared icon shown on the recording row

---

### Epic E-1: Standalone Kalaam Evaluation

#### Story E-1.1 — Request Evaluation
**As a** PM or IM,  
**I want** to request a kalaam evaluation when I'm ready,  
**so that** my progress is formally assessed without requiring a session.

**Acceptance Criteria:**
- [ ] "Request Evaluation" button appears on My Kalaams for a kalaam where: `lehenDone=true && hifzDone=true && recordings.length >= 1`
- [ ] Clicking creates a `KalaamEvalRequest` with status PENDING
- [ ] If a request is already PENDING, button shows "Evaluation Pending"
- [ ] PM's requests go to their PC; IM's requests go to MC

---

#### Story E-1.2 — Evaluate a Request (PC / MC)
**As a** PC or MC,  
**I want** to see and action pending evaluation requests,  
**so that** I can formally grade a member's kalaam.

**Acceptance Criteria:**
- [ ] Admin panel shows "Pending Evaluations" count badge
- [ ] List of pending requests with: member name, kalaam, requested date, recordings
- [ ] PC sees only their party's PM requests; MC sees all (PMs + IMs)
- [ ] Evaluator can: set ranking (1-5), voice range, notes → mark EVALUATED
- [ ] Evaluated status appears on the member's My Kalaams

---

#### Story E-1.3 — Evaluate Individual Member Grade (MC)
**As an** MC,  
**I want** to set the overall grade (A/B/C/D) for an IM or any member,  
**so that** all members have a formal grade regardless of party.

**Acceptance Criteria:**
- [ ] MC sees "Set Grade" on any member's profile (all parties + Individuals)
- [ ] PC can only set grade for members of their own party
- [ ] Grade update is immediate

---

---

## Phase 3 — Architect: Technical Design

### 3.1 Role Enum Changes

```prisma
enum Role {
  GOD             // Developer / App Owner — above everyone; bypasses all permission checks
  MC              // Mauze Coordinator (multiple allowed; inherits PC + PM permissions)
  PC              // Party Coordinator  (always also a PM; coordinator of one party)
  PM              // Party Member       (has partyId set)
  IM              // Individual Member  (same permissions as PM, partyId is null; auto-promotes to PM when assigned to a party)
}
```

### 3.2 New & Changed Database Models

#### New: `Party`
```prisma
model Party {
  id            String   @id @default(cuid())
  name          String   @unique
  description   String?
  coordinatorId String?  @unique          // PC (or MC acting as coordinator) — one per party
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  coordinator         User?               @relation("PartyCoordinator", fields: [coordinatorId], references: [id])
  members             User[]              @relation("PartyMembers")
  sessions            Session[]           @relation("PartySessions")
  majlisKalaamParties MajlisKalaamParty[]
}
```

> A Party's `coordinatorId` can be a user with role PC **or** MC (since MC can also act as a coordinator).

#### Changed: `User`
```prisma
// Remove:  partyName String?
// Add:
  partyId  String?           // null = MC, IM not yet assigned, or PC (linked via Party.coordinatorId)

  party           Party? @relation("PartyMembers", fields: [partyId], references: [id])
  coordinatedParty Party? @relation("PartyCoordinator")    // PC's party (via Party.coordinatorId)
  evalRequestsMade  KalaamEvalRequest[] @relation("EvalRequests")
  evalRequestsDone  KalaamEvalRequest[] @relation("EvalsDone")
  recordingShares   KalaamRecordingShare[]
  majlisAssignments MajlisKalaamMember[]
```

#### Changed: `Session`
```prisma
// Add:
  createdById String
  partyId     String?          // null = MC's open session; set = PC's party session

  createdBy   User   @relation("SessionsCreated", fields: [createdById], references: [id])
  party       Party? @relation("PartySessions", fields: [partyId], references: [id])
```

#### New: `KalaamRecordingShare`
```prisma
model KalaamRecordingShare {
  id          String   @id @default(cuid())
  recordingId String
  sharedWithId String
  sharedAt    DateTime @default(now())

  recording   KalaamRecording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  sharedWith  User            @relation(fields: [sharedWithId], references: [id], onDelete: Cascade)

  @@unique([recordingId, sharedWithId])
}
```

#### New: `KalaamEvalRequest`
```prisma
enum EvalRequestStatus {
  PENDING
  EVALUATED
  REJECTED
}

model KalaamEvalRequest {
  id          String            @id @default(cuid())
  userId      String
  kalaamId    String
  status      EvalRequestStatus @default(PENDING)
  notes       String?           // requester's note
  requestedAt DateTime          @default(now())
  evaluatedAt DateTime?
  evaluatorId String?
  evalNotes   String?
  ranking     Int?
  voiceRange  String?

  user      User    @relation("EvalRequests", fields: [userId], references: [id], onDelete: Cascade)
  kalaam    Kalaam  @relation(fields: [kalaamId], references: [id], onDelete: Cascade)
  evaluator User?   @relation("EvalsDone", fields: [evaluatorId], references: [id])
}
```

#### New Majlis Models (flat direct assignment)
```prisma
model Majlis {
  id        String   @id @default(cuid())
  date      DateTime
  occasion  String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  kalaams MajlisKalaam[]
}

model MajlisKalaam {
  id       String @id @default(cuid())
  majlisId String
  kalaamId String

  majlis    Majlis              @relation(fields: [majlisId], references: [id], onDelete: Cascade)
  kalaam    Kalaam              @relation(fields: [kalaamId], references: [id])
  assignees MajlisKalaamMember[]

  @@unique([majlisId, kalaamId])
}

// Direct assignment: any user can be assigned to any kalaam in a Majlis.
// Display groups by user.partyId → Party.name (or "Individual" if null).
// MC: can assign any user. PC: can only assign their own party's members.
model MajlisKalaamMember {
  id             String @id @default(cuid())
  majlisKalaamId String
  userId         String

  majlisKalaam MajlisKalaam @relation(fields: [majlisKalaamId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])

  @@unique([majlisKalaamId, userId])
}
```

> ⚠️ `MajlisKalaamParty` is **not needed** — party grouping is derived at query time from `user.partyId`. This keeps the schema flat and avoids a two-step assignment workflow.

**Additions to existing models:**
```prisma
// Kalaam
  majlisKalaams   MajlisKalaam[]
  evalRequests    KalaamEvalRequest[]

// KalaamRecording
  shares KalaamRecordingShare[]

// User
  majlisAssignments MajlisKalaamMember[]  // kalaams user is assigned to recite
  // other back-relations listed above
```

---

### 3.3 Entity Relationship Summary

```
Mauze (conceptual)
  └── Party (1) ─── (1) User [PC, coordinatorId]
        └── (M) User [PM, partyId]

Session
  ├── createdBy (1) User
  ├── party     (1) Party? (null = MC open session)
  ├── (M) SessionKalaam → Kalaam
  ├── (M) SessionAttendee → User
  └── (M) ReciterEvaluation → User × Kalaam

Majlis
  └── (M) MajlisKalaam → Kalaam
        └── (M) MajlisKalaamMember → User   [MC: any user; PC: own party only]
              (display groups by User.partyId → Party.name or "Individual")

KalaamRecording → User × Kalaam
  └── (M) KalaamRecordingShare → User (sharedWith)

KalaamEvalRequest → User × Kalaam
  └── evaluator → User?
```

---

### 3.4 Permission Matrix

> **Inheritance rule:** MC can do everything PC can do; PC can do everything PM can do. IM has the same permissions as PM.

| Action | MC | PC | PM | IM |
| Add / Edit / Delete Kalaam | ✓ | ✓ | — | — |
| View Kalaams | ✓ | ✓ | ✓ | ✓ |
| Create Party | ✓ | — | — | — |
| Assign PC to Party | ✓ | — | — | — |
| Assign IM → Party / promote to PM | ✓ | — | — | — |
| Add PM to own Party | ✓ | ✓ | — | — |
| Create Session (any member) | ✓ | — | — | — |
| Create Session (own party) | ✓ | ✓ | — | — |
| View Sessions | all | party + own | attended | attended |
| Set Grade (any member) | ✓ | — | — | — |
| Set Grade (own party PM) | ✓ | ✓ | — | — |
| Create Majlis + setlist | ✓ | — | — | — |
| Assign Majlis kalaam → any user (Party or IM) | ✓ | — | — | — |
| Assign Majlis kalaam → own party members only | ✓ | ✓ | — | — |
| View Majlis | ✓ | ✓ | ✓ | ✓ |
| Upload practice recording | ✓ | ✓ | ✓ | ✓ |
| View PM's recording | MC + PM's PC | own party's PM | own | — |
| View IM's recording | ✓ | shared only (if IM shared with them) | shared only | own |
| Share recording | ✓ | ✓ | ✓ | ✓ |
| Request Kalaam Evaluation | — | — | ✓ | ✓ |
| Evaluate Kalaam Request | ✓ (IMs) | ✓ (own PMs) | — | — |
| View pending eval requests | ✓ (all) | own party | — | — |
| View Members page | ✓ | ✓ | ✓ | ✓ |
| Change own password | ✓ | ✓ | ✓ | ✓ |

---

### 3.5 RBAC Architecture

Instead of scattering `role === "PC"` checks across 30+ files, all permission logic lives in one place: **`lib/permissions.ts`**.

#### Design

```ts
// lib/permissions.ts

export const Permission = {
  // Kalaams
  KALAAM_VIEW:               "kalaam:view",
  KALAAM_CREATE:             "kalaam:create",
  KALAAM_EDIT:               "kalaam:edit",
  KALAAM_DELETE:             "kalaam:delete",

  // Parties
  PARTY_VIEW:                "party:view",
  PARTY_CREATE:              "party:create",
  PARTY_EDIT:                "party:edit",
  PARTY_DELETE:              "party:delete",
  PARTY_ASSIGN_COORDINATOR:  "party:assign_coordinator",
  PARTY_ASSIGN_ANY_MEMBER:   "party:assign_any_member",    // MC: move any IM into any party
  PARTY_ASSIGN_OWN_MEMBER:   "party:assign_own_member",    // PC: add PM to own party

  // Sessions
  SESSION_CREATE_ANY:        "session:create_any",          // MC: any attendees
  SESSION_CREATE_PARTY:      "session:create_party",        // PC: own party only
  SESSION_VIEW_ALL:          "session:view_all",            // MC
  SESSION_VIEW_PARTY:        "session:view_party",          // PC: sessions for their party
  SESSION_VIEW_OWN:          "session:view_own",            // PM/IM: attended only

  // Majlis
  MAJLIS_VIEW:               "majlis:view",
  MAJLIS_CREATE:             "majlis:create",               // MC
  MAJLIS_EDIT:               "majlis:edit",
  MAJLIS_DELETE:             "majlis:delete",
  MAJLIS_ASSIGN_ANY:         "majlis:assign_any",           // MC: assign any user (PM, IM, PC, MC)
  MAJLIS_ASSIGN_PARTY:       "majlis:assign_party",         // PC: assign own party members only

  // Members & Grades
  MEMBER_VIEW:               "member:view",
  MEMBER_GRADE_SET_ANY:      "member:grade_set_any",        // MC
  MEMBER_GRADE_SET_PARTY:    "member:grade_set_party",      // PC: own party only

  // Evaluation Requests
  EVAL_REQUEST_SUBMIT:       "eval_request:submit",         // PM / IM
  EVAL_REQUEST_REVIEW_ANY:   "eval_request:review_any",     // MC
  EVAL_REQUEST_REVIEW_PARTY: "eval_request:review_party",   // PC: own party

  // Recordings
  RECORDING_UPLOAD:          "recording:upload",
  RECORDING_SHARE:           "recording:share",
  RECORDING_VIEW_ANY:        "recording:view_any",          // MC

  // Users
  USER_CREATE:               "user:create",
  USER_DEACTIVATE:           "user:deactivate",
  USER_ROLE_CHANGE:          "user:role_change",            // GOD only
  USER_PASSWORD_RESET:       "user:password_reset",
  USER_PASSWORD_CHANGE_OWN:  "user:password_change_own",
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

// Base: every authenticated user
const BASE: Permission[] = [
  Permission.KALAAM_VIEW,
  Permission.PARTY_VIEW,
  Permission.MAJLIS_VIEW,
  Permission.MEMBER_VIEW,
  Permission.RECORDING_UPLOAD,
  Permission.RECORDING_SHARE,
  Permission.SESSION_VIEW_OWN,
  Permission.USER_PASSWORD_CHANGE_OWN,
  Permission.EVAL_REQUEST_SUBMIT,
];

const PC_EXTRA: Permission[] = [
  Permission.KALAAM_CREATE,
  Permission.KALAAM_EDIT,
  Permission.SESSION_CREATE_PARTY,
  Permission.SESSION_VIEW_PARTY,
  Permission.PARTY_ASSIGN_OWN_MEMBER,
  Permission.MEMBER_GRADE_SET_PARTY,
  Permission.EVAL_REQUEST_REVIEW_PARTY,
  Permission.MAJLIS_ASSIGN_PARTY,
  Permission.USER_CREATE,
  Permission.USER_DEACTIVATE,
  Permission.USER_PASSWORD_RESET,
];

const MC_EXTRA: Permission[] = [
  Permission.KALAAM_DELETE,
  Permission.PARTY_CREATE,
  Permission.PARTY_EDIT,
  Permission.PARTY_DELETE,
  Permission.PARTY_ASSIGN_COORDINATOR,
  Permission.PARTY_ASSIGN_ANY_MEMBER,
  Permission.SESSION_CREATE_ANY,
  Permission.SESSION_VIEW_ALL,
  Permission.MAJLIS_CREATE,
  Permission.MAJLIS_EDIT,
  Permission.MAJLIS_DELETE,
  Permission.MAJLIS_ASSIGN_ANY,
  Permission.MEMBER_GRADE_SET_ANY,
  Permission.EVAL_REQUEST_REVIEW_ANY,
  Permission.RECORDING_VIEW_ANY,
  Permission.USER_ROLE_CHANGE,
];

export const ROLE_PERMISSIONS: Record<string, Set<Permission> | null> = {
  IM:  new Set(BASE),
  PM:  new Set(BASE),
  PC:  new Set([...BASE, ...PC_EXTRA]),
  MC:  new Set([...BASE, ...PC_EXTRA, ...MC_EXTRA]),
  GOD: null, // GOD bypasses all checks
};

/** Check if a role has a permission. GOD always returns true. */
export function can(role: string, permission: Permission): boolean {
  if (role === "GOD") return true;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** Use in API routes — throws a 403 Response if not allowed. */
export function requirePermission(role: string | undefined, permission: Permission): void {
  if (!role || !can(role, permission)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### Usage Pattern

**In API routes:**
```ts
import { requirePermission, Permission } from "@/lib/permissions";

export async function POST(req: Request) {
  const session = await auth();
  requirePermission(session?.user?.role, Permission.PARTY_CREATE);
  // ... handler
}
```

**In server components:**
```ts
const canEdit = can(session.user.role, Permission.KALAAM_EDIT);
```

**In client components (role passed as prop from RSC):**
```tsx
{can(role, Permission.MAJLIS_CREATE) && <Button>New Majlis</Button>}
```

#### Benefits
- **Single source of truth** — permission change in one file, propagates everywhere
- **GOD bypass** — `can("GOD", anything)` always `true`; no special-casing in 30 files
- **Testable** — `can(role, permission)` is a pure function, no server needed
- **Type-safe** — `Permission` is a string union; typos are compile errors

---

### 3.6 API Changes

#### New / Changed Routes

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/parties` | MC, PC | List parties |
| POST | `/api/parties` | MC | Create party |
| GET | `/api/parties/[id]` | MC, PC | Party detail + members |
| PATCH | `/api/parties/[id]` | MC | Update name/coordinator |
| DELETE | `/api/parties/[id]` | MC | Delete (cascades) |
| POST | `/api/parties/[id]/members` | MC, PC | Add PM to party |
| DELETE | `/api/parties/[id]/members/[userId]` | MC, PC | Remove member from party |
| GET | `/api/members` | All | All users grouped by party |
| GET | `/api/members/[id]` | All | Member profile (was `/api/reciters/[id]`) |
| PATCH | `/api/members/[id]/grade` | MC, PC | Set grade |
| POST | `/api/auth/change-password` | Self | Change own password |
| GET | `/api/majlis` | All | List all Majlis |
| POST | `/api/majlis` | MC | Create Majlis |
| GET | `/api/majlis/[id]` | All | Detail with full programme |
| PATCH | `/api/majlis/[id]` | MC | Update date/occasion/notes |
| DELETE | `/api/majlis/[id]` | MC | Delete (cascades) |
| PUT | `/api/majlis/[id]/kalaams` | MC | Replace setlist `{ kalaamIds }` |
| PUT | `/api/majlis/[id]/kalaams/[kalaamId]/assignees` | MC, PC | Set assignees `{ userIds }` — MC: any users; PC: own party only |
| GET | `/api/my-majlis` | PM, IM | Current user's Majlis appearances |
| POST | `/api/kalaams/[id]/recordings/[recId]/share` | Self | Share recording `{ userIds }` |
| DELETE | `/api/kalaams/[id]/recordings/[recId]/share/[userId]` | Self | Unshare |
| GET | `/api/eval-requests` | MC, PC | List pending requests |
| POST | `/api/eval-requests` | PM, IM | Submit new eval request |
| PATCH | `/api/eval-requests/[id]` | MC, PC | Evaluate (set status/ranking/notes) |
| GET | `/api/sessions` | Scoped | Return sessions per visibility rules |
| POST | `/api/sessions` | MC, PC | createdById + partyId (PC only) auto-set |

**Routes retained (renamed):**
- `GET /api/reciters` → `GET /api/members`
- `GET /api/reciters/[id]` → `GET /api/members/[id]`

---

### 3.6 Navigation

```
Desktop:
Kalaams | My Kalaams | Sessions | Majlis | Members

My Kalaams dropdown:
  My Kalaams
  My Majlis

Admin Panel (MC / PC):
  Admin > Kalaams        (add/edit kalaam library)
  Admin > Members        (manage members)
  Admin > Parties        (MC only — create/manage parties)
  Admin > Eval Requests  (pending evaluation requests)
  Admin > Users          (MC only — role management)
```

---

### 3.7 Data Migration Plan

Since the schema changes are destructive (role enum rename, new Party table, partyId FK), migration must be done carefully:

**Clean slate approach (no migration needed):**  
The database will be reset via `prisma db push --force-reset`. A fresh seed script will create test data with the new schema directly. No migration script is required.

**Steps:**
1. Update `schema.prisma` with all new models and enums
2. Run `prisma db push --force-reset` to wipe and recreate tables
3. Run `prisma generate` to regenerate client
4. Update `prisma/seed.ts` with MC/PC/PM/IM roles and Party records

---

### 3.8 Page & Component Map

```
app/(protected)/
  members/                          (was: reciters/)
    page.tsx                        ← All members grouped by party
    [id]/
      page.tsx                      ← Member profile
  admin/
    parties/
      page.tsx                      ← MC only: manage parties
    eval-requests/
      page.tsx                      ← MC / PC: pending eval requests
  majlis/
    page.tsx                        ← All Majlis (Upcoming / Past)
    new/
      page.tsx                      ← MC: create Majlis
    [id]/
      page.tsx                      ← Detail: setlist + assignments
  my-majlis/
    page.tsx                        ← PM/IM: my recitation assignments

components/
  parties/
    party-card.tsx
    new-party-form.tsx
    assign-coordinator-dialog.tsx
    assign-member-dialog.tsx
  majlis/
    majlis-card.tsx
    new-majlis-form.tsx
    majlis-setlist.tsx              ← kalaam rows + assignee pills grouped by party
    add-kalaams-dialog.tsx          ← reuse KalaamBrowser multi-select
    assign-kalaam-dialog.tsx        ← MC: all users (grouped Party + Individuals); PC: own party only
    majlis-actions.tsx
  evaluations/
    eval-request-button.tsx         ← "Request Evaluation" on My Kalaams
    eval-requests-table.tsx         ← Admin: list of pending requests
  recordings/
    share-recording-dialog.tsx      ← Share with member picker
```

---

## Phase 4 — Developer: Ordered Implementation Plan

Tasks ordered by dependency. Each group can start after the previous group is complete.

### Group A — Foundation (Schema + Auth + RBAC)

| # | Task | Files |
|---|------|-------|
| A0 | **Create `lib/permissions.ts`** — full Permission enum + ROLE_PERMISSIONS map + `can()` + `requirePermission()` | `lib/permissions.ts` (new) |
| A1 | Role enum: keep `GOD`, add `MC`, rename `ADMIN→PC`, `PARTY_MEMBER→PM`, add `IM` | `schema.prisma` |
| A2 | Add `Party` model | `schema.prisma` |
| A3 | Add `partyId` FK on `User`, remove `partyName`, add coordinator back-relation | `schema.prisma` |
| A4 | Add `createdById`, `partyId` on `Session` | `schema.prisma` |
| A5 | Add `KalaamRecordingShare` model | `schema.prisma` |
| A6 | Add `KalaamEvalRequest` + `EvalRequestStatus` enum | `schema.prisma` |
| A7 | Add Majlis models: `Majlis`, `MajlisKalaam`, `MajlisKalaamMember` (flat, no party join table) | `schema.prisma` |
| A8 | DB push + Prisma regenerate | CLI |
| A9 | `prisma db push --force-reset` + update `seed.ts` with MC/PC/PM/IM Party data | CLI + `prisma/seed.ts` |
| A10 | Update `auth.ts` / `next-auth.d.ts` — add `partyId` to session token | `lib/auth.ts`, `types/next-auth.d.ts` |
| A11 | Update role guards in `middleware.ts` (MC/PC/PM/IM) | `middleware.ts` |
| A12 | Replace all raw `role === "ADMIN"` / `role === "GOD"` checks throughout codebase with `can(role, Permission.X)` calls | all files |

### Group B — Core APIs

| # | Task | Files |
|---|------|-------|
| B1 | `GET/POST /api/parties` | new |
| B2 | `GET/PATCH/DELETE /api/parties/[id]` | new |
| B3 | `POST/DELETE /api/parties/[id]/members` | new |
| B4 | `GET /api/members`, `GET /api/members/[id]` (replaces reciters) | rename + update |
| B5 | `PATCH /api/members/[id]/grade` (scoped MC vs PC) | new |
| B6 | `POST /api/auth/change-password` | new |
| B7 | `GET /api/sessions` — scoped visibility (MC all, PC party, PM/IM attended) | `api/sessions/route.ts` |
| B8 | `POST /api/sessions` — set `createdById`, `partyId` based on role | `api/sessions/route.ts` |
| B9 | `GET/POST /api/eval-requests` | new |
| B10 | `PATCH /api/eval-requests/[id]` | new |
| B11 | `POST /api/kalaams/[id]/recordings/[recId]/share` | new |
| B12 | `DELETE /api/kalaams/[id]/recordings/[recId]/share/[userId]` | new |
| B13 | `GET /api/my-majlis` | new |
| B14 | `GET/POST /api/majlis` | new |
| B15 | `GET/PATCH/DELETE /api/majlis/[id]` | new |
| B16 | `PUT /api/majlis/[id]/kalaams` | new |
| B17 | `PUT /api/majlis/[id]/kalaams/[kalaamId]/assignees` — MC: any user; PC: scope to own party | new |

### Group C — Components

| # | Task | Files |
|---|------|-------|
| C1 | Navbar: rename "Reciters" → "Members", add "Majlis", update role labels | `navbar.tsx` |
| C2 | `party-card.tsx`, `new-party-form.tsx`, `assign-coordinator-dialog.tsx` | new |
| C3 | `assign-member-dialog.tsx` (MC assigns IM, PC adds PM) | new |
| C4 | `eval-request-button.tsx` — shows on My Kalaams when prerequisites met | new |
| C5 | `eval-requests-table.tsx` — admin panel: pending requests list | new |
| C6 | `share-recording-dialog.tsx` — member picker for sharing recordings | new |
| C7 | `new-majlis-form.tsx` (date + occasion + notes) | new |
| C8 | `add-kalaams-dialog.tsx` for Majlis (reuse KalaamBrowser) | new |
| C9 | `assign-kalaam-dialog.tsx` — MC: all users grouped (Party sections + Individuals); PC: own party members only; both show "Ready" badge | new |
| C10 | `majlis-setlist.tsx` — kalaam rows with assignee pills grouped by party + admin controls | new |
| C11 | `majlis-actions.tsx` (edit + delete) | new |
| C12 | `change-password-dialog.tsx` — triggered from profile dropdown | new |

### Group D — Pages

| # | Task | Files |
|---|------|-------|
| D1 | `/members` page (grouped by party) — rename from `/reciters` | rename + update |
| D2 | `/members/[id]` profile page — update role checks | rename + update |
| D3 | `/admin/parties` page — MC only | new |
| D4 | `/admin/eval-requests` page — MC + PC scoped | new |
| D5 | `/sessions` page — apply visibility scoping | update |
| D6 | `/sessions/new` — PC form (own party) vs MC form (any members) | update |
| D7 | `/majlis` list page (Upcoming / Past split) | new |
| D8 | `/majlis/new` page (MC) | new |
| D9 | `/majlis/[id]` detail page (setlist + two-level assignments) | new |
| D10 | `/my-majlis` page (PM/IM) | new |

---

## Resolved Questions

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| Q1 | Can a PC also recite (be listed as a performer in Majlis)? | **Yes** — PC is always also a PM; MC can also be PC or IM | PC and MC can be assigned as Majlis reciters. No schema change needed. |
| Q2 | Is there exactly one MC or can there be multiple? | **Multiple MCs allowed** | Role enum stays as-is; no single-MC constraint needed. |
| Q3 | When IM is assigned to a party, do they auto-become PM? | **Yes — automatic** — IM role changes to PM on party assignment | API for assigning IM to party must update `role = PM` atomically with `partyId`. If removed from party, revert to IM. |
| Q4 | How to handle existing sessions with no creator? | **Not applicable — clean slate** | DB will be wiped and reseeded. No migration script needed. |
| Q5 | Should `/reciters/[id]` redirect to `/members/[id]`? | **Rename only** — just refactor the route in code | Change `/reciters` → `/members` throughout. No Next.js redirect needed (private app, no external links). |
| Q6 | Can a PC see IM recordings? | **Only if IM explicitly shares with them** | `KalaamRecordingShare` already handles this. Default visibility for IM recordings: IM + MC only. PC sees only if in share list. |
| Q7 | Is Majlis kalaam ordering manual? | **No ordering needed** | Remove `order` field from `MajlisKalaam`. Kalaams display in insertion/creation order. |
| Q8 | Can PM/IM submit multiple eval requests for the same kalaam? | **Multiple OK** | No uniqueness constraint on `KalaamEvalRequest(userId, kalaamId)`. PM/IM can request again after improvement. |
| Q9 | Is GOD role kept? | **Yes** — GOD is developer/app owner; stays as top role above MC | GOD role retained in enum unchanged. `can("GOD", anything)` always returns `true`. |
