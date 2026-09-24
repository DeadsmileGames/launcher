const CODE_MESSAGES = {
  BRIDGE_UNAVAILABLE: "Launcher service is unavailable.",
  REQUEST_SECURITY_UNAVAILABLE: "Refresh and try again.",

  NETWORK_ERROR: "Could not connect. Check your internet.",
  SERVICE_UNAVAILABLE: "Service unavailable. Try again later.",
  INTERNAL_ERROR: "Something went wrong. Try again later.",

  UNAUTHENTICATED: "Please sign in to continue.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  INVALID_TOTP: "Invalid authentication code.",
  TWO_FACTOR_CHALLENGE_EXPIRED: "Session expired. Please sign in again.",
  USER_NOT_FOUND: "Account not found.",

  CSRF_INIT_FAILED: "Refresh and try again.",
  CSRF_VALIDATION_FAILED: "Refresh and try again.",

  RATE_LIMITED: "Too many attempts. Try again shortly.",
  PAYLOAD_TOO_LARGE: "That file or request is too large.",
  VALIDATION_ERROR: "Check the fields and try again.",
  INVALID_REQUEST: "The request could not be completed.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "This item could not be found.",
  CONFLICT: "This action could not be completed.",

  USERNAME_TAKEN: "That username is already taken.",
  EMAIL_TAKEN: "That email is already registered.",
  EMAIL_NOT_VERIFIED:
  "Confirm your email address before signing in.",

  EMAIL_CONFIRMATION_INVALID:
    "This email confirmation link is invalid or has expired.",

  EMAIL_CONFIRMATION_COOLDOWN:
    "Please wait one minute before requesting another confirmation email.",

  EMAIL_CHANGE_REQUIRES_VERIFICATION:
    "Use the email verification process to change your email address.",

  EMAIL_UNCHANGED:
    "Enter a different email address.",
  INVALID_PASSWORD: "Current password is incorrect.",
  SECRET_DECRYPT_FAILED: "Reconnect your itch.io account.",

  GAME_NOT_FOUND: "That game could not be found.",
  GAME_NOT_OWNED: "This game is not available in your library.",
  GAME_ACCESS_REQUIRED: "This game is not available in your library.",
  GAME_ASSET_UNAVAILABLE: "The download is not available right now.",
  GAME_RELEASE_NOT_CONFIGURED: "The download is not available right now.",
  GAME_RELEASE_NOT_FOUND: "The download is not available right now.",
  GAME_RUNNING: "Close the game and try again.",
  DOWNLOAD_NOT_AUTHORIZED: "The download could not be started.",
  GAME_DOWNLOAD_FAILED: "The download failed. Try again later.",
  GAME_DOWNLOAD_CHECKSUM_MISMATCH: "The download failed. Try again later.",
  GAME_DOWNLOAD_SIZE_MISMATCH: "The download failed. Try again later.",
  GAME_DOWNLOAD_TOO_LARGE: "The download is too large.",
  WINDOWS_EXECUTABLE_MISSING: "The game could not be installed.",

  GITHUB_GAMES_ACCESS_DENIED: "The download is not available right now.",
  GITHUB_GAMES_NOT_CONFIGURED: "The download is not available right now.",
  GITHUB_REDIRECT_UNAVAILABLE: "The download failed. Try again later.",
  GITHUB_UNAVAILABLE: "The download failed. Try again later.",

  ITCH_NOT_CONNECTED: "Connect your itch.io account to continue.",
  ITCH_NOT_CONFIGURED: "itch.io connection is temporarily unavailable.",
  ITCH_UNAVAILABLE: "itch.io is unavailable. Try again later.",
  ITCH_RECONNECT_REQUIRED: "Reconnect your itch.io account.",
  ITCH_ACCOUNT_MISMATCH: "Reconnect your itch.io account.",
  ITCH_ACCOUNT_IN_USE:
    "This itch.io account is already connected to another account.",
  ITCH_GAME_NOT_CONFIGURED: "This game is not ready yet.",
  ITCH_LIBRARY_INVALID: "Your itch.io library could not be checked. Try again.",
  ITCH_LIBRARY_TOO_LARGE:
    "Your itch.io library could not be checked. Try again.",
  ITCH_CONNECTION_FAILED: "itch.io connection failed. Try again.",
  ITCH_LOGIN_EXPIRED: "itch.io sign-in expired. Try again.",
  ITCH_LOGIN_IN_PROGRESS: "itch.io sign-in is already open.",

  ITCH_LINK_EXPIRED: "This connection request expired. Start again.",
  ITCH_SCOPE_MISSING: "Required itch.io access was not granted. Try again.",
  ITCH_PROFILE_INVALID: "The itch.io account could not be verified.",

  CLOUD_SAVES_DISABLED: "Cloud saves are not available for this game.",
  SAVE_CONFLICT: "A newer cloud save is available.",
  SAVE_INVALID: "The save file could not be read.",
  SAVE_NOT_FOUND: "No cloud save was found.",
  SAVE_TOO_LARGE: "This save is too large to sync.",

  SESSION_NOT_ACTIVE: "This play session is already closed.",
  SESSION_START_FAILED: "The play session could not be started.",

  NO_UPDATE_AVAILABLE: "No update is available.",
};

const STATUS_MESSAGES = {
  400: "Check the fields and try again.",
  401: "Please sign in to continue.",
  403: "You do not have permission to do that.",
  404: "This page or action could not be found.",
  409: "This action could not be completed.",
  413: "That file or request is too large.",
  429: "Too many attempts. Try again shortly.",
  500: "Something went wrong. Try again later.",
  502: "Service unavailable. Try again later.",
  503: "Service unavailable. Try again later.",
};

export function friendlyErrorMessage(
  error,
  fallback = "Something went wrong. Try again later.",
) {
  const code = String(error?.code || error?.message || "").toUpperCase();
  if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  const status = Number(error?.status || 0);
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  return fallback;
}
