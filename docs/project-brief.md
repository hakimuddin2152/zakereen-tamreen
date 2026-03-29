# Project Brief — Zakereen Tamreen

> **BMAD Phase: Analyst**  
> Status: Draft  
> Date: 2026-03-28

---

## 1. Project Overview

**Zakereen Tamreen** (زاکرین تمرین — "Reciters Practice") is a web-based management and tracking application for a group of Noha/Marasiya reciters who come together to practice and perform recitations dedicated to Imam Husain (AS).

**Noha / Marasiya** is a devotional art form — a type of elegiac poetry recited with specific melodic patterns called **Lehen** (لحن) — the tune or melodic notes used when delivering each kalaam (composition/poem).

---

## 2. Problem Statement

Managing a group of Zakereen (reciters) involves tracking:
- Which compositions (Marasiya/Noha/Kalaam) are practiced on which dates
- Who attended each session
- How well each individual recited in terms of melody/Lehen
- Voice samples for review and improvement
- Admin-curated rankings and voice-range assessments per person per kalaam

Currently there is no dedicated tool for this — groups rely on informal records, group chats, or spreadsheets. This creates gaps in performance tracking and makes it hard to identify who needs improvement.

---

## 3. Goals & Objectives

| # | Goal | Success Metric |
|---|------|---------------|
| 1 | Centralise session records | All practice sessions logged in one place |
| 2 | Track individual reciter progress | Each reciter has a history of attendance, rankings & voice samples |
| 3 | Enable admin evaluation | Admin can upload/rate samples and assign Lehen levels |
| 4 | Voice range mapping | Admin can associate a voice range with each reciter for each kalaam |
| 5 | Secure access | Login-protected so only group members can view data |

---

## 4. Target Users

| Role | Description |
|------|-------------|
| **Admin** | Group leader / Ustad — manages all data, assigns rankings, uploads evaluations |
| **Reciter (Zakir)** | Regular group member — views their own data and the session dashboard |

> For v1, login exists for both roles. Reciters can view; Admin can edit.

---

## 5. Core Features (v1 Scope)

### 5.1 Authentication
- Username + Password login
- Role-based access (Admin / Reciter)
- Session management (stay logged in with secure token)

### 5.2 Dashboard
A central view showing:
- List of sessions with:
  - **Date** of session
  - **Title of Marasiya / Kalaam** recited
  - **Attendance** — who attended
  - **Lehen Level** — the melodic/tune notes applied to this kalaam (e.g., Bayat, Saba, Hijaz, Rast, etc.)
  - Summary of rankings for that session

### 5.3 Session Management (Admin)
- Create / edit / delete sessions
- Assign a date, kalaam title, and Lehen type
- Mark attendees from the registered reciter list

### 5.4 Individual Reciter Profile
Per session + per reciter:
- **Voice Sample Upload** — audio file (mp3/wav/m4a) recorded for that session
- **Ranking** — admin assigns a score/rank (e.g., 1–5 stars or numeric)
- **Voice Range** — admin records the voice range (e.g., bass, baritone, tenor) that fit this person for this kalaam

### 5.5 Admin Panel
- Manage reciter accounts (add / deactivate)
- Edit all session data
- Manage kalaam / Marasiya library

---

## 6. Out of Scope for v1
- Public-facing pages
- Online recitation / live streaming
- AI-based voice analysis (potential v2 feature)
- Social/commenting features
- Payment or fundraising features

---

## 7. Key Domain Terminology

| Term | Meaning |
|------|---------|
| Zakir (زاکر) | A reciter of Noha or Marasiya |
| Zakereen (زاکرین) | Plural — the group of reciters |
| Marasiya (مرثیہ) | Elegiac poetry for Imam Husain (AS) |
| Noha (نوحہ) | A specific form of mourning recitation |
| Kalaam (کلام) | A composition / poem being recited |
| Lehen (لحن) | The melodic mode / tune pattern used |
| Ustad (استاد) | The teacher / group leader (likely the Admin) |
| Tamreen (تمرین) | Practice / Training |

---

## 8. Assumptions & Constraints
- Small group (likely 5–50 reciters)
- Primarily used on mobile browsers and desktop
- Audio files may be large — storage and upload limits need consideration
- Admin is a single trusted user (or small trusted group) for v1
- Language of UI: English (with Urdu/Arabic terms displayed as-is)

---

## 9. Open Questions for PM Phase
1. Should reciters be able to upload their own voice samples or only admin?
2. What is the ranking scale? Stars (1–5), numeric (1–10), or descriptive (Beginner/Intermediate/Advanced)?
3. Should there be a Kalaam library with details (poet, year, text) or just a title?
4. Should attendance be tracked as present/absent, or with notes?
5. Should voice range be free text, or a predefined list?
6. Should there be notifications (e.g., email/SMS) for upcoming sessions?

---

*Next Phase: PRD → Product Manager*
