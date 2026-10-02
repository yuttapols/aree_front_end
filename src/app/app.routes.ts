import { Routes } from '@angular/router';

import { authGuard, guestOnlyGuard, roleGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'backoffice',
    canActivate: [roleGuard('STAFF', 'ADMIN')],
    loadComponent: () =>
      import('./layout/backoffice-layout/backoffice-layout').then((m) => m.BackofficeLayout),
    loadChildren: () =>
      import('./features/backoffice/backoffice.routes').then((m) => m.BACKOFFICE_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('./layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/landing/landing-page').then((m) => m.LandingPage),
      },
      {
        path: 'menu/:categorySlug',
        loadComponent: () => import('./features/landing/landing-page').then((m) => m.LandingPage),
      },
      {
        path: 'login',
        canActivate: [guestOnlyGuard],
        loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        canActivate: [guestOnlyGuard],
        loadComponent: () =>
          import('./features/register/register-page').then((m) => m.RegisterPage),
      },
      {
        path: 'change-password',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/change-password/change-password-page').then(
            (m) => m.ChangePasswordPage,
          ),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/checkout/checkout-page').then((m) => m.CheckoutPage),
      },
      {
        path: 'track/:token',
        loadComponent: () =>
          import('./features/checkout/track-order-page').then((m) => m.TrackOrderPage),
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('./features/promotions/promotions-page').then((m) => m.PromotionsPage),
      },
      {
        path: 'promotions/:id',
        loadComponent: () =>
          import('./features/promotions/promotion-detail-page').then((m) => m.PromotionDetailPage),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./features/errors/status-page').then((m) => m.StatusPage),
        data: { kind: 'forbidden' },
      },
      {
        path: '**',
        loadComponent: () => import('./features/errors/status-page').then((m) => m.StatusPage),
        data: { kind: 'notFound' },
      },
    ],
  },
];
