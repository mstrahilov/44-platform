export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/;

export function usernameKey(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeUsernameInput(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 32);
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value.trim());
}

export function usernameErrorMessage(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';

  if (code === '23505' || /profiles_username_normalized_key|duplicate key|already exists/i.test(message)) {
    return 'That username is already taken. Capitalization does not create a different username.';
  }
  if (code === '23514' || /profiles_username_format_check/i.test(message)) {
    return 'Use 3–32 letters, numbers, or underscores for your username.';
  }
  return null;
}
