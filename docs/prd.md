# Product Requirements Document — Zakereen Tamreen

> **BMAD Phase: Product Manager**  
> Status: Draft  
> Date: 2026-03-28  
> Source: project-brief.md

---

## 1. Product Vision

> *"Give every Zakir a mirror — a place to see their Lehen grow, their voice measured, and their dedication honoured."*

Zakereen Tamreen is a private, group-facing web application that transforms how a Marasiya/Noha recitation group records, tracks, and improves their practice over time.

---

## 2. User Personas

### Persona A — The Admin (Ustad / Group Leader)
- **Name:** Ustad Sajjad  
- **Goal:** Keep detailed records of every session, evaluate each Zakir's progress, and guide the group's improvement  
- **Pain points:** Currently uses WhatsApp messages and memory; hard to compare past sessions  
- **Needs:** Fast data entry, bulk attendance marking, ability to upload and rank audio samples

### Persona B — The Reciter (Zakir)
- **Name:** Ali (group member)  
- **Goal:** See his own progress, listen back to his recorded samples, understand his voice range fit for each kalaam  
- **Pain points:** Doesn't know where he stands; feedback is informal  
- **Needs:** A personal dashboard view, access to his audio samples and rank history

---

## 3. Feature Requirements

### F-01 — Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| F-01-1 | Users log in with username + password | Must Have |
| F-01-2 | Passwords stored hashed (bcrypt) | Must Have |
| F-01-3 | Roles: `admin` and `reciter` | Must Have |
| F-01-4 | JWT-based session (refresh token) | Must Have |
| F-01-5 | Admin can create / deactivate reciter accounts | Must Have |
| F-01-6 | Reciter cannot edit any data, only read their own | Must Have |
| F-01-7 | Failed login lockout after 5 attempts | Should Have |
| F-01-8 | Password reset by admin (no self-service email for v1) | Should Have |

---

### F-02 — Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| F-02-1 | Dashboard shows list of all sessions, newest first | Must Have |
| F-02-2 | Each session card shows: Date, Kalaam Title, Lehen, Attendee count | Must Have |
| F-02-3 | Click session → detailed session view | Must Have |
| F-02-4 | Admin sees "New Session" button on dashboard | Must Have |
| F-02-5 | Reciter sees only their own ranking summary per session | Must Have |
| F-02-6 | Filter/search sessions by kalaam title or date range | Should Have |
| F-02-7 | Export session to PDF/CSV | Could Have |

---

### F-03 — Session Management (Admin)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-03-1 | Admin can create a new session with: Date, Kalaam Title, Lehen Type | Must Have |
| F-03-2 | Admin can mark attendance (multi-select from reciter list) | Must Have |
| F-03-3 | Admin can edit session details after creation | Must Have |
| F-03-4 | Admin can delete a session (with confirmation prompt) | Must Have |
| F-03-5 | Lehen type is selectable from a predefined list (see below) | Should Have |
| F-03-6 | Admin can add free-text notes to a session | Should Have |

**Lehen Types (predefined list — admin can extend):**
Bayat, Saba, Hijaz, Rast, Nahawand, Kurd, Ajam, Sikah, Jiharkah

---

### F-04 — Individual Reciter Evaluation (per session)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-04-1 | For each attendee in a session, admin can upload a voice sample (audio file) | Must Have |
| F-04-2 | Supported formats: mp3, wav, m4a, ogg; max 50 MB per file | Must Have |
| F-04-3 | Admin assigns a **ranking** per reciter per session: 1–5 stars | Must Have |
| F-04-4 | Admin assigns a **voice range** for this reciter for this kalaam (free text or predefined) | Must Have |
| F-04-5 | Reciter can play back their own uploaded audio sample | Must Have |
| F-04-6 | Admin can replace/delete an uploaded voice sample | Must Have |
| F-04-7 | Admin can add a short text note per reciter evaluation | Should Have |
| F-04-8 | Voice range predefined options: Bass, Baritone, Tenor, Counter-Tenor, Alto | Should Have |

---

### F-05 — Kalaam / Marasiya Library

| ID | Requirement | Priority |
|----|-------------|----------|
| F-05-1 | Admin can create kalaam entries: Title, Poet (optional), Language | Should Have |
| F-05-2 | Sessions reference a kalaam from the library | Should Have |
| F-05-3 | Kalaam library page accessible from nav | Could Have |
| F-05-4 | Kalaam can have lyrics text stored (for reference) | Could Have |

---

### F-06 — Reciter Profiles

| ID | Requirement | Priority |
|----|-------------|----------|
| F-06-1 | Each reciter has a profile page showing all their session history | Must Have |
| F-06-2 | Profile shows ranking trend over time (simple list or chart) | Should Have |
| F-06-3 | Profile shows all voice samples they can play back | Must Have |
| F-06-4 | Admin can view any reciter's profile; reciter views only their own | Must Have |

---

### F-07 — Admin Panel

| ID | Requirement | Priority |
|----|-------------|----------|
| F-07-1 | Admin can create new reciter accounts (username, display name, password) | Must Have |
| F-07-2 | Admin can deactivate/reactivate accounts | Must Have |
| F-07-3 | Admin can reset a reciter's password | Should Have |
| F-07-4 | Admin can manage the Lehen types list | Should Have |
| F-07-5 | Admin can manage voice range options list | Should Have |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Security** | All routes require authentication; admin routes require admin role |
| **Performance** | Dashboard loads in < 2 seconds for up to 200 sessions |
| **Accessibility** | WCAG 2.1 AA for core flows |
| **Mobile** | Responsive — usable on iPhone/Android browsers |
| **Audio Storage** | Files stored on server/cloud storage; served via signed URLs |
| **Data Privacy** | No public data; group-private only |
| **Uptime** | Not critical — acceptable for hobby/community use |

---

## 5. User Flows

### Flow 1: Admin creates a session
```
Login → Dashboard → "New Session" → 
  Fill: Date, Kalaam Title, Lehen Type → 
  Mark Attendance → Save → 
  Session Detail Page → 
  For each attendee: Upload audio, set ranking, set voice range → Done
```

### Flow 2: Reciter views their progress
```
Login → Dashboard → See list of sessions → 
  Click a session → View own row (ranking, voice range, play audio)
  OR
Login → My Profile → See full history
```

### Flow 3: Admin manages accounts
```
Login → Admin Panel → Reciters → 
  "Add Reciter" → Enter username, display name, password → Save
  OR select existing → Deactivate / Reset Password
```

---

## 6. Prioritisation Summary (MoSCoW)

**Must Have (v1 launch):**
- Login / Auth / Roles
- Dashboard with session list
- Session create/edit/delete
- Attendance tracking
- Per-reciter: audio upload, ranking (1–5), voice range
- Reciter profile / history view
- Admin account management

**Should Have (v1 polish):**
- Lehen predefined list
- Session notes
- Ranking trend on profile
- Filter/search sessions
- Admin password reset

**Could Have (v2):**
- Kalaam library with lyrics
- Export to PDF/CSV
- Email notifications
- Progress charts / analytics

**Won't Have (v1):**
- AI voice analysis
- Live streaming
- Public pages
- Payment features

---

## 7. Open Questions (Resolved)
- ✅ Ranking: 1–5 stars (simple, familiar)
- ✅ Voice samples: uploaded by admin only for v1
- ✅ Attendance: present/absent (simple checkbox)
- ✅ Voice range: predefined list with free-text fallback
- ✅ No email notifications for v1

---

*Next Phase: Architecture → Architect*
