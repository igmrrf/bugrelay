-- Count active administrators, so a suspended account cannot satisfy the
-- last-administrator invariant. Initial migration remains immutable.
DROP TRIGGER member_last_admin_delete;
DROP TRIGGER member_last_admin_update;
CREATE TRIGGER member_last_admin_delete BEFORE DELETE ON company_members
WHEN OLD.role='admin' AND EXISTS(SELECT 1 FROM users WHERE id=OLD.user_id AND suspended=0)
AND (SELECT COUNT(*) FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=OLD.company_id AND m.role='admin' AND u.suspended=0)<=1
BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
CREATE TRIGGER member_last_admin_update BEFORE UPDATE OF role ON company_members
WHEN OLD.role='admin' AND NEW.role!='admin' AND EXISTS(SELECT 1 FROM users WHERE id=OLD.user_id AND suspended=0)
AND (SELECT COUNT(*) FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=OLD.company_id AND m.role='admin' AND u.suspended=0)<=1
BEGIN SELECT RAISE(ABORT,'LAST_COMPANY_ADMIN'); END;
