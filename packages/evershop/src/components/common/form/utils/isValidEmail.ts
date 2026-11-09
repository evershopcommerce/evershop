/**
 * The email rule of `EmailField`. Code that checks an email outside the
 * form's validation (the checkout saves a guest's email as soon as it is
 * entered) uses the same rule, so it never saves one the form refuses.
 */
export const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && EMAIL_PATTERN.test(value);
