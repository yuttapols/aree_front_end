import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';
import {
  AdminBannerResponse,
  BannerOrderRequest,
  BannerPlacement,
  BannerResponse,
  BannerUpsertRequest,
} from '../models/banner.model';

export const BANNER_IMAGE_ENDPOINT = '/admin/banners/images';

@Injectable({ providedIn: 'root' })
export class BannerApi {
  private readonly api = inject(ApiClient);

  publicList(placement: BannerPlacement): Observable<BannerResponse[]> {
    return this.api.get<BannerResponse[]>(
      '/public/banners',
      { placement },
      { background: true, silent: true },
    );
  }

  list(placement: BannerPlacement): Observable<AdminBannerResponse[]> {
    return this.api.get<AdminBannerResponse[]>('/admin/banners', { placement });
  }

  create(request: BannerUpsertRequest): Observable<AdminBannerResponse> {
    return this.api.post<AdminBannerResponse>('/admin/banners', request);
  }

  update(id: number, request: BannerUpsertRequest): Observable<AdminBannerResponse> {
    return this.api.put<AdminBannerResponse>(`/admin/banners/${id}`, request);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/admin/banners/${id}`);
  }

  reorder(request: BannerOrderRequest): Observable<AdminBannerResponse[]> {
    return this.api.put<AdminBannerResponse[]>('/admin/banners/order', request);
  }
}
