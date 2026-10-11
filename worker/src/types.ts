import type { Context } from "hono";
export interface Env {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  EMAIL: SendEmail;
  APP_ORIGIN: string;
  ENVIRONMENT: "development" | "test" | "production";
  EMAIL_FROM: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}
export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string | null;
  auth_epoch: number;
  is_admin: number;
  email_verified: number;
  suspended: number;
  created_at: string;
  updated_at: string;
}
export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}
export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: UserRow | null;
    session: SessionRow | null;
    requestId: string;
  };
};
export type Ctx = Context<AppEnv>;
