import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import { BannerResponse } from '../api/models/banner.model';
import { BannerApi } from '../api/services/banner.api';

@Injectable({ providedIn: 'root' })
export class BannerStore {
  private readonly api = inject(BannerApi);

  readonly hero = signal<BannerResponse[]>([]);
  readonly offer = signal<BannerResponse[]>([]);
  private requested = false;

  load(force = false): void {
    if (this.requested && !force) {
      return;
    }
    this.requested = true;
    forkJoin({
      hero: this.api.publicList('HOME_HERO').pipe(catchError(() => of([]))),
      offer: this.api.publicList('HOME_OFFER').pipe(catchError(() => of([]))),
    }).subscribe(({ hero, offer }) => {
      this.hero.set(Array.isArray(hero) ? hero : []);
      this.offer.set(Array.isArray(offer) ? offer : []);
    });
  }
}
