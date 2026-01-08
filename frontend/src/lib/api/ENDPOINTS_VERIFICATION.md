# BugRelay API Endpoints - Verification Document

**Date**: January 2025  
**Status**: ✅ Verified against backend (router.go + handlers)

---

## ✅ Existing Backend Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Handler | Frontend Hook | Status |
|--------|----------|---------|---------------|--------|
| POST | `/auth/register` | `authHandler.Register` | `useRegister` | ✅ Exists |
| POST | `/auth/login` | `authHandler.Login` | `useLogin` | ✅ Exists |
| POST | `/auth/refresh` | `authHandler.RefreshToken` | `useRefreshToken` | ✅ Exists |
| GET | `/auth/verify-email` | `authHandler.VerifyEmail` | - | ✅ Exists |
| POST | `/auth/password-reset` | `authHandler.RequestPasswordReset` | - | ✅ Exists |
| POST | `/auth/password-reset/confirm` | `authHandler.ResetPassword` | - | ✅ Exists |
| POST | `/auth/logout` | `authHandler.Logout` | `useLogout` | ✅ Exists |
| POST | `/auth/logout-all` | `authHandler.LogoutAll` | - | ✅ Exists |
| GET | `/auth/profile` | `authHandler.GetProfile` | `useProfile` | ✅ Exists |
| PUT | `/auth/profile` | `authHandler.UpdateProfile` | `useProfile` | ✅ Exists |

### OAuth (`/api/v1/auth/oauth`)

| Method | Endpoint | Handler | Frontend Hook | Status |
|--------|----------|---------|---------------|--------|
| GET | `/auth/oauth/:provider` | `oauthHandler.InitiateOAuth` | - | ✅ Exists |
| GET | `/auth/oauth/callback/:provider` | `oauthHandler.HandleOAuthCallback` | - | ✅ Exists |
| POST | `/auth/oauth/link/:provider` | `oauthHandler.LinkOAuthAccount` | - | ✅ Exists |

### Bugs (`/api/v1/bugs`)

| Method | Endpoint | Handler | Frontend Hook | Status |
|--------|----------|---------|---------------|--------|
| GET | `/bugs/` | `bugHandler.ListBugs` | `useBugs`, `useInfiniteBugs` | ✅ Exists |
| GET | `/bugs/:id` | `bugHandler.GetBug` | `useBug` | ✅ Exists |
| POST | `/bugs/` | `bugHandler.CreateBug` | `useCreateBug` | ✅ Exists |
| POST | `/bugs/:id/vote` | `bugHandler.VoteBug` | `useVoteBug` | ✅ Exists |
| POST | `/bugs/:id/comments` | `bugHandler.CreateComment` | `useCommentOnBug` | ✅ Exists |
| POST | `/bugs/:id/attachments` | `bugHandler.UploadBugAttachment` | `uploadScreenshot` | ✅ Exists |
| PATCH | `/bugs/:id/status` | `bugHandler.UpdateBugStatus` | `useUpdateBug` | ✅ Exists |
| POST | `/bugs/:id/company-response` | `bugHandler.AddCompanyResponse` | - | ✅ Exists |

### Companies (`/api/v1/companies`)

| Method | Endpoint | Handler | Frontend Hook | Status |
|--------|----------|---------|---------------|--------|
| GET | `/companies/` | `companyHandler.ListCompanies` | `useCompanies` | ✅ Exists |
| GET | `/companies/:id` | `companyHandler.GetCompany` | `useCompany` | ✅ Exists |
| POST | `/companies/:id/claim` | `companyHandler.InitiateCompanyClaim` | `useClaimCompany` | ✅ Exists |
| POST | `/companies/:id/verify` | `companyHandler.CompleteCompanyVerification` | `useVerifyCompany` | ✅ Exists |
| GET | `/companies/:id/dashboard` | `companyHandler.GetCompanyDashboard` | - | ✅ Exists |
| POST | `/companies/:id/members` | `companyHandler.AddTeamMember` | `useAddCompanyMember` | ✅ Exists |
| DELETE | `/companies/:id/members` | `companyHandler.RemoveTeamMember` | `useRemoveCompanyMember` | ✅ Exists |

### Admin (`/api/v1/admin`)

| Method | Endpoint | Handler | Frontend Hook | Status |
|--------|----------|---------|---------------|--------|
| GET | `/admin/dashboard` | `adminHandler.GetAdminDashboard` | - | ✅ Exists |
| GET | `/admin/bugs` | `adminHandler.ListBugsForModeration` | - | ✅ Exists |
| POST | `/admin/bugs/:id/flag` | `adminHandler.FlagBug` | - | ✅ Exists |
| DELETE | `/admin/bugs/:id` | `adminHandler.RemoveBug` | - | ✅ Exists |
| POST | `/admin/bugs/:id/restore` | `adminHandler.RestoreBug` | - | ✅ Exists |
| POST | `/admin/bugs/merge` | `adminHandler.MergeBugs` | - | ✅ Exists |
| GET | `/admin/audit-logs` | `adminHandler.GetAuditLogs` | - | ✅ Exists |

