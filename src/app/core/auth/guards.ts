import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../api/models/user.model';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  return (
    store.isLoggedIn() ||
    inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
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
    return store.hasRole(...roles) || router.createUrlTree(['/forbidden']);
  };
}
