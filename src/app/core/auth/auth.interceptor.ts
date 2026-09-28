import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { ApiResponse } from '../api/models/common.model';
import { SKIP_AUTH_RETRY } from '../http/http-context';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);

  const token = store.accessToken();

  return next(withBearer(request, token)).pipe(
    catchError((error: unknown) => {
      if (request.context.get(SKIP_AUTH_RETRY) || !token || !isSessionRejected(error)) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            auth.expireSession();
            return throwError(() => error);
          }
          return next(withBearer(request, store.accessToken()));
        }),
      );
    }),
  );
};

function withBearer(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}

function isSessionRejected(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return false;
  }
  const body = error.error as Partial<ApiResponse<unknown>> | null;
  const code = body?.error?.code;
  return code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED';
}
