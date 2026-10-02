const TEMPORARY_PASSWORD_PREFIX = 'R5D';

export function generateTemporaryPassword(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return `${TEMPORARY_PASSWORD_PREFIX}${100000 + (random[0] % 900000)}`;
}
