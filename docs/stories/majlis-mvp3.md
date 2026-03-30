# MVP 3 — Majlis Feature BMAD

> **BMAD Phases:** Business Analyst → Product Manager → Architect → Developer  
> Status: Draft — awaiting approval  
> Date: 2026-03-30  

---

## Phase 1 — Business Analyst: What & Why

### Concept

A **Session** is *tamreen* — rehearsal. The group practices kalaams, evaluations are done,  
recordings are made. This already exists.

A **Majlis** is the *actual performance event* — a gathering (e.g. Chehlum, Ashura night,  
monthly jalsa) where the group recites in front of an audience. The setlist is curated  
and each kalaam is formally assigned to one or more reciters who are *ready*.

| Dimension | Session (Tamreen) | Majlis (Performance) |
|---|---|---|
| Purpose | Practice / evaluation | Actual live recitation |
| Attendance | All attendees marked | Specific reciters assigned per kalaam |
| Outcome | Rankings, audio samples | Final lineup: who recites what |
| Who creates | Admin | Admin |
| Who can view | All members | All members |

### Business Rules

1. Only Admin (or GOD) can create, edit, or delete a Majlis.
2. A Majlis has a **date** and an optional **occasion name** (e.g. "Chehlum 1446 AH").
3. Admin curates a **setlist** — an ordered list of kalaams for the Majlis.
4. For each kalaam in the setlist, admin assigns one or more **reciters** from the member list.
5. Members who have `lehenDone = true AND hifzDone = true` for a kalaam are highlighted as "ready" when assigning.
6. A member can be assigned to multiple kalaams in the same Majlis.
7. A kalaam can have multiple reciters (e.g. group recitation, or two reciters share verses).
8. All members can view the Majlis list and details (read-only).
9. Members can see which Majlis events they have been assigned to recite from their dashboard/My Majlis.

---

## Phase 2 — Product Manager: User Stories

### Epic M-1: Majlis Management (Admin)

#### Story M-1.1 — Create Majlis
**As an** Admin,  
**I want** to create a new Majlis with a date, occasion name, and notes,  
**so that** upcoming and past performance events are recorded.

**Acceptance Criteria:**
- [ ] "New Majlis" button visible on the Majlis list page (admin only)
- [ ] Form fields: Date (required), Occasion/Title (optional, e.g. "Chehlum 1446"), Notes (optional)
- [ ] After creation, admin is taken to the Majlis detail page to continue setup

---

#### Story M-1.2 — Add Kalaams to Majlis (Setlist)
**As an** Admin,  
**I want** to select kalaams for a Majlis from the kalaam library,  
**so that** the setlist/programme is defined.

**Acceptance Criteria:**
- [ ] Admin can open a "Add Kalaams" dialog showing the full kalaam browser (searchable, grouped by category)
- [ ] Admin can multi-select kalaams to add to the Majlis
- [ ] Kalaams already in the Majlis are shown as already selected
- [ ] Admin can remove a kalaam from the Majlis setlist
- [ ] Kalaams display in a consistent order on the Majlis detail page

---

#### Story M-1.3 — Assign Reciters to Kalaams
**As an** Admin,  
**I want** to assign one or more reciters to each kalaam in the Majlis,  
**so that** the performance lineup is finalised.

**Acceptance Criteria:**
- [ ] Each kalaam row on the Majlis detail page has an "Assign Reciters" action
- [ ] A side panel or dialog opens showing all active members
- [ ] Members who are "ready" for this kalaam (`lehenDone && hifzDone`) are highlighted with a ✓ badge
- [ ] Admin can select/deselect any member (ready or not, but ready ones are recommended)
- [ ] Selected reciters are shown as pills/badges under the kalaam row
- [ ] Admin can remove a reciter from a kalaam assignment

---

#### Story M-1.4 — Edit & Delete Majlis
**As an** Admin,  
**I want** to edit the date/occasion/notes of a Majlis and delete it,  
**so that** I can correct mistakes or remove outdated records.

**Acceptance Criteria:**
- [ ] Edit button on Majlis detail page opens a form pre-filled with current values
- [ ] Delete button on Majlis detail page shows a confirmation dialog
- [ ] Deleting a Majlis cascades to remove all MajlisKalaam and MajlisReciter records

