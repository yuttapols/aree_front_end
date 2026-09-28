import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';
import { DateRange } from '../models/common.model';
import {
  DashboardSummaryResponse,
  HourlySalesResponse,
  PaymentMethodShareResponse,
  SalesTrendPoint,
  TopProductResponse,
  TrendGroupBy,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly api = inject(ApiClient);

  summary(range: DateRange): Observable<DashboardSummaryResponse> {
    return this.api.get<DashboardSummaryResponse>('/admin/dashboard/summary', { ...range });
  }

  salesTrend(range: DateRange, groupBy: TrendGroupBy): Observable<SalesTrendPoint[]> {
    return this.api.get<SalesTrendPoint[]>('/admin/dashboard/sales-trend', { ...range, groupBy });
  }

  topProducts(range: DateRange, limit = 5): Observable<TopProductResponse[]> {
    return this.api.get<TopProductResponse[]>('/admin/dashboard/top-products', { ...range, limit });
  }

  paymentMethods(range: DateRange): Observable<PaymentMethodShareResponse[]> {
    return this.api.get<PaymentMethodShareResponse[]>('/admin/dashboard/payment-methods', {
      ...range,
    });
  }

  hourly(range: DateRange): Observable<HourlySalesResponse[]> {
    return this.api.get<HourlySalesResponse[]>('/admin/dashboard/hourly', { ...range });
  }
}
