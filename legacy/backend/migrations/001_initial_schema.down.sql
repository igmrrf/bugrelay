-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_bug_reports_search;
DROP INDEX IF EXISTS idx_jwt_blacklist_expires;
DROP INDEX IF EXISTS idx_jwt_blacklist_token;
DROP INDEX IF EXISTS idx_users_auth_provider;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_bug_reports_company_id;
DROP INDEX IF EXISTS idx_bug_reports_application_id;
DROP INDEX IF EXISTS idx_bug_reports_vote_count;
DROP INDEX IF EXISTS idx_bug_reports_created_at;
DROP INDEX IF EXISTS idx_bug_reports_status;

-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS jwt_blacklist;
DROP TABLE IF EXISTS file_attachments;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS bug_votes;
DROP TABLE IF EXISTS company_members;
DROP TABLE IF EXISTS bug_reports;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";