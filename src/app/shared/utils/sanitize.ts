export const TEXT_LIMITS = {
  nickname: 50,
  personName: 100,
  phone: 20,
  email: 100,
  password: 100,
  productName: 150,
  categoryName: 100,
  methodName: 100,
  promotionName: 150,
  shortText: 255,
  description: 1000,
  instruction: 1000,
  note: 500,
  remark: 300,
  reason: 300,
  address: 500,
  code: 30,
} as const;

const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g;
const MARKUP_PATTERN =
  /<\s*\/?\s*[a-z!?][^>]*>|javascript\s*:|data\s*:\s*text\/html|\bon[a-z]+\s*=/i;
const CODE_ALLOWED = /[^A-Z0-9_-]/g;
const PRODUCT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,29}$/;
const PAYMENT_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,29}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTERNAL_PATH_PATTERN = /^\/(?![/\\])[^\s]*$/;

export function containsMarkup(value: string): boolean {
  return MARKUP_PATTERN.test(value);
}

export function containsControlCharacters(value: string): boolean {
  CONTROL_CHARACTERS.lastIndex = 0;
  return CONTROL_CHARACTERS.test(value);
}

export function cleanText(value: unknown, maxLength: number = TEXT_LIMITS.shortText): string {
  return String(value ?? '')
    .replace(CONTROL_CHARACTERS, '')
    .trim()
    .slice(0, maxLength);
}

export function cleanOptionalText(value: unknown, maxLength?: number): string | null {
  return cleanText(value, maxLength) || null;
}

export function cleanCode(value: unknown, maxLength: number = TEXT_LIMITS.code): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(CODE_ALLOWED, '')
    .slice(0, maxLength);
}

export function isProductCode(value: string): boolean {
  return PRODUCT_CODE_PATTERN.test(value);
}

export function isPaymentMethodCode(value: string): boolean {
  return PAYMENT_CODE_PATTERN.test(value);
}

export function isTrackingToken(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  return value && INTERNAL_PATH_PATTERN.test(value) ? value : fallback;
}
