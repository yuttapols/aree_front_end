import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ApiException, ApiResponse, ERROR_CODES, ErrorCode } from '../api/models/common.model';
import { I18nService } from '../i18n/i18n.service';
import { SILENT_ERROR } from './http-context';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const messages = inject(MessageService);
  const i18n = inject(I18nService);
  const router = inject(Router);
  const auth = inject(AuthService);
  return next(request).pipe(
    catchError((error: unknown) => {
      const exception = toApiException(error);
      if (!request.context.get(SILENT_ERROR)) {
        messages.add({
          severity: 'error',
          summary: i18n.error(exception.code),
          detail: exception.fields.map((field) => field.message).join(', ') || undefined,
        });
      }
      if (exception.code === 'ACCOUNT_SUSPENDED') {
        auth.logout().subscribe();
      } else if (exception.code === 'PASSWORD_CHANGE_REQUIRED') {
        router.navigateByUrl('/change-password');
      }
      return throwError(() => exception);
    }),
  );
};

export function toApiException(error: unknown): ApiException {
  if (error instanceof ApiException) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiResponse<unknown>> | null;
    const apiError = body?.error;
    const retryAfterSeconds = readRetryAfter(error);
    if (apiError && isErrorCode(apiError.code)) {
      return new ApiException(
        apiError.code,
        apiError.message,
        error.status,
        apiError.fields ?? [],
        retryAfterSeconds,
      );
    }
    const fallback: ErrorCode = error.status === 0 ? 'NETWORK_ERROR' : statusToCode(error.status);
    return new ApiException(fallback, error.message, error.status, [], retryAfterSeconds);
  }
  return new ApiException('INTERNAL_ERROR', String(error), 500);
}

function readRetryAfter(error: HttpErrorResponse): number | null {
  const header = error.headers?.get('Retry-After');
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds : null;
}

function isErrorCode(code: unknown): code is ErrorCode {
  return ERROR_CODES.includes(code as ErrorCode);
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'DUPLICATE_VALUE';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 423:
      return 'ACCOUNT_LOCKED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}
