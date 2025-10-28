# BUGMIRROR Product Requirements Document (PRD)

## 🧭 Overview
**BUGMIRROR** is a public, user-driven bug tracking hub. Users report bugs they find in any app; companies can claim and respond. The MVP focuses on open bug submission, browsing, and company verification.

---

## 🎯 Goals
- Allow easy bug submission by non-technical users.
- Centralize app-related bug reports.
- Provide credibility for companies to claim ownership.
- Build foundation for future mobile + desktop apps.

### Non-Goals (MVP)
- In-app SDK for direct bug reporting.
- Advanced moderation system (manual only at first).
- Company analytics or dashboards.
- Notification systems (beyond basic email confirmation).

---

## ⚙️ Key Metrics
- Number of bugs submitted weekly
- Number of unique apps/companies created
- Number of claimed companies
- Bug upvotes/comments (engagement metric)

---

## 🧩 Core Features (MVP v1.0)

### 1. Bug Submission
- Fields: Title, description, screenshots, optional tech info (OS, device, version).
- App name / URL association.
- Optional contact email.
- Publicly visible bug list.

### 2. User Authentication
- OAuth (Google, GitHub, email/password)
- Required for claiming a company or commenting/upvoting bugs.

### 3. Company Claiming
- Company page auto-created when a bug mentions that app/company.
- Verification flow via company domain email (`@company.com`).
- After verification, company user can:
  - Update bug status (`open`, `reviewing`, `fixed`, `won’t fix`)
  - Respond to bugs
  - Add teammates

### 4. Bug Browsing & Filters
- Search & filter by:
  - App/company name
  - Status
  - Tags (UI, crash, performance, security)
- Sorting: most recent, most upvoted, trending.

### 5. User Feedback
- Upvote bugs ("I also have this issue").
- Comment thread per bug.

### 6. Admin Dashboard (Internal)
- Moderate spam
- Merge duplicates
- Flag or remove inappropriate reports

---

## 🧱 Technology Stack (MVP)

| Layer | Tech | Reason |
|-------|------|--------|
| **Frontend** | Next.js 15 (React, App Router) | SSR for SEO, performance, and future portability. |
| **UI** | TailwindCSS + Shadcn/UI | Rapid, consistent UI dev. |
| **State Management** | Zustand / TanStack Query | Lightweight, modern data flow. |
| **Backend** | NestJS (Node.js + TypeScript) | Structured, scalable backend. |
| **Database** | PostgreSQL (Prisma ORM) | Reliable relational model. |
| **Auth** | Clerk / Supabase Auth / NextAuth | Simplified user management. |
| **Storage** | AWS S3 / Supabase Storage | File storage for screenshots. |
| **Search** | PostgreSQL full-text search or Meilisearch | Fast lookup. |
| **Hosting** | Vercel (frontend), Railway/Render (backend) | Quick deployment and scaling. |

---

## 🧾 API Endpoints (High-Level)

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/api/bugs` | `POST` | Submit new bug |
| `/api/bugs` | `GET` | Get list of bugs |
| `/api/bugs/:id` | `GET` | Bug detail |
| `/api/companies` | `GET` | List companies |
| `/api/companies/:id/claim` | `POST` | Start claim flow |
| `/api/companies/:id/verify` | `POST` | Verify claim |
| `/api/bugs/:id/status` | `PATCH` | Update status (company only) |

---

## 👥 User Stories

### Reporter
- As a user, I can submit a bug with screenshots.
- As a user, I can browse bugs for a specific app.
- As a user, I can upvote or comment on a bug.

### Company
- As a company user, I can claim ownership using my company email.
- As a company user, I can change bug statuses or respond to users.

### Admin
- As an admin, I can flag or remove spam bugs.
- As an admin, I can merge duplicates.

---

## 🔐 Security & Data
- All company claim verifications via email domain.
- No sensitive personal data required.
- All bug reports public by default.
- Anti-spam: reCAPTCHA + rate-limiting.

---

## 🧠 Architecture Overview

```
Frontend (Next.js)
    ↓
Backend (NestJS API)
    ↓
PostgreSQL (via Prisma)
    ↓
S3 / Supabase (file storage)
```

Auth: Clerk / NextAuth  
Search: Native SQL FTS or Meilisearch (optional)  
CI/CD: GitHub Actions → Vercel + Railway Deploy

---

## 🧩 MVP Build Phases

| Phase | Description | Duration |
|--------|-------------|-----------|
| **Phase 1** | Core bug submission + display | 2–3 weeks |
| **Phase 2** | Auth + company claim system | 2 weeks |
| **Phase 3** | Bug status management + moderation | 1–2 weeks |
| **Phase 4** | Polishing (UI, SEO, testing) | 1 week |

---

## 📱 Future Extensions

| Platform | Stack |
|-----------|--------|
| **Mobile App** | React Native |
| **Desktop App** | Tauri |
| **Browser Extension** | Vanilla JS + API integration |
