# Project Brief — Zakereen Tamreen

> **BMAD Phase: Analyst**
> Status: Revamped — MVP 1
> Date: 2026-03-29

---

## 1. Project Overview

**Zakereen Tamreen** (زاکرین تمرین — "Reciters Practice") is a private web-based management and tracking application for a Noha/Marasiya recitation group (Zakiri Party / Anjuman) that practices devotional compositions dedicated to Imam Husain (AS).

Compositions (**Kalaams**) belong to one of four categories: **Marasiya**, **Salaam**, **Madeh**, or **Misc**.

---

## 2. Problem Statement

Managing a recitation party involves tracking:
- Which Kalaams each member is practicing and their personal readiness level
- Who attended each session and which Kalaam was practiced
- How well each member performed per session (star rating per Kalaam per session)
- Each member's overall capability grade (A / B / C / D) assigned by the Ustad
- Kalaam-level resources: audio recordings and PDF lyrics/notation

Currently there is no dedicated tool — groups rely on WhatsApp messages, memory, or spreadsheets. This makes it hard to know who is "ready" for which Kalaam and to track improvement over time.

---

## 3. Goals & Objectives

| # | Goal | Success Metric |
|---|------|----------------|
| 1 | Centralise the Kalaam library | All Kalaams listed with category, audio, and PDF |
| 2 | Track each member's Kalaam readiness | My Kalaams shows Ready / In Progress / Attended Practice |
| 3 | Record every practice session | Sessions log date, Kalaam, and all attendees |
| 4 | Admin evaluation per session | Per-member star rating, voice notes, audio upload |
| 5 | Overall member grading | Admin assigns each member a grade: A, B, C, or D |
| 6 | Secure, role-based access | God user, Admin, Party Member each have appropriate access |

---

## 4. Target Users

| Role | Description |
|------|-------------|
| **God User** | Super-admin — can promote / demote any user to/from Admin |
| **Admin (Ustad)** | Group leader — manages all data, evaluates members, assigns grades, uploads Kalaam content |
| **Party Member (Zakir)** | Regular group member — views their own Kalaams, sessions, and evaluations |

---

## 5. Core Features (MVP 1)

### 5.1 Authentication & Roles
- Username + password login
- Three roles: `GOD`, `ADMIN`, `PARTY_MEMBER`
- God user can promote any user to Admin (and demote)
- Admin can add / deactivate Party Members and reset their passwords
- Party Members can only view their own data

### 5.2 Main Screen — Kalaam Library by Category
- Post-login landing page shows all Kalaams grouped by:
  **Marasiya** | **Salaam** | **Madeh** | **Misc**
- Each Kalaam is clickable → Kalaam detail page showing:
  - How many times it has been practiced, across which sessions
  - Inline audio player (if audio uploaded)
  - PDF link / icon (MVP 2: open PDF in-app)

### 5.3 My Kalaams (Party Member View)
- Sidebar/menu item showing the logged-in member's personal Kalaams grouped by status:
  - **Ready** — latest session evaluation for this Kalaam rated ≥ 4 by Admin
  - **In Progress** — latest session evaluation rated < 4
  - **Attended Practice** — attended session(s) for this Kalaam but not yet evaluated

### 5.4 Session Management
- Admin creates sessions: date, Kalaam, optional notes, attendance list
- Session detail shows all attendees with their evaluations for that Kalaam
- The **latest** session evaluation determines My Kalaams status for that member + Kalaam

### 5.5 Admin: Evaluate Member in Session
- Per session, per attendee: star rating (1–5), voice range, audio upload, notes

### 5.6 Admin: Overall Member Grade
- Admin assigns each Party Member a holistic grade: **A**, **B**, **C**, or **D**
- Independent of individual Kalaam ratings — represents overall capability

### 5.7 Admin: Kalaam Management
- Add / edit Kalaam: title, category (Marasiya/Salaam/Madeh/Misc), "recited by" (text), PDF link, audio upload
- Kalaam audio plays inline on the Kalaam detail / main screen

### 5.8 Admin: Party Member Management
- Add member: display name, Party Name, username, password, confirm password
- **Party Name** stored for future multi-party support (MVP 2)
- Deactivate / reactivate accounts; reset passwords; assign grade (A/B/C/D)

---

## 6. Navigation / Menu Structure

### Party Member Menu
- Main Screen (Kalaam Library)
- My Kalaams → Ready / In Progress / Attended Practice

### Admin Menu
- Main Screen (Kalaam Library)
- My Kalaams
- Sessions
- Add Kalaam
- Add Party Member
- Evaluate Member (overall grade A/B/C/D)
- Session Evaluations (per-Kalaam per-session ratings)

### God User Menu
- All Admin items
- User Management (promote/demote Admin role)

---

## 7. Out of Scope for MVP 1
- In-app PDF viewer (MVP 2)
- Multi-party filtering by Party Name (MVP 2)
- Public-facing pages
- AI-based voice analysis
- Export to PDF / CSV
- Live streaming or social features
- Payment features

---

## 8. Key Domain Terminology

| Term | Meaning |
|------|---------|
| Zakir (زاکر) | A reciter of Noha or Marasiya; "Party Member" in this app |
| Kalaam | A composition/poem practiced by the group |
| Marasiya | Kalaam category: devotional elegy |
| Salaam | Kalaam category: salutation-form poem |
| Madeh | Kalaam category: praise-form poem |
| Ustad | Teacher / group leader — the Admin role |
| Party Name | Name of the group (stored for future multi-party use) |
| Grade (A/B/C/D) | Overall admin-assigned capability grade for a Party Member |
| Ready | Kalaam status: member rated ≥ 4 in latest session evaluation |
| In Progress | Kalaam status: member rated < 4 in latest session evaluation |
| Attended Practice | Kalaam status: attended session but not yet evaluated |