---

## ❌ Missing Backend Endpoints (Need Implementation)

### Bug Endpoints (Missing)

| Method | Endpoint | Frontend Usage | Priority | Notes |
|--------|----------|----------------|----------|-------|
| POST | `/bugs/search/duplicates` | `searchDuplicates` | **HIGH** | Semantic search for duplicate detection |
| GET | `/bugs/:id/comments` | `useGetComments` | **HIGH** | Get comments with pagination |
| POST | `/bugs/:id/comments/:commentId/replies` | `useReplyToComment` | **MEDIUM** | Reply to specific comment |
| PATCH | `/bugs/:id/comments/:commentId` | `useUpdateComment` | **MEDIUM** | Edit comment |
| DELETE | `/bugs/:id/comments/:commentId` | `useDeleteComment` | **MEDIUM** | Delete comment |
| POST | `/bugs/:id/flag` | `useFlagBug` | **MEDIUM** | Flag/report bug |
| POST | `/bugs/:id/comments/:commentId/flag` | `useFlagComment` | **LOW** | Flag/report comment |
| DELETE | `/bugs/:id/vote` | `unvote` | **LOW** | Remove vote (toggle) |
| PATCH | `/bugs/:id` | `useUpdateBug` | **MEDIUM** | Update bug details |
| DELETE | `/bugs/:id` | `useDeleteBug` | **LOW** | Delete bug (admin/owner) |
| GET | `/bugs/search/suggestions` | `searchSuggestions` | **LOW** | Autocomplete suggestions |
| GET | `/bugs/stats` | `getStats` | **LOW** | Analytics/statistics |
| PATCH | `/bugs/bulk/status` | `bulkUpdateStatus` | **LOW** | Bulk operations |
| DELETE | `/bugs/bulk` | `bulkDelete` | **LOW** | Bulk delete |

### Company Endpoints (Missing)

| Method | Endpoint | Frontend Usage | Priority | Notes |
|--------|----------|----------------|----------|-------|
| GET | `/companies/search` | `useSearchCompanies` | **HIGH** | Search companies for bug submission |

---

## 🔄 API Client Updates Required

### 1. Update `bugrelay/frontend/src/lib/api/bugs.ts`

**Remove/Mock these methods until backend is ready:**

```typescript
// ❌ NOT IMPLEMENTED YET - Use mock/fallback
searchDuplicates(query: string) // POST /bugs/search/duplicates
getComments(bugId: string) // GET /bugs/:id/comments
replyToComment(bugId, parentId, content) // POST /bugs/:id/comments/:commentId/replies
updateComment(bugId, commentId, content) // PATCH /bugs/:id/comments/:commentId
deleteComment(bugId, commentId) // DELETE /bugs/:id/comments/:commentId
flag(bugId, reason) // POST /bugs/:id/flag
flagComment(bugId, commentId, reason) // POST /bugs/:id/comments/:commentId/flag
unvote(bugId) // DELETE /bugs/:id/vote
update(id, data) // PATCH /bugs/:id (use PATCH /bugs/:id/status for now)
delete(id) // DELETE /bugs/:id
searchSuggestions(query) // GET /bugs/search/suggestions
getStats(filters) // GET /bugs/stats
bulkUpdateStatus(bugIds, status) // PATCH /bugs/bulk/status
bulkDelete(bugIds) // DELETE /bugs/bulk
```

**Keep these - they exist:**

```typescript
✅ list(filters) // GET /bugs/
✅ get(id) // GET /bugs/:id
✅ create(data) // POST /bugs/
✅ vote(id) // POST /bugs/:id/vote
✅ addComment(bugId, content) // POST /bugs/:id/comments
✅ uploadScreenshot(bugId, file) // POST /bugs/:id/attachments
```

### 2. Add `bugrelay/frontend/src/lib/api/companies.ts` (if not exists)

```typescript
✅ list(filters) // GET /companies/
✅ get(id) // GET /companies/:id
❌ search(query) // GET /companies/search - NEEDS BACKEND
```

---

## 🛠️ Backend Implementation Priority

### High Priority (Needed for Smart Submission Flow)

1. **POST `/bugs/search/duplicates`**
   - Semantic/fuzzy search for similar bugs
   - Return: Array of bugs with match score
   - Use case: Duplicate detection before submission

2. **GET `/bugs/:id/comments`**
   - Get comments with pagination
   - Include nested replies
   - Return: Comments array with pagination metadata

