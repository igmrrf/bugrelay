# BUGRELAY Product Requirements Document (PRD)

## 🧭 Overview
**BUGRELAY** is a public, user-driven bug tracking hub. Users report bugs they find in any app; companies can claim and respond. The MVP focuses on open bug submission, browsing, and company verification and bug status management.

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
- **Core Fields**: Title, description, screenshots, optional technical information (OS, device, version)
- **App Association**: Application name or URL linking
- **Contact**: Optional email collection
- **Visibility**: All bug reports publicly visible by default
- **Security**: Anti-spam measures including reCAPTCHA and rate-limiting

### 2. User Authentication
- **OAuth Support**: Google and GitHub authentication
- **Traditional Auth**: Email and password option
- **Access Control**: Required for claiming companies, commenting, and upvoting
- **Anonymous Submission**: Bug reports can be submitted without authentication
- **Session Security**: Secure session management for authenticated users

### 3. Company Management
- **Auto-Creation**: Company pages automatically created when bugs mention new applications
- **Verification Flow**: Domain email verification (`@company.com`) for ownership claims
- **Status Management**: Update bug status (open, reviewing, fixed, won't fix)
- **Response System**: Add responses and communicate with bug reporters
- **Team Management**: Add team members after verification
- **Access Control**: Bug management restricted to verified company users only

### 4. Bug Browsing & Interaction
- **Search & Filter**: By application name, company name, status, and tags (UI, crash, performance, security)
- **Sorting**: Most recent, most upvoted, trending
- **User Engagement**: Upvoting and commenting (requires authentication)
- **Anonymous Access**: Browse and view bug reports without authentication

### 5. Administrative Features
- **Content Moderation**: Flag and remove inappropriate bug reports
- **Duplicate Management**: Merge duplicate bug reports
- **Spam Control**: Manual spam management tools
- **Audit Trail**: Maintain logs of all administrative actions
- **Dashboard**: Centralized admin interface for platform management

### 6. Data & Security
- **Public Data**: All bug reports public by default
- **Verification**: Company claims verified via domain email only
- **Privacy**: No sensitive personal data required
- **History Tracking**: Maintain history of status changes and responses

---

## 🧱 Technology Stack (MVP)

| Layer | Tech | Reason |
|-------|------|--------|
| **Frontend** | Next.js 15 (React, App Router) | SSR for SEO, performance, and future portability. |
| **UI** | TailwindCSS + Shadcn/UI | Rapid, consistent UI dev. |
| **State Management** | Zustand / TanStack Query | Lightweight, modern data flow. |
| **Backend** | Go (Gin) | Structured, scalable backend. |
| **Database** | PostgreSQL | Reliable relational model. |
| **Caching** | Redis  | Fast in memory |
| **Auth** | Custom JWT + OAuth Integration | Secure authentication with Google/GitHub OAuth support. |
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

### Bug Reporter
- As a Bug Reporter, I want to submit detailed bug reports with screenshots, so that I can help improve applications I use.
- As a Bug Reporter, I want to browse and interact with existing bug reports, so that I can find similar issues and show support for fixes.

### Company User
- As a Company User, I want to claim ownership of my company's applications, so that I can manage and respond to bug reports.
- As a Company User, I want to manage bug report statuses and responses, so that I can communicate progress to users.

### Admin User
- As an Admin User, I want to moderate content and manage the platform, so that I can maintain quality and prevent abuse.

### Any User
- As any user, I want secure authentication options, so that I can safely access platform features.

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
Backend (Gin)
    ↓
PostgreSQL (via Prisma)
    ↓
S3 / Supabase (file storage)
```

Auth: Custom JWT with OAuth  
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