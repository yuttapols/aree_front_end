import { HttpParams } from '@angular/common/http';

import { UserRole } from '../api/models/user.model';
import type { MockDatabase, MockState, MockUser } from './mock-db';
import { MockHttpError } from './mock-utils';

export interface MockContext {
  db: MockDatabase;
  state: MockState;
  params: Record<string, string>;
  query: HttpParams;
  body: unknown;
  user: MockUser | null;
  now: Date;
}

export type MockHandler = (context: MockContext) => unknown;

interface MockRoute {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: MockHandler;
}

export class MockRouter {
  private readonly routes: MockRoute[] = [];

  get(path: string, handler: MockHandler): this {
    return this.add('GET', path, handler);
  }

  post(path: string, handler: MockHandler): this {
    return this.add('POST', path, handler);
  }

  put(path: string, handler: MockHandler): this {
    return this.add('PUT', path, handler);
  }

  patch(path: string, handler: MockHandler): this {
    return this.add('PATCH', path, handler);
  }

  delete(path: string, handler: MockHandler): this {
    return this.add('DELETE', path, handler);
  }

  match(
    method: string,
    path: string,
  ): { handler: MockHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }
      const result = route.pattern.exec(path);
      if (result) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, index) => {
          params[key] = decodeURIComponent(result[index + 1] ?? '');
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  private add(method: string, path: string, handler: MockHandler): this {
    const keys: string[] = [];
    const source = path.replace(/:([a-zA-Z]+)/g, (_match, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
    return this;
  }
}

export function requireUser(context: MockContext): MockUser {
  if (!context.user) {
    throw new MockHttpError(401, 'UNAUTHORIZED', 'Login required');
  }
  return context.user;
}

export function requireRole(context: MockContext, ...roles: UserRole[]): MockUser {
  const user = requireUser(context);
  if (!roles.includes(user.role)) {
    throw new MockHttpError(403, 'FORBIDDEN', 'Forbidden');
  }
  return user;
}

export function requireStaff(context: MockContext): MockUser {
  return requireRole(context, 'STAFF', 'ADMIN');
}

export function requireAdmin(context: MockContext): MockUser {
  return requireRole(context, 'ADMIN');
}

export function bodyOf<T>(context: MockContext): T {
  return (context.body ?? {}) as T;
}

export function numberParam(context: MockContext, key: string): number {
  return Number(context.params[key]);
}

export function queryNumber(context: MockContext, key: string, fallback: number): number {
  const value = context.query.get(key);
  return value === null || value === '' ? fallback : Number(value);
}

export function queryString(context: MockContext, key: string): string {
  return context.query.get(key)?.trim() ?? '';
}
