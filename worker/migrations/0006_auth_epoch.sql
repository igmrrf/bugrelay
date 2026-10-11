-- Session issuance must use the same authentication state that was verified.
ALTER TABLE users ADD COLUMN auth_epoch INTEGER NOT NULL DEFAULT 0 CHECK(auth_epoch >= 0);
CREATE TRIGGER user_credentials_changed AFTER UPDATE OF password_hash,suspended ON users
WHEN NEW.password_hash IS NOT OLD.password_hash OR NEW.suspended != OLD.suspended
BEGIN
 UPDATE users SET auth_epoch=auth_epoch+1 WHERE id=NEW.id;
END;
CREATE TRIGGER user_auth_revoked AFTER UPDATE OF auth_epoch ON users
WHEN NEW.auth_epoch != OLD.auth_epoch
BEGIN
 DELETE FROM sessions WHERE user_id=NEW.id;
END;
