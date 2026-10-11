// Shared by the Worker and offline configuration validation. No credentials.
export const PRODUCTION_ORIGIN = "https://bugrelay.com";
export const APPROVED_SENDER = "notifications@bugrelay.com";
export function isSecureEnvironment(value) {
  return value === "production" || value === "staging";
}
export function isStagingOrigin(value) {
  return (
    typeof value === "string" &&
    /^https:\/\/bugrelay-web-staging\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/.test(
      value,
    )
  );
}
export function isLocalOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.origin === value &&
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
export function isRealTurnstileKey(value) {
  // Reject known bypass keys; actual key validity still requires Siteverify.
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value &&
    !/REPLACE_WITH|[<>\s]/.test(value) &&
    !/^[123]x0+[A-Z]{2}$/.test(value)
  );
}
export function isApprovedMailbox(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    value === value.toLowerCase() &&
    !/REPLACE_WITH/i.test(value) &&
    /^[^\s@<>,;*]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      value,
    )
  );
}
