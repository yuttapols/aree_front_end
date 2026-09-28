import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../api/models/common.model';
import { registerAdminCatalogHandlers } from './handlers/admin-catalog.handlers';
import { registerAdminOrderHandlers } from './handlers/admin-orders.handlers';
import { registerAdminPromotionHandlers } from './handlers/admin-promotions.handlers';
import { registerAdminUserHandlers } from './handlers/admin-users.handlers';
import { authenticate, registerAuthHandlers } from './handlers/auth.handlers';
import { registerDashboardHandlers } from './handlers/dashboard.handlers';
import { registerPublicHandlers } from './handlers/public.handlers';
import { MockDatabase } from './mock-db';
import { expirePoints } from './mock-domain';
import { MockRouter } from './mock-router';
import { MockHttpError } from './mock-utils';

@Injectable({ providedIn: 'root' })
export class MockBackend {
  readonly db = new MockDatabase();
  private readonly router = new MockRouter();

  constructor() {
    registerAuthHandlers(this.router);
    registerPublicHandlers(this.router);
    registerAdminCatalogHandlers(this.router);
    registerAdminUserHandlers(this.router);
    registerAdminOrderHandlers(this.router);
    registerAdminPromotionHandlers(this.router);
    registerDashboardHandlers(this.router);
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return timer(environment.mockLatencyMs).pipe(switchMap(() => from(this.execute(request))));
  }

  private async execute(request: HttpRequest<unknown>): Promise<HttpEvent<unknown>> {
    const path = request.url.slice(environment.apiBaseUrl.length).split('?')[0] ?? '';
    const now = new Date();
    try {
      const route = this.router.match(request.method, path);
      if (!route) {
        throw new MockHttpError(404, 'NOT_FOUND', `${request.method} ${path}`);
      }
      const state = this.db.state;
      expirePoints(state, now);
      const user = authenticate(state, request.headers.get('Authorization'), now);
      const data = await route.handler({
        db: this.db,
        state,
        params: route.params,
        query: request.params,
        body: request.body,
        user,
        now,
      });
      this.db.save();
      const body: ApiResponse<unknown> = {
        success: true,
        data: data ?? null,
        error: null,
        timestamp: now.toISOString(),
      };
      return new HttpResponse({ status: 200, body, url: request.url });
    } catch (error) {
      this.db.save();
      const failure =
        error instanceof MockHttpError
          ? error
          : new MockHttpError(500, 'INTERNAL_ERROR', String(error));
      const body: ApiResponse<null> = {
        success: false,
        data: null,
        error: { code: failure.code, message: failure.message, fields: failure.fields },
        timestamp: now.toISOString(),
      };
      throw new HttpErrorResponse({
        status: failure.status,
        statusText: failure.code,
        error: body,
        url: request.url,
      });
    }
  }
}

export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!environment.useMockApi || !request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  return inject(MockBackend).handle(request);
};