---

### Epic M-2: Majlis Viewing (All Members)

#### Story M-2.1 — Majlis List Page
**As a** logged-in member,  
**I want** to see all Majlis events listed newest first,  
**so that** I can see the group's performance history.

**Acceptance Criteria:**
- [ ] `/majlis` route is accessible to all authenticated users
- [ ] Each Majlis card shows: Date, Occasion/Title, number of kalaams, number of reciters
- [ ] "Majlis" added to the main navigation menu
- [ ] Clicking a card opens the detail page

---

#### Story M-2.2 — Majlis Detail Page
**As a** logged-in member,  
**I want** to see the full setlist of a Majlis with each kalaam's assigned reciter(s),  
**so that** I know the complete programme for that event.

**Acceptance Criteria:**
- [ ] Shows: Date, Occasion, Notes
- [ ] Ordered list of kalaams with assigned reciter name(s) shown per kalaam
- [ ] If no reciter assigned for a kalaam, shows "— TBA —"
- [ ] Admin sees edit/delete/assign controls; members see read-only view

---

#### Story M-2.3 — My Majlis (Member Dashboard)
**As a** Party Member,  
**I want** to see which Majlis events I have been assigned to recite in,  
**so that** I know my upcoming responsibilities.

**Acceptance Criteria:**
- [ ] `/my-kalaams` page (or a new `/my-majlis` page) shows Majlis events where the logged-in user is an assigned reciter
- [ ] Shows: Majlis date, occasion, which kalaam(s) they are assigned to recite
- [ ] Ordered by date descending

---

## Phase 3 — Architect: Technical Design

### 3.1 Database Schema (New Models)

```prisma
model Majlis {
  id        String   @id @default(cuid())
  date      DateTime
  occasion  String?          // e.g. "Chehlum 1446 AH"
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  kalaams   MajlisKalaam[]
}

model MajlisKalaam {
  id       String @id @default(cuid())
  majlisId String
  kalaamId String
  order    Int    @default(0)   // display order within the Majlis

  majlis   Majlis @relation(fields: [majlisId], references: [id], onDelete: Cascade)
  kalaam   Kalaam @relation(fields: [kalaamId], references: [id])
  reciters MajlisReciter[]

  @@unique([majlisId, kalaamId])
}

model MajlisReciter {
  id             String  @id @default(cuid())
  majlisKalaamId String
  userId         String
  notes          String?

  majlisKalaam MajlisKalaam @relation(fields: [majlisKalaamId], references: [id], onDelete: Cascade)
  user         User          @relation(fields: [userId], references: [id])

  @@unique([majlisKalaamId, userId])
}
```

**Additions to existing models:**
```prisma
// Kalaam — add relation
majlisKalaams MajlisKalaam[]

// User — add relation
majlisReciters MajlisReciter[]
```

### 3.2 Entity Relationships

```
Majlis (1) ─── (M) MajlisKalaam (M) ─── (1) Kalaam
                        │
               (M) MajlisReciter (M) ─── (1) User
```

### 3.3 API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/majlis` | Any | List all Majlis, ordered by date desc |
| POST | `/api/majlis` | Admin | Create a new Majlis |
| GET | `/api/majlis/[id]` | Any | Majlis detail with kalaams + reciters |
| PATCH | `/api/majlis/[id]` | Admin | Update date / occasion / notes |
| DELETE | `/api/majlis/[id]` | Admin | Delete Majlis (cascades) |
| PUT | `/api/majlis/[id]/kalaams` | Admin | Replace full kalaam setlist `{ kalaamIds: string[] }` |
| PUT | `/api/majlis/[id]/kalaams/[kalaamId]/reciters` | Admin | Set reciters for a kalaam `{ userIds: string[] }` |
| GET | `/api/my-majlis` | Member | Current user's assigned Majlis appearances |

### 3.4 Pages & Components

