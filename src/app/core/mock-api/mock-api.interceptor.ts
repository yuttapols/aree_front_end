import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { MockBackend } from './mock-backend';

let backend: Promise<MockBackend> | null = null;

function loadBackend(): Promise<MockBackend> {
  backend ??= import('./mock-backend').then((module) => new module.MockBackend());
  return backend;
}

export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    !environment.useMockApi ||
    !request.url.startsWith(environment.apiHost + environment.apiBaseUrl)
  ) {
    return next(request);
  }
  return from(loadBackend()).pipe(switchMap((mock) => mock.handle(request)));
};
