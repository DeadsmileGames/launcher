const CODE_MESSAGES = {
  BRIDGE_UNAVAILABLE: 'Launcher service is unavailable.',
  CSRF_INIT_FAILED: 'Refresh and try again.',
  CSRF_VALIDATION_FAILED: 'Refresh and try again.',
  DOWNLOAD_NOT_AUTHORIZED: 'The download could not be started.',
  GAME_ACCESS_REQUIRED: 'This game is not available in your library.',
  GAME_ASSET_UNAVAILABLE: 'The download is not available right now.',
  GAME_DOWNLOAD_CHECKSUM_MISMATCH: 'The download failed. Try again later.',
  GAME_DOWNLOAD_FAILED: 'The download failed. Try again later.',
  GAME_DOWNLOAD_SIZE_MISMATCH: 'The download failed. Try again later.',
  GAME_DOWNLOAD_TOO_LARGE: 'The download is too large.',
  GAME_NOT_FOUND: 'That game could not be found.',
  GAME_NOT_OWNED: 'This game is not available in your library.',
  GAME_RELEASE_NOT_CONFIGURED: 'The download is not available right now.',
  GAME_RELEASE_NOT_FOUND: 'The download is not available right now.',
  GAME_RUNNING: 'Close the game and try again.',
  GITHUB_GAMES_ACCESS_DENIED: 'The download is not available right now.',
  GITHUB_GAMES_NOT_CONFIGURED: 'The download is not available right now.',
  GITHUB_REDIRECT_UNAVAILABLE: 'The download failed. Try again later.',
  GITHUB_UNAVAILABLE: 'The download failed. Try again later.',
  ITCH_ACCOUNT_MISMATCH: 'Reconnect your itch.io account.',
  ITCH_CONNECTION_FAILED: 'itch.io connection failed. Try again.',
  ITCH_GAME_NOT_CONFIGURED: 'This game is not ready yet.',
  ITCH_LOGIN_EXPIRED: 'itch.io sign-in expired. Try again.',
  ITCH_LOGIN_IN_PROGRESS: 'itch.io sign-in is already open.',
  ITCH_NOT_CONNECTED: 'Connect your itch.io account to continue.',
  ITCH_RECONNECT_REQUIRED: 'Reconnect your itch.io account.',
  NETWORK_ERROR: 'Could not connect. Check your internet.',
  NO_UPDATE_AVAILABLE: 'No update is available.',
  REQUEST_SECURITY_UNAVAILABLE: 'Refresh and try again.',
  SAVE_CONFLICT: 'A newer cloud save is available.',
  SAVE_INVALID: 'The save file could not be read.',
  SAVE_NOT_FOUND: 'No cloud save was found.',
  SAVE_TOO_LARGE: 'This save is too large to sync.',
  SERVICE_UNAVAILABLE: 'Service unavailable. Try again later.',
  UNAUTHENTICATED: 'Please sign in to continue.',
  VALIDATION_ERROR: 'Check the fields and try again.',
  WINDOWS_EXECUTABLE_MISSING: 'The game could not be installed.',
};

const STATUS_MESSAGES = {
  400: 'Check the fields and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to do that.',
  404: 'This page or action could not be found.',
  409: 'This action could not be completed.',
  413: 'That file or request is too large.',
  429: 'Too many attempts. Try again shortly.',
  500: 'Something went wrong. Try again later.',
  502: 'Service unavailable. Try again later.',
  503: 'Service unavailable. Try again later.',
};

export function friendlyErrorMessage(error, fallback = 'Something went wrong. Try again later.') {
  const code = String(error?.code || error?.message || '').toUpperCase();
  if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  const status = Number(error?.status || 0);
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  return fallback;
}
