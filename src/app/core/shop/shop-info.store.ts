import { Injectable, computed, inject, signal } from '@angular/core';

import { ShopInfoResponse } from '../api/models/user.model';
import { UserApi } from '../api/services/user.api';

@Injectable({ providedIn: 'root' })
export class ShopInfoStore {
  private readonly api = inject(UserApi);

  readonly info = signal<ShopInfoResponse | null>(null);
  readonly acceptingOrders = computed(() => {
    const info = this.info();
    return !info || (info.acceptOnlineOrder && info.openNow);
  });
  private requested = false;

  ensureLoaded(): void {
    if (!this.requested) {
      this.requested = true;
      this.load();
    }
  }

  load(): void {
    this.requested = true;
    this.api.shopInfo().subscribe({
      next: (info) => this.info.set(info),
      error: () => this.info.set(null),
    });
  }
}
