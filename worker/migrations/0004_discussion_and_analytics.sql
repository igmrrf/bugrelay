ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN depth INTEGER NOT NULL DEFAULT 0 CHECK(depth BETWEEN 0 AND 5);
CREATE INDEX comments_parent ON comments(bug_id,parent_id,created_at);
CREATE TRIGGER comment_parent_guard BEFORE INSERT ON comments WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM comments p WHERE p.id=NEW.parent_id AND p.bug_id=NEW.bug_id AND p.deleted_at IS NULL AND p.depth+1=NEW.depth
) BEGIN SELECT RAISE(ABORT,'INVALID_COMMENT_PARENT'); END;

-- A reporter can independently flag a report and individual comments.
CREATE TABLE moderation_new (
 id TEXT PRIMARY KEY, bug_id TEXT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
 comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
 reporter_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at TEXT NOT NULL, reviewed_at TEXT
);
INSERT INTO moderation_new(id,bug_id,reporter_id,reason,status,created_at,reviewed_at)
 SELECT id,bug_id,reporter_id,reason,status,created_at,reviewed_at FROM moderation;
DROP TABLE moderation;
ALTER TABLE moderation_new RENAME TO moderation;
CREATE UNIQUE INDEX moderation_report ON moderation(bug_id,reporter_id) WHERE comment_id IS NULL;
CREATE UNIQUE INDEX moderation_comment ON moderation(comment_id,reporter_id) WHERE comment_id IS NOT NULL;

ALTER TABLE bugs ADD COLUMN resolved_at TEXT;
UPDATE bugs SET resolved_at=updated_at WHERE status IN ('resolved','closed');
