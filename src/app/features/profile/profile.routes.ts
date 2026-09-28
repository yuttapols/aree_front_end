import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile-layout').then((m) => m.ProfileLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./profile-overview').then((m) => m.ProfileOverview),
      },
      {
        path: 'info',
        loadComponent: () => import('./profile-info').then((m) => m.ProfileInfo),
      },
      {
        path: 'orders',
        loadComponent: () => import('./profile-orders').then((m) => m.ProfileOrders),
      },
      {
        path: 'orders/:orderNo',
        loadComponent: () => import('./profile-order-detail').then((m) => m.ProfileOrderDetail),
      },
      {
        path: 'points',
        loadComponent: () => import('./profile-points').then((m) => m.ProfilePoints),
      },
    ],
  },
];
