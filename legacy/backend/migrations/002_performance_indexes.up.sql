-- Performance optimization indexes
-- These indexes improve query performance for common operations

-- Bug reports indexes for filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_status_created_at ON bug_reports(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_priority_created_at ON bug_reports(priority, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_vote_count_created_at ON bug_reports(vote_count DESC, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_application_status ON bug_reports(application_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_company_status ON bug_reports(assigned_company_id, status) WHERE assigned_company_id IS NOT NULL;

-- Composite index for trending bugs (high votes in recent time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_trending ON bug_reports(created_at, vote_count DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Tags index for tag-based filtering (GIN index for array operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_tags_gin ON bug_reports USING gin(tags);

-- Full-text search index (already exists but ensuring it's optimized)
DROP INDEX IF EXISTS idx_bug_reports_search;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_fulltext_search ON bug_reports USING gin(to_tsvector('english', title || ' ' || description));

-- Application name search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_name_trgm ON applications USING gin(name gin_trgm_ops);

-- Company name search index  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_name_trgm ON companies USING gin(name gin_trgm_ops);

-- User activity indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON users(is_email_verified, created_at);

-- Bug votes indexes for duplicate prevention and counting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_votes_bug_user ON bug_votes(bug_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_votes_user_created ON bug_votes(user_id, created_at DESC);

-- Comments indexes for bug detail pages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_bug_created ON comments(bug_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_company_response ON comments(bug_id, is_company_response, created_at) WHERE is_company_response = true;

-- File attachments index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_attachments_bug ON file_attachments(bug_id, uploaded_at);

-- Company members index for permission checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_company_user ON company_members(company_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_user_role ON company_members(user_id, role);

-- JWT blacklist index for token validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jwt_blacklist_expires_token ON jwt_blacklist(expires_at, token_jti) WHERE expires_at > NOW();

-- Partial indexes for common filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_open_recent ON bug_reports(created_at DESC) WHERE status = 'open';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bug_reports_high_priority ON bug_reports(created_at DESC) WHERE priority IN ('high', 'critical');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_verified ON companies(created_at DESC) WHERE is_verified = true;

-- Enable pg_trgm extension for fuzzy text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;