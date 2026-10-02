import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { UserRole } from '../api/models/user.model';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const CHANGE_PASSWORD_PATH = '/change-password';

function passwordChangeRedirect(store: AuthStore, router: Router, url: string): UrlTree | null {
  if (url.startsWith(CHANGE_PASSWORD_PATH)) {
    return null;
  }
  return store.user()?.passwordChangeRequired ? router.createUrlTree([CHANGE_PASSWORD_PATH]) : null;
}

export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (!store.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return passwordChangeRedirect(store, router, state.url) ?? true;
};

export const guestOnlyGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  if (!store.isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree([inject(AuthService).landingPathFor(store.role())]);
};

export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const store = inject(AuthStore);
    const router = inject(Router);
    if (!store.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    const redirect = passwordChangeRedirect(store, router, state.url);
    if (redirect) {
      return redirect;
    }
    return store.hasRole(...roles) || router.createUrlTree(['/forbidden']);
  };
}
