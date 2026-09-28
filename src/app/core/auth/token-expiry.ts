export function accessTokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts[0] === 'mock') {
    const expiresAt = Number(parts[2]);
    return Number.isFinite(expiresAt) ? expiresAt : null;
  }
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: unknown;
    };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
