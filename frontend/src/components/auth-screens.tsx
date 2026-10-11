"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthResponse, PublicConfig } from "@bugrelay/contracts";
import { api, send } from "@/lib/api";
import { useSession, RequireAuth } from "./session";
import {
  Challenge,
  Feedback,
  Field,
  PageTitle,
  formValues,
  useAction,
  useResource,
} from "./common";

export function AuthScreen({
  mode,
}: {
  mode: "login" | "register" | "forgot";
}) {
  const action = useAction(),
    { refresh } = useSession(),
    router = useRouter();
  const { data: config } = useResource<PublicConfig>("/config");
  const [token, setToken] = useState(""),
    [attempt, setAttempt] = useState(0);
  const title =
    mode === "register"
      ? "Join BugRelay"
      : mode === "forgot"
        ? "Reset your password"
        : "Welcome back";
  return (
    <div className="narrow">
      <PageTitle eyebrow="Your BugRelay account" title={title}>
        <p>
          {mode === "register"
            ? "Help teams build better software."
            : mode === "forgot"
              ? "We’ll email you a secure reset link."
              : "Sign in to report bugs and follow their progress."}
        </p>
      </PageTitle>
      <form
        className="card"
        onSubmit={(e) => {
          const values = formValues(e);
          void action.run(async () => {
            try {
              const email = String(values.get("email"));
              if (mode === "forgot") {
                const result = await send<{ message: string }>(
                  "/auth/forgot-password",
                  { email, turnstileToken: token || undefined },
                );
                action.setMessage(result.message);
              } else {
                await send<AuthResponse>(`/auth/${mode}`, {
                  email,
                  password: String(values.get("password")),
                  ...(mode === "register"
                    ? { displayName: String(values.get("displayName")) }
                    : {}),
                  turnstileToken: token || undefined,
                });
                await refresh();
                router.push(
                  mode === "register" ? "/verify-email" : "/dashboard",
                );
              }
            } finally {
              setAttempt((v) => v + 1);
            }
          });
        }}
      >
        {mode === "register" && (
          <Field label="Display name">
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={80}
              autoComplete="nickname"
            />
          </Field>
        )}
        <Field label="Email address">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </Field>
        {mode !== "forgot" && (
          <Field
            label="Password"
            hint={
              mode === "register"
                ? "Use at least 12 characters. Maximum 72 UTF-8 bytes."
                : undefined
            }
          >
            <input
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 12 : 1}
              maxLength={72}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
            />
          </Field>
        )}
        <Challenge onToken={setToken} revision={attempt} />
        <Feedback {...action} />
        <button
          className="primary"
          disabled={action.busy || (!!config?.turnstileSiteKey && !token)}
        >
          {action.busy
            ? "Please wait…"
            : mode === "register"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Sign in"}
        </button>
        {mode === "login" && (
          <p style={{ marginTop: 18, marginBottom: 0 }}>
            <Link href="/forgot-password">Forgot your password?</Link>
          </p>
        )}
      </form>
      {mode !== "forgot" &&
        config?.oauthProviders.map((provider) => (
          <a
            key={provider}
            className="button"
            style={{ marginTop: 16, marginRight: 10 }}
            href={`/api/v1/auth/oauth/${provider}`}
          >
            Continue with {provider === "google" ? "Google" : "GitHub"}
          </a>
        ))}
      <p className="muted" style={{ marginTop: 24 }}>
        {mode === "register" ? (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/register">Create an account</Link>
          </>
        )}
      </p>
    </div>
  );
}
export function useLinkToken() {
  const [token, setToken] = useState("");
  useEffect(() => {
    const readToken = () => {
      const value = new URLSearchParams(window.location.hash.slice(1)).get(
        "token",
      );
      if (value) {
        setToken(value);
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    readToken();
    window.addEventListener("hashchange", readToken);
    return () => window.removeEventListener("hashchange", readToken);
  }, []);
  return token;
}
export function VerifyEmailScreen() {
  const token = useLinkToken(),
    action = useAction(),
    { user, refresh } = useSession();
  return (
    <div className="narrow">
      <PageTitle title="Verify your email">
        <p>
          Open the verification link in your email, then confirm below. Links
          expire after one hour.
        </p>
      </PageTitle>
      <div className="card">
        <Feedback {...action} />
        {token ? (
          <button
            className="primary"
            disabled={action.busy || !!action.message}
            onClick={() =>
              void action.run(async () => {
                const result = await send<{ message: string }>(
                  "/auth/verify-email/confirm",
                  { token },
                );
                await refresh();
                action.setMessage(result.message);
              })
            }
          >
            Confirm email address
          </button>
        ) : user?.isEmailVerified ? (
          <p className="success">Your email is verified.</p>
        ) : (
          <RequireAuth>
            <p>
              Check your inbox and spam folder. If the email did not arrive,
              request another link.
            </p>
            <button
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  const result = await send<{ message: string }>(
                    "/auth/verify-email/request",
                  );
                  action.setMessage(result.message);
                })
              }
            >
              Resend verification email
            </button>
          </RequireAuth>
        )}
        <p style={{ marginTop: 20 }}>
          <Link href="/dashboard">Continue to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
export function ResetPasswordScreen() {
  const token = useLinkToken(),
    action = useAction();
  return (
    <div className="narrow">
      <PageTitle title="Choose a new password" />
      {!token ? (
        <div className="notice">
          Open the link from your reset email, or{" "}
          <Link href="/forgot-password">request a new link</Link>.
        </div>
      ) : (
        <form
          className="card"
          onSubmit={(e) => {
            const values = formValues(e);
            void action.run(async () => {
              const result = await send<{ message: string }>(
                "/auth/reset-password",
                { token, password: String(values.get("password")) },
              );
              action.setMessage(result.message);
            });
          }}
        >
          <Field
            label="New password"
            hint="At least 12 characters. All existing sessions will be signed out."
          >
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </Field>
          <Feedback {...action} />
          <button
            className="primary"
            disabled={action.busy || !!action.message}
          >
            Reset password
          </button>
          {action.message && (
            <p>
              <Link href="/login">Sign in</Link>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
interface SessionItem {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
export function SettingsScreen() {
  const { user, refresh } = useSession(),
    action = useAction();
  const sessions = useResource<{ sessions: SessionItem[] }>(
    user ? "/auth/sessions" : null,
  );
  return (
    <RequireAuth>
      <PageTitle title="Account settings" />
      <div className="two-col">
        <div className="stack">
          <form
            className="card"
            onSubmit={(e) => {
              const values = formValues(e);
              void action.run(async () => {
                await send(
                  "/auth/profile",
                  { displayName: String(values.get("displayName")) },
                  "PATCH",
                );
                await refresh();
                action.setMessage("Profile updated.");
              });
            }}
          >
            <h2>Your profile</h2>
            <Field label="Display name">
              <input
                name="displayName"
                defaultValue={user?.displayName}
                required
                minLength={2}
                maxLength={80}
              />
            </Field>
            <p className="muted">{user?.email}</p>
            <button disabled={action.busy}>Save profile</button>
          </form>
          <form
            className="card"
            onSubmit={(e) => {
              const values = formValues(e);
              void action.run(async () => {
                await send("/auth/change-password", {
                  currentPassword: String(values.get("currentPassword")),
                  password: String(values.get("password")),
                });
                window.location.assign("/login");
              });
            }}
          >
            <h2>Change password</h2>
            <Field label="Current password">
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
              />
            </Field>
            <p className="muted">
              Changing your password signs out every session. If you registered
              through Google or GitHub, use password recovery to set your first
              password.
            </p>
            <button disabled={action.busy}>Change password</button>
          </form>
        </div>
        <aside className="card">
          <h2>Active sessions</h2>
          <Feedback error={sessions.error} />
          {sessions.data?.sessions.map((s) => (
            <div className="label-value" key={s.id}>
              <strong>
                {s.isCurrent ? "This session" : "Browser session"}
              </strong>
              <small>Created {new Date(s.createdAt).toLocaleString()}</small>
              <button
                className="small"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
                    await refresh();
                    sessions.reload();
                  })
                }
              >
                Revoke session
              </button>
            </div>
          ))}
          <button
            className="danger"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await send("/auth/sessions/revoke-all");
                window.location.assign("/login");
              })
            }
          >
            Sign out everywhere
          </button>
        </aside>
      </div>
      <Feedback {...action} />
    </RequireAuth>
  );
}
