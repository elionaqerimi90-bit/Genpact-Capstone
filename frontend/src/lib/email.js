export const ALLOWED_EMAIL_DOMAIN =
  import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN?.trim().replace(/^@/, '') || 'genpact.com';

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export function emailDomainHint() {
  return `@${ALLOWED_EMAIL_DOMAIN}`;
}

export function emailValidationError(email) {
  if (!email.trim()) return 'Email is required';
  if (!isAllowedEmail(email)) {
    return `Only company emails ending with ${emailDomainHint()} are allowed`;
  }
  return '';
}
