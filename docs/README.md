# BMAD Progress Tracker — Zakereen Tamreen

> Last Updated: 2026-03-29

## Phase Status

| BMAD Phase | Document | Status |
|-----------|---------|--------|
| Analyst | project-brief.md | Revamped |
| Product Manager | prd.md | Revamped |
| Architect | architecture.md | Revamped |
| Scrum Master | stories/stories.md | Revamped |
| Developer | Implementation | Next |

## Quick Reference

- **App name:** Zakereen Tamreen (زاکرین تمرین)
- **Stack:** Next.js (App Router) + TypeScript, Tailwind + Shadcn/ui, Prisma + PostgreSQL, NextAuth.js, Cloudflare R2
- **Deploy:** Netlify
- **Roles:** GOD / ADMIN / PARTY_MEMBER
- **MVP 1 Epics:** Auth & Roles -> Kalaam Library -> Sessions -> Evaluations -> My Kalaams -> Grades & Profiles

## Key Decisions (MVP 1)

- **No Lehen** — removed from requirements
- **3 roles:** GOD (super-admin), ADMIN (Ustad), PARTY_MEMBER (Zakir)
- **Kalaam categories:** MARASIYA, SALAAM, MADEH, MISC
- **My Kalaams status:** Ready (rating >= 4) / In Progress (rating < 4) / Attended Practice (no eval)
- **Overall grade:** A / B / C / D — separate from per-session ratings
- **Party Name** on User — stored now, used in MVP 2 multi-party

## Next Action
Start with **Story 1.1 — Project Scaffold**: update Prisma schema with new enums (GOD, PARTY_MEMBER, KalaamCategory, MemberGrade) and new fields (partyName, grade on User; category/pdfLink/audioFileKey on Kalaam).
