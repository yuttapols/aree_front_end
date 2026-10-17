import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { ApiClient } from '../api-client';
import { DateRange } from '../models/common.model';
import {
  BreakdownSlice,
  DashboardSummaryResponse,
  DashboardTotals,
  HourlySalesResponse,
  PaymentMethodShareResponse,
  SalesTrendPoint,
  TopProductResponse,
  TrendGroupBy,
} from '../models/dashboard.model';

type RawSummary = Partial<DashboardSummaryResponse> & {
  walkInAmount?: number;
  onlineAmount?: number;
  memberAmount?: number;
  guestAmount?: number;
  netSales?: number;
  averagePerOrder?: number;
  walkInCount?: number;
  onlineCount?: number;
  memberOrderCount?: number;
};

type RawTrendPoint = Partial<SalesTrendPoint> & { netSales?: number };
type RawTopProduct = Partial<TopProductResponse> & { amount?: number };
type RawMethodShare = Partial<PaymentMethodShareResponse> & { paymentCount?: number };

const DAY_MS = 86_400_000;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function previousRange(range: DateRange): DateRange {
  const length =
    Math.round(
      (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY_MS,
    ) + 1;
  return { from: shiftDate(range.from, -length), to: shiftDate(range.from, -1) };
}

function toTotals(raw: RawSummary | null | undefined): DashboardTotals {
  return {
    salesAmount: toNumber(raw?.salesAmount ?? raw?.netSales),
    orderCount: toNumber(raw?.orderCount),
    averageOrderValue: toNumber(raw?.averageOrderValue ?? raw?.averagePerOrder),
    newMembers: toNumber(raw?.newMembers),
    pointsIssued: toNumber(raw?.pointsIssued),
    pointsRedeemed: toNumber(raw?.pointsRedeemed),
  };
}

function toSlice(
  slice: Partial<BreakdownSlice> | undefined,
  count: number | undefined,
  amount: number | undefined,
): BreakdownSlice {
  return { count: toNumber(slice?.count ?? count), amount: toNumber(slice?.amount ?? amount) };
}

function toSummary(raw: RawSummary, previous: RawSummary | null): DashboardSummaryResponse {
  const totals = toTotals(raw);
  const member = toSlice(raw.member, raw.memberOrderCount, raw.memberAmount);
  return {
    ...totals,
    previous: toTotals(raw.previous ?? previous),
    walkIn: toSlice(raw.walkIn, raw.walkInCount, raw.walkInAmount),
    online: toSlice(raw.online, raw.onlineCount, raw.onlineAmount),
    member,
    guest: toSlice(raw.guest, Math.max(0, totals.orderCount - member.count), raw.guestAmount),
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly api = inject(ApiClient);

  summary(range: DateRange): Observable<DashboardSummaryResponse> {
    return forkJoin({
      current: this.api.get<RawSummary>('/admin/dashboard/summary', { ...range }),
      previous: this.api.get<RawSummary>(
        '/admin/dashboard/summary',
        { ...previousRange(range) },
        {
          silent: true,
        },
      ),
    }).pipe(map(({ current, previous }) => toSummary(current ?? {}, previous)));
  }

  salesTrend(range: DateRange, groupBy: TrendGroupBy): Observable<SalesTrendPoint[]> {
    return this.api
      .get<RawTrendPoint[]>('/admin/dashboard/sales-trend', { ...range, groupBy })
      .pipe(
        map((points) =>
          (points ?? []).map((point) => ({
            period: point.period ?? '',
            salesAmount: toNumber(point.salesAmount ?? point.netSales),
            orderCount: toNumber(point.orderCount),
          })),
        ),
      );
  }

  topProducts(range: DateRange, limit = 5): Observable<TopProductResponse[]> {
    return this.api.get<RawTopProduct[]>('/admin/dashboard/top-products', { ...range, limit }).pipe(
      map((products) =>
        (products ?? []).map((product) => ({
          productId: toNumber(product.productId),
          productName: product.productName ?? '',
          productNameEn: product.productNameEn ?? product.productName ?? '',
          quantity: toNumber(product.quantity),
          salesAmount: toNumber(product.salesAmount ?? product.amount),
        })),
      ),
    );
  }

  paymentMethods(range: DateRange): Observable<PaymentMethodShareResponse[]> {
    return this.api.get<RawMethodShare[]>('/admin/dashboard/payment-methods', { ...range }).pipe(
      map((methods) =>
        (methods ?? []).map((method) => ({
          methodCode: method.methodCode ?? '',
          methodName: method.methodName ?? method.methodCode ?? '',
          methodNameEn: method.methodNameEn ?? method.methodName ?? method.methodCode ?? '',
          amount: toNumber(method.amount),
          count: toNumber(method.count ?? method.paymentCount),
        })),
      ),
    );
  }

  hourly(date: string): Observable<HourlySalesResponse[]> {
    return this.api.get<HourlySalesResponse[]>('/admin/dashboard/hourly', { date }).pipe(
      map((hours) =>
        (hours ?? []).map((hour) => ({
          hour: toNumber(hour.hour),
          orderCount: toNumber(hour.orderCount),
          netSales: toNumber(hour.netSales),
        })),
      ),
    );
  }
}