3. **GET `/companies/search`**
   - Search companies by name
   - Return: Array of companies with verification status
   - Use case: Company selection in submission flow

### Medium Priority (Needed for Comment Features)

4. **POST `/bugs/:id/comments/:commentId/replies`**
   - Create reply to specific comment
   - Thread nesting support

5. **PATCH `/bugs/:id/comments/:commentId`**
   - Edit existing comment
   - Owner validation

6. **DELETE `/bugs/:id/comments/:commentId`**
   - Delete comment
   - Soft delete preferred

7. **POST `/bugs/:id/flag`**
   - Flag bug for moderation
   - Include reason

8. **PATCH `/bugs/:id`**
   - Update bug details (not just status)
   - Full bug update support

### Low Priority (Nice to Have)

9. **DELETE `/bugs/:id/vote`** - Unvote/toggle
10. **POST `/bugs/:id/comments/:commentId/flag`** - Flag comments
11. **GET `/bugs/search/suggestions`** - Autocomplete
12. **GET `/bugs/stats`** - Analytics
13. **Bulk operations** - Admin features

---

## 📝 Recommended Backend Tasks

### Task 1: Add Missing Bug Comment Endpoints

**File**: `backend/internal/handlers/bugs.go`

```go
// GetComments retrieves comments for a bug with pagination
func (h *BugHandler) GetComments(c *gin.Context) {
    bugID := c.Param("id")
    page := c.DefaultQuery("page", "1")
    limit := c.DefaultQuery("limit", "20")
    
    // Implementation...
}

// ReplyToComment creates a reply to a specific comment
func (h *BugHandler) ReplyToComment(c *gin.Context) {
    bugID := c.Param("id")
    commentID := c.Param("commentId")
    
    // Implementation...
}

// UpdateComment updates an existing comment
func (h *BugHandler) UpdateComment(c *gin.Context) {
    // Implementation...
}

// DeleteComment soft-deletes a comment
func (h *BugHandler) DeleteComment(c *gin.Context) {
    // Implementation...
}

// FlagBug flags a bug for moderation
func (h *BugHandler) FlagBug(c *gin.Context) {
    // Implementation...
}

// SearchDuplicates performs semantic search for duplicate bugs
func (h *BugHandler) SearchDuplicates(c *gin.Context) {
    // Implementation with fuzzy matching/vector search
}
```

### Task 2: Add Company Search Endpoint

**File**: `backend/internal/handlers/companies.go`

```go
// SearchCompanies searches for companies by name
func (h *CompanyHandler) SearchCompanies(c *gin.Context) {
    query := c.Query("q")
    limit := c.DefaultQuery("limit", "10")
    
    // Implementation...
}
```

### Task 3: Update Router

**File**: `backend/internal/router/router.go`

```go
bugs := v1.Group("/bugs")
{
    // Existing...
    bugs.GET("/:id/comments", bugHandler.GetComments)
    bugs.POST("/:id/comments/:commentId/replies", authMiddleware.RequireAuth(), bugHandler.ReplyToComment)
    bugs.PATCH("/:id/comments/:commentId", authMiddleware.RequireAuth(), bugHandler.UpdateComment)
    bugs.DELETE("/:id/comments/:commentId", authMiddleware.RequireAuth(), bugHandler.DeleteComment)
    bugs.POST("/:id/flag", authMiddleware.RequireAuth(), bugHandler.FlagBug)
    bugs.POST("/search/duplicates", bugHandler.SearchDuplicates)
    bugs.PATCH("/:id", authMiddleware.RequireAuth(), bugHandler.UpdateBug)
    bugs.DELETE("/:id", authMiddleware.RequireAuth(), bugHandler.DeleteBug)
}

companies := v1.Group("/companies")
{
    // Existing...
    companies.GET("/search", companyHandler.SearchCompanies)
}
```

---

## 🎯 Current Frontend Workarounds

Until backend endpoints are implemented, the frontend uses:

1. **Duplicate Search**: Mock data with delay (800ms) - simulates API
2. **Company Search**: Mock fallback data if API fails
3. **Comment Operations**: Using basic POST to `/bugs/:id/comments` only
4. **Flag/Report**: Disabled or using admin endpoints

---

## ✅ Action Items

### Frontend Team
- [x] Update API client to handle missing endpoints gracefully
- [x] Add mock/fallback data for demo purposes
- [x] Use optimistic updates where backend lags
- [ ] Remove mocks once backend endpoints are ready

### Backend Team
- [ ] Implement duplicate search endpoint (HIGH priority)
- [ ] Implement comment retrieval with pagination
- [ ] Add comment reply/edit/delete endpoints
- [ ] Add company search endpoint
- [ ] Add flag/report endpoints
- [ ] Test all new endpoints with frontend

---

**Last Updated**: January 2025  
**Next Review**: After backend implementation sprint