# API v1

All browser calls use `/api/v1` on the application origin, with HttpOnly session cookies. There are no bearer/refresh tokens in localStorage. Mutations require the exact Origin and JSON content type, except multipart attachment uploads. Errors use `{error:{code,message,requestId}}`. Lists use `{items,total,page,limit,hasNextPage}`; page size is capped at 100. Responses use no-store.

| Area | Routes |
| --- | --- |
| Health/config | `GET /health`, `GET /config` |
| Registration/session | `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET/PATCH /auth/profile` |
| Session management | `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /auth/sessions/revoke-all` |
| Email/password | `POST /auth/verify-email/request`, `/auth/verify-email/confirm`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password` |
| OAuth | `GET /auth/oauth/:provider`, `GET /auth/oauth/:provider/callback` |
| Reports | `GET/POST /bugs`, `GET/PATCH/DELETE /bugs/:id`, `POST /bugs/search-duplicates`, `PATCH /bugs/:id/status` |
| Discussion | `POST/DELETE /bugs/:id/vote`, `GET/POST /bugs/:id/comments`, `PATCH/DELETE /bugs/:id/comments/:commentId`, `POST /bugs/:id/report` |
| Attachments | `POST /bugs/:id/attachments` (`file` multipart field), `GET/DELETE /bugs/:id/attachments/:attachmentId` |
| Companies | `GET/POST /companies`, `GET /companies/:id`, `/companies/:id/bugs`, `/companies/:id/analytics`; `PATCH /companies/:id/settings` |
| Company proof/team | `POST /companies/:id/claim`, `/companies/:id/verify`; `GET/POST /companies/:id/members`, `PATCH/DELETE /companies/:id/members/:memberId` |
| Platform admin | `GET /admin/stats`, `/admin/users`, `/admin/moderation`, `/admin/bugs/deleted`, `/admin/audit-logs`, `/admin/export/audit-logs`; `PATCH /admin/users/:id/role`, `/admin/companies/:id/verify`; `POST /admin/users/:id/suspend`, `/admin/users/:id/unsuspend`, `/admin/moderation/:id`, `/admin/bugs/:id/restore`, `/admin/bugs/merge`; `PATCH /admin/bugs/bulk/status` |

`GET /bugs` supports `q`, `status`, `companyId`, `tag`, `mine=true`, `sort=votes`, `page`, and `limit`. Search is escaped case-insensitive substring matching across title, description, application and company; duplicate suggestions match title words. It is not advertised as semantic search. All search/count operations include the current visibility predicate before pagination.

Report requests and response DTOs live in `packages/contracts/src/index.ts`. Visibility is explicit and security category forces private. Update requests intentionally cannot change visibility or impersonate another author. A registered product name is not proof of company ownership.

New passwords must be at least 12 characters and at most 72 UTF-8 bytes. Verification/reset/claim tokens arrive by email, expire after one hour, and are never returned from request endpoints. OAuth success redirects to `/dashboard`; disabled providers return 404.
