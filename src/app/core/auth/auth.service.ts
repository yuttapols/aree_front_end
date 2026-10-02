import { DOCUMENT, Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import {
  Observable,
  catchError,
  filter,
  finalize,
  firstValueFrom,
  fromEvent,
  map,
  merge,
  of,
  shareReplay,
  tap,
} from 'rxjs';

import { ApiClient } from '../api/api-client';
import {
  AuthResponse,
  LoginRequest,
  MeResponse,
  RegisterRequest,
  UserRole,
} from '../api/models/user.model';
import { I18nService } from '../i18n/i18n.service';
import { AuthStore } from './auth.store';

const REFRESH_AHEAD_MS = 60_000;
const PROTECTED_PATHS = ['/profile', '/backoffice'];
const IDLE_CHECK_MS = 60_000;
const IDLE_WINDOW_MS: Record<UserRole, number> = {
  CUSTOMER: 15 * 60_000,
  STAFF: 12 * 60 * 60_000,
  ADMIN: 12 * 60 * 60_000,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(I18nService);

  private refreshInFlight: Observable<boolean> | null = null;

  constructor() {
    effect((onCleanup) => {
      const expiresAt = this.store.tokenExpiresAt();
      if (expiresAt === null) {
        return;
      }
      const timer = setTimeout(
        () => this.keepSessionAlive(),
        Math.max(expiresAt - REFRESH_AHEAD_MS - Date.now(), 0),
      );
      onCleanup(() => clearTimeout(timer));
    });
    fromEvent(this.document, 'visibilitychange')
      .pipe(filter(() => this.document.visibilityState === 'visible'))
      .subscribe(() => {
        const expiresAt = this.store.tokenExpiresAt();
        if (expiresAt !== null && expiresAt - REFRESH_AHEAD_MS <= Date.now()) {
          this.keepSessionAlive();
        }
      });

    let lastActivityAt = Date.now();
    merge(
      fromEvent(this.document, 'click'),
      fromEvent(this.document, 'keydown'),
      fromEvent(this.document, 'touchstart'),
    ).subscribe(() => (lastActivityAt = Date.now()));
    setInterval(() => {
      const role = this.store.role();
      if (!role) {
        return;
      }
      if (Date.now() - lastActivityAt >= IDLE_WINDOW_MS[role]) {
        this.expireSession(true);
      }
    }, IDLE_CHECK_MS);
  }

  login(request: LoginRequest): Observable<MeResponse> {
    return this.api
      .post<AuthResponse>('/auth/login', request, { silent: true, skipAuthRetry: true })
      .pipe(map((response) => this.applySession(response)));
  }

  register(request: RegisterRequest): Observable<MeResponse> {
    return this.api
      .post<AuthResponse>('/auth/register', request, { silent: true, skipAuthRetry: true })
      .pipe(map((response) => this.applySession(response)));
  }

  refresh(): Observable<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.api
        .post<AuthResponse>(
          '/auth/refresh',
          {},
          { silent: true, skipAuthRetry: true, background: true },
        )
        .pipe(
          map((response) => {
            this.applySession(response);
            return true;
          }),
          catchError(() => {
            this.store.clear();
            return of(false);
          }),
          finalize(() => (this.refreshInFlight = null)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight;
  }

  restoreSession(): Promise<boolean> {
    return firstValueFrom(this.refresh());
  }

  reloadMe(): Observable<MeResponse> {
    return this.api
      .get<MeResponse>('/me', undefined, { background: true })
      .pipe(tap((user) => this.store.setUser(user)));
  }

  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout', {}, { silent: true, skipAuthRetry: true }).pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        this.store.clear();
        this.router.navigateByUrl('/');
      }),
    );
  }

  expireSession(notify = false): void {
    this.store.clear();
    if (notify) {
      this.messages.add({ severity: 'warn', summary: this.i18n.error('TOKEN_EXPIRED') });
    }
    const returnUrl = this.router.url;
    if (PROTECTED_PATHS.some((path) => returnUrl.startsWith(path))) {
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  landingPathFor(role: UserRole | null): string {
    return role === 'STAFF' || role === 'ADMIN' ? '/backoffice' : '/';
  }

  private keepSessionAlive(): void {
    if (!this.store.isLoggedIn()) {
      return;
    }
    this.refresh().subscribe((refreshed) => {
      if (!refreshed) {
        this.expireSession(true);
      }
    });
  }

  private applySession(response: AuthResponse): MeResponse {
    this.store.setSession(response.accessToken, response.user);
    return response.user;
  }
}
