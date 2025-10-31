-- Drop performance optimization indexes

DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_status_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_priority_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_vote_count_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_application_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_company_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_trending;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_tags_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_fulltext_search;
DROP INDEX CONCURRENTLY IF EXISTS idx_applications_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_companies_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_last_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_verified;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_votes_bug_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_votes_user_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_comments_bug_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_comments_user_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_comments_company_response;
DROP INDEX CONCURRENTLY IF EXISTS idx_file_attachments_bug;
DROP INDEX CONCURRENTLY IF EXISTS idx_company_members_company_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_company_members_user_role;
DROP INDEX CONCURRENTLY IF EXISTS idx_jwt_blacklist_expires_token;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_open_recent;
DROP INDEX CONCURRENTLY IF EXISTS idx_bug_reports_high_priority;
DROP INDEX CONCURRENTLY IF EXISTS idx_companies_verified;