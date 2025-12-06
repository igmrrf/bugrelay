export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: "You have been successfully logged in.",
  USER_CREATION_PASSED:
    "Welcome to BUGRELAY. Please verify your email address.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "Email not verified",
  TOKEN_GENERATION_FAILED: "Account creation failed",
  INVALID_REQUEST: "Invalid data submitted",
};
export type AuthCode = keyof typeof AUTH_MESSAGES;