```
app/(protected)/
  majlis/
    page.tsx                  ← Majlis list (RSC, all users)
    new/
      page.tsx                ← Create Majlis (admin, form)
    [id]/
      page.tsx                ← Majlis detail (RSC, all users)

components/
  majlis/
    majlis-card.tsx           ← List item card
    majlis-header.tsx         ← Date + occasion + edit/delete actions (admin)
    majlis-setlist.tsx        ← Ordered kalaam list with reciters
    add-kalaams-dialog.tsx    ← KalaamBrowser multi-select for Majlis
    assign-reciters-dialog.tsx← Member list with ready-status highlight
    new-majlis-form.tsx       ← Create form (date, occasion, notes)
    majlis-actions.tsx        ← Edit/Delete buttons for admin
```

### 3.5 Navigation

Add **Majlis** link to the main navbar between Sessions and Reciters:

```
Dashboard | Kalaams | My Kalaams | Sessions | Majlis | Reciters
```

### 3.6 "Ready" Member Highlighting

When assigning reciters, fetch prerequisites for the specific kalaam:

```ts
// In assign-reciters-dialog fetch:
const prereqs = await db.kalaamPrerequisite.findMany({
  where: { kalaamId },
  select: { userId: true, lehenDone: true, hifzDone: true }
});
const readyUserIds = new Set(
  prereqs.filter(p => p.lehenDone && p.hifzDone).map(p => p.userId)
);
```

Members in `readyUserIds` get a green ✓ badge; others can still be assigned.

---

## Phase 4 — Developer: Implementation Plan

Tasks are ordered by dependency.

| # | Task | Files Affected |
|---|------|---------------|
| D-1 | Schema: add Majlis, MajlisKalaam, MajlisReciter models; add relations to User + Kalaam | `prisma/schema.prisma` |
| D-2 | DB push + Prisma regenerate | CLI |
| D-3 | API: `GET/POST /api/majlis` | `src/app/api/majlis/route.ts` |
| D-4 | API: `GET/PATCH/DELETE /api/majlis/[id]` | `src/app/api/majlis/[id]/route.ts` |
| D-5 | API: `PUT /api/majlis/[id]/kalaams` (set setlist) | `src/app/api/majlis/[id]/kalaams/route.ts` |
| D-6 | API: `PUT /api/majlis/[id]/kalaams/[kalaamId]/reciters` | `src/app/api/majlis/[id]/kalaams/[kalaamId]/reciters/route.ts` |
| D-7 | API: `GET /api/my-majlis` | `src/app/api/my-majlis/route.ts` |
| D-8 | Component: `new-majlis-form.tsx` (date + occasion + notes) | new |
| D-9 | Component: `add-kalaams-dialog.tsx` (reuse KalaamBrowser, multi-select) | new |
| D-10 | Component: `assign-reciters-dialog.tsx` (member list + ready highlights + PUT reciters) | new |
| D-11 | Component: `majlis-actions.tsx` (edit + delete) | new |
| D-12 | Component: `majlis-setlist.tsx` (kalaam rows + reciter pills + admin controls) | new |
| D-13 | Page: `/majlis` list page | new |
| D-14 | Page: `/majlis/new` create page | new |
| D-15 | Page: `/majlis/[id]` detail page | new |
| D-16 | Page: `/my-majlis` member page | new |
| D-17 | Nav: Add Majlis + My Majlis links to navbar | `components/layout/navbar.tsx` |
| D-18 | Validations: `createMajlisSchema`, `updateMajlisSchema` | `lib/validations.ts` |

---

## Open Questions (Resolve before dev)

1. **Ordering:** Should kalaams within a Majlis be manually orderable (drag-and-drop) or auto-sorted by category?  
   → *Suggestion: add `order` int, admin reorders via up/down arrows for simplicity (no drag-drop in MVP 3)*

2. **Multiple reciters per kalaam:** Should there be a `role` field (e.g. "Solo", "Group", "Lead")?  
   → *Suggestion: keep it simple — no role field in MVP 3, just assign members*

3. **My Majlis page:** Separate `/my-majlis` route, or extend existing `/my-kalaams`?  
   → *Suggestion: separate `/my-majlis` route to keep concerns clean*

4. **Notifications:** Should members get any in-app notification when assigned to a Majlis kalaam?  
   → *Suggestion: out of scope for MVP 3*

5. **Past/Upcoming split:** Should the Majlis list distinguish past vs upcoming events?  
   → *Suggestion: yes — split into "Upcoming" and "Past" sections based on `majlis.date`*
