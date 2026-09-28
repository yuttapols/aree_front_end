import { Injectable, inject, signal } from '@angular/core';

import { ShopInfoResponse } from '../api/models/user.model';
import { UserApi } from '../api/services/user.api';

@Injectable({ providedIn: 'root' })
export class ShopInfoStore {
  private readonly api = inject(UserApi);

  readonly info = signal<ShopInfoResponse | null>(null);

  load(): void {
    this.api.shopInfo().subscribe({
      next: (info) => this.info.set(info),
      error: () => this.info.set(null),
    });
  }
}
