-- A mailbox proves reachability, never company-wide authority.
CREATE TABLE company_claims (
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 email TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 mailbox_verified_at TEXT NOT NULL,
 reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT, review_note TEXT,
 review_id TEXT UNIQUE
);
CREATE UNIQUE INDEX one_pending_company_claim ON company_claims(company_id,user_id) WHERE status='pending';
CREATE INDEX company_claim_queue ON company_claims(status,mailbox_verified_at);

-- Upgrade safety: earlier draft email-only grants must be reviewed as well.
INSERT INTO company_claims(id,company_id,user_id,email,mailbox_verified_at)
SELECT lower(hex(randomblob(16))),c.id,u.id,u.email,max(a.created_at)
FROM audit_logs a JOIN companies c ON c.id=a.entity_id JOIN users u ON u.id=a.actor_id
WHERE a.action='company_verified' AND a.entity_type='company' GROUP BY c.id,u.id;
UPDATE companies SET is_verified=0 WHERE id IN (SELECT company_id FROM company_claims);
-- Remove all authority delegated by an email-only owner, including team invites.
DROP TRIGGER member_last_admin_delete;
DELETE FROM company_members WHERE company_id IN (SELECT company_id FROM company_claims);
CREATE TRIGGER member_last_admin_delete BEFORE DELETE ON company_members
WHEN OLD.role='admin' AND EXISTS(SELECT 1 FROM users WHERE id=OLD.user_id AND suspended=0)
AND (SELECT COUNT(*) FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=OLD.company_id AND m.role='admin' AND u.suspended=0)<=1
BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,created_at)
SELECT lower(hex(randomblob(16))),NULL,'company_authorization_review_required','company',company_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM company_claims GROUP BY company_id;
