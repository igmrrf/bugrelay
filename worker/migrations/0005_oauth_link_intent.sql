ALTER TABLE oauth_states ADD COLUMN intent TEXT NOT NULL DEFAULT 'login' CHECK(intent IN ('login','link'));
ALTER TABLE oauth_states ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE oauth_states ADD COLUMN session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX oauth_user_provider ON oauth_accounts(user_id,provider);
