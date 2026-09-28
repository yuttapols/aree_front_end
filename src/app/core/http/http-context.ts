import { HttpContext, HttpContextToken } from '@angular/common/http';

export const SILENT_ERROR = new HttpContextToken<boolean>(() => false);
export const BACKGROUND_REQUEST = new HttpContextToken<boolean>(() => false);
export const SKIP_AUTH_RETRY = new HttpContextToken<boolean>(() => false);

export interface RequestOptions {
  silent?: boolean;
  background?: boolean;
  skipAuthRetry?: boolean;
}

export function toHttpContext(options: RequestOptions = {}): HttpContext {
  return new HttpContext()
    .set(SILENT_ERROR, options.silent ?? false)
    .set(BACKGROUND_REQUEST, options.background ?? false)
    .set(SKIP_AUTH_RETRY, options.skipAuthRetry ?? false);
}
