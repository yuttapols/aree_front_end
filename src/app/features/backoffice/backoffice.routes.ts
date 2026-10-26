import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { roleGuard } from '../../core/auth/guards';

const adminOnly = [roleGuard('ADMIN')];

export const BACKOFFICE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(AuthStore).isAdmin() ? 'today' : 'queue-board'),
  },
  {
    path: 'queue-board',
    loadComponent: () => import('./queue-board/queue-board-page').then((m) => m.QueueBoardPage),
  },
  {
    path: 'today',
    loadComponent: () => import('./today/today-page').then((m) => m.TodayPage),
  },
  {
    path: 'pos',
    loadComponent: () => import('./pos/pos-page').then((m) => m.PosPage),
  },
  {
    path: 'kitchen',
    loadComponent: () => import('./kitchen/kitchen-board-page').then((m) => m.KitchenBoardPage),
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./orders/order-detail-page').then((m) => m.OrderDetailPage),
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customers-page').then((m) => m.CustomersPage),
  },
  {
    path: 'customers/:id',
    loadComponent: () =>
      import('./customers/customer-detail-page').then((m) => m.CustomerDetailPage),
  },
  {
    path: 'dashboard',
    canActivate: adminOnly,
    loadComponent: () => import('./dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'catalog',
    canActivate: adminOnly,
    loadComponent: () => import('./catalog/catalog-layout').then((m) => m.CatalogLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'categories',
        loadComponent: () => import('./catalog/categories-page').then((m) => m.CategoriesPage),
      },
      {
        path: 'products',
        loadComponent: () => import('./catalog/products-page').then((m) => m.ProductsPage),
      },
      {
        path: 'option-groups',
        loadComponent: () => import('./catalog/option-groups-page').then((m) => m.OptionGroupsPage),
      },
    ],
  },
  {
    path: 'promotions',
    canActivate: adminOnly,
    loadComponent: () =>
      import('./promotions/admin-promotions-page').then((m) => m.AdminPromotionsPage),
  },
  {
    path: 'banners',
    canActivate: adminOnly,
    loadComponent: () => import('./banners/banners-page').then((m) => m.BannersPage),
  },
  {
    path: 'promotions/new',
    canActivate: adminOnly,
    loadComponent: () =>
      import('./promotions/promotion-form-page').then((m) => m.PromotionFormPage),
  },
  {
    path: 'promotions/:id',
    canActivate: adminOnly,
    loadComponent: () =>
      import('./promotions/promotion-form-page').then((m) => m.PromotionFormPage),
  },
  {
    path: 'staff',
    canActivate: adminOnly,
    loadComponent: () => import('./staff/staff-page').then((m) => m.StaffPage),
  },
  {
    path: 'settings',
    canActivate: adminOnly,
    loadComponent: () => import('./settings/settings-page').then((m) => m.SettingsPage),
  },
];
