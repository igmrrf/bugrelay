PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL,
 password_hash TEXT, is_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_admin IN (0,1)),
 email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN (0,1)), suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE sessions (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT NOT NULL UNIQUE COLLATE NOCASE, description TEXT NOT NULL DEFAULT '', is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0,1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE company_members (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('admin','member')), created_at TEXT NOT NULL, UNIQUE(company_id,user_id));
CREATE INDEX company_members_user ON company_members(user_id);
CREATE TABLE action_tokens (token_hash TEXT PRIMARY KEY, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset','claim')), user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE, email TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT, consumed_by TEXT, created_at TEXT NOT NULL);
CREATE INDEX action_tokens_expiry ON action_tokens(expires_at);
CREATE TABLE oauth_states (state_hash TEXT PRIMARY KEY, provider TEXT NOT NULL, verifier TEXT NOT NULL, browser_hash TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE oauth_accounts (provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(provider,subject));
CREATE TABLE applications (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE, company_id TEXT REFERENCES companies(id), created_at TEXT NOT NULL);
CREATE TABLE bugs (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, application_id TEXT NOT NULL REFERENCES applications(id), company_id TEXT REFERENCES companies(id), author_id TEXT REFERENCES users(id),
 category TEXT NOT NULL CHECK(category IN ('bug','security','feature')), severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
 visibility TEXT NOT NULL CHECK(visibility IN ('public','private')), status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','in_progress','resolved','closed')),
 steps_to_reproduce TEXT NOT NULL DEFAULT '', expected_behavior TEXT NOT NULL DEFAULT '', actual_behavior TEXT NOT NULL DEFAULT '', environment TEXT NOT NULL DEFAULT '',
 deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK(category != 'security' OR visibility = 'private'), CHECK(visibility != 'private' OR author_id IS NOT NULL)
);
CREATE INDEX bugs_company ON bugs(company_id,created_at);
CREATE INDEX bugs_author ON bugs(author_id,created_at);
CREATE INDEX bugs_public ON bugs(visibility,deleted_at,created_at);
CREATE TABLE bug_tags (bug_id TEXT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE, tag TEXT NOT NULL, PRIMARY KEY(bug_id,tag));
CREATE TABLE votes (bug_id TEXT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, PRIMARY KEY(bug_id,user_id));
CREATE TABLE comments (id TEXT PRIMARY KEY, bug_id TEXT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX comments_bug ON comments(bug_id,created_at);
CREATE TABLE attachments (id TEXT PRIMARY KEY, bug_id TEXT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE, uploader_id TEXT NOT NULL REFERENCES users(id), object_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, size INTEGER NOT NULL CHECK(size > 0 AND size <= 5242880), content_type TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX attachments_bug ON attachments(bug_id);
CREATE TABLE moderation (id TEXT PRIMARY KEY, bug_id TEXT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE, reporter_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), created_at TEXT NOT NULL, reviewed_at TEXT, UNIQUE(bug_id,reporter_id));
CREATE TABLE audit_logs (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX audit_created ON audit_logs(created_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL);
-- Prevent demotion/removal of the last company administrator, including concurrent requests.
CREATE TRIGGER member_last_admin_delete BEFORE DELETE ON company_members WHEN OLD.role='admin' AND (SELECT COUNT(*) FROM company_members WHERE company_id=OLD.company_id AND role='admin') <= 1 BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
CREATE TRIGGER member_last_admin_update BEFORE UPDATE OF role ON company_members WHEN OLD.role='admin' AND NEW.role!='admin' AND (SELECT COUNT(*) FROM company_members WHERE company_id=OLD.company_id AND role='admin') <= 1 BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
CREATE TRIGGER last_admin_update BEFORE UPDATE OF is_admin,suspended ON users WHEN OLD.is_admin=1 AND OLD.suspended=0 AND (NEW.is_admin=0 OR NEW.suspended=1) AND (SELECT COUNT(*) FROM users WHERE is_admin=1 AND suspended=0)<=1 BEGIN SELECT RAISE(ABORT,'LAST_PLATFORM_ADMIN'); END;

CREATE TABLE maintenance_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TRIGGER last_active_company_admin BEFORE UPDATE OF suspended ON users
WHEN NEW.suspended=1 AND OLD.suspended=0 AND EXISTS(
 SELECT 1 FROM company_members m JOIN companies c ON c.id=m.company_id
 WHERE m.user_id=OLD.id AND m.role='admin' AND c.is_verified=1
 AND NOT EXISTS(SELECT 1 FROM company_members other JOIN users u ON u.id=other.user_id WHERE other.company_id=m.company_id AND other.role='admin' AND other.user_id!=OLD.id AND u.suspended=0)
) BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
