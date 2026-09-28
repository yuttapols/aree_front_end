import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';
import {
  PromotionResponse,
  PromotionUpsertRequest,
  PromotionUsageResponse,
} from '../models/loyalty.model';

@Injectable({ providedIn: 'root' })
export class PromotionApi {
  private readonly api = inject(ApiClient);

  publicList(): Observable<PromotionResponse[]> {
    return this.api.get<PromotionResponse[]>('/public/promotions', undefined, { background: true });
  }

  publicDetail(id: number): Observable<PromotionResponse> {
    return this.api.get<PromotionResponse>(`/public/promotions/${id}`);
  }

  list(): Observable<PromotionResponse[]> {
    return this.api.get<PromotionResponse[]>('/admin/promotions');
  }

  detail(id: number): Observable<PromotionResponse> {
    return this.api.get<PromotionResponse>(`/admin/promotions/${id}`);
  }

  create(request: PromotionUpsertRequest): Observable<PromotionResponse> {
    return this.api.post<PromotionResponse>('/admin/promotions', request);
  }

  update(id: number, request: PromotionUpsertRequest): Observable<PromotionResponse> {
    return this.api.put<PromotionResponse>(`/admin/promotions/${id}`, request);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/admin/promotions/${id}`);
  }

  usages(id: number): Observable<PromotionUsageResponse[]> {
    return this.api.get<PromotionUsageResponse[]>(`/admin/promotions/${id}/usages`);
  }
}
