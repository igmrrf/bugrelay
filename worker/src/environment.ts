import {
  APPROVED_SENDER,
  PRODUCTION_ORIGIN,
  isApprovedMailbox,
  isLocalOrigin,
  isRealTurnstileKey,
  isSecureEnvironment,
  isStagingOrigin,
} from "@bugrelay/contracts";
import { fail } from "./core";
import type { Ctx } from "./types";

export function enforceEnvironment(c: Ctx) {
  const env = c.env;
  const requestOrigin = new URL(c.req.url).origin;
  let valid = false;
  if (isSecureEnvironment(env.ENVIRONMENT)) {
    valid =
      isRealTurnstileKey(env.TURNSTILE_SITE_KEY) &&
      isRealTurnstileKey(env.TURNSTILE_SECRET) &&
      env.EMAIL_FROM === APPROVED_SENDER;
    if (env.ENVIRONMENT === "production") {
      valid &&=
        env.APP_ORIGIN === PRODUCTION_ORIGIN &&
        !env.STAGING_EMAIL_ENABLED &&
        !env.STAGING_EMAIL_RECIPIENT;
    } else {
      valid &&=
        isStagingOrigin(env.APP_ORIGIN) &&
        !env.GOOGLE_CLIENT_ID &&
        !env.GOOGLE_CLIENT_SECRET &&
        !env.GITHUB_CLIENT_ID &&
        !env.GITHUB_CLIENT_SECRET;
      valid &&=
        env.STAGING_EMAIL_ENABLED === "false"
          ? !env.STAGING_EMAIL_RECIPIENT
          : env.STAGING_EMAIL_ENABLED === "true" &&
            isApprovedMailbox(env.STAGING_EMAIL_RECIPIENT) &&
            !!env.EMAIL;
    }
  } else if (env.ENVIRONMENT === "development" || env.ENVIRONMENT === "test") {
    // Local challenge bypasses must never be usable on a public hostname,
    // including a deployment accidentally left in development mode.
    valid = isLocalOrigin(env.APP_ORIGIN) && isLocalOrigin(requestOrigin);
  }
  if (!valid)
    fail(503, "CONFIGURATION_REQUIRED", "Service configuration is incomplete.");
  if (isSecureEnvironment(env.ENVIRONMENT) && requestOrigin !== env.APP_ORIGIN)
    fail(403, "INVALID_HOST", "Request hostname is not allowed.");
}
