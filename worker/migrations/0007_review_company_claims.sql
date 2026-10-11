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

-- No earlier schema recorded independent domain-control approval. Consequently
-- every pre-review membership/verified flag is unproven, even when a legacy
-- company_verified audit is absent (the old grant and audit were separate).
-- Keep eligible former administrators as inert review requests, using actual
-- memberships rather than audit completeness to identify their former roles.
INSERT INTO company_claims(id,company_id,user_id,email,mailbox_verified_at)
SELECT lower(hex(randomblob(16))),m.company_id,u.id,u.email,m.created_at
FROM company_members m JOIN companies c ON c.id=m.company_id JOIN users u ON u.id=m.user_id
WHERE m.role='admin' AND u.email_verified=1 AND substr(u.email,instr(u.email,'@')+1)=c.domain;
-- Record all affected companies before clearing their authority, including
-- verified companies without an administrator and dormant memberships.
INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,created_at)
SELECT lower(hex(randomblob(16))),NULL,'company_authorization_review_required','company',c.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM companies c WHERE c.is_verified=1 OR EXISTS(SELECT 1 FROM company_members m WHERE m.company_id=c.id);
UPDATE companies SET is_verified=0 WHERE is_verified=1;
-- Revoke all prior owners and delegated members, regardless of whether any
-- eligible owner could be retained as a pending review request above.
DROP TRIGGER member_last_admin_delete;
DELETE FROM company_members;
CREATE TRIGGER member_last_admin_delete BEFORE DELETE ON company_members
WHEN OLD.role='admin' AND EXISTS(SELECT 1 FROM users WHERE id=OLD.user_id AND suspended=0)
AND (SELECT COUNT(*) FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=OLD.company_id AND m.role='admin' AND u.suspended=0)<=1
BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
