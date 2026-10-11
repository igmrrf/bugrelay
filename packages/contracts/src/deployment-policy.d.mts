export const PRODUCTION_ORIGIN: "https://bugrelay.com";
export const APPROVED_SENDER: "notifications@bugrelay.com";
export function isSecureEnvironment(
  value: unknown,
): value is "production" | "staging";
export function isStagingOrigin(value: unknown): boolean;
export function isLocalOrigin(value: unknown): boolean;
export function isRealTurnstileKey(value: unknown): boolean;
export function isApprovedMailbox(value: unknown): boolean;
