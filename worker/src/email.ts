import { digest, fail, now, randomToken, stmt } from "./core";
import type { Env, UserRow } from "./types";

export async function sendActionEmail(
  env: Env,
  user: UserRow,
  purpose: "verify" | "reset" | "claim",
  companyId?: string,
) {
  const token = randomToken();
  const tokenHash = await digest(token);
  const created = now();
  await stmt(
    env,
    "INSERT INTO action_tokens(token_hash,purpose,user_id,company_id,email,expires_at,created_at) VALUES(?,?,?,?,?,?,?)",
    tokenHash,
    purpose,
    user.id,
    companyId ?? null,
    user.email,
    new Date(Date.now() + 3600000).toISOString(),
    created,
  ).run();
  const path =
    purpose === "verify"
      ? "/verify-email"
      : purpose === "reset"
        ? "/reset-password"
        : `/companies/${companyId}/claim`;
  // A fragment prevents tokens entering HTTP access logs and Referer headers.
  const link = `${env.APP_ORIGIN}${path}#token=${token}`;
  const action =
    purpose === "verify"
      ? "Verify your BugRelay email"
      : purpose === "reset"
        ? "Reset your BugRelay password"
        : "Verify your company on BugRelay";
  try {
    await env.EMAIL.send({
      from: env.EMAIL_FROM,
      to: user.email,
      subject: action,
      text: `${action}\n\n${link}\n\nThis link expires in one hour and can be used once. If you did not request it, ignore this message.`,
    });
  } catch {
    await stmt(
      env,
      "DELETE FROM action_tokens WHERE token_hash=?",
      tokenHash,
    ).run();
    fail(
      503,
      "EMAIL_UNAVAILABLE",
      "Email could not be sent. Please try again later.",
    );
  }
}
