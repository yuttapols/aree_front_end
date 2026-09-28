export type TrendGroupBy = 'DAY' | 'WEEK' | 'MONTH';

export interface DashboardTotals {
  salesAmount: number;
  orderCount: number;
  averageOrderValue: number;
  newMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
}

export interface BreakdownSlice {
  count: number;
  amount: number;
}

export interface DashboardSummaryResponse extends DashboardTotals {
  previous: DashboardTotals;
  walkIn: BreakdownSlice;
  online: BreakdownSlice;
  member: BreakdownSlice;
  guest: BreakdownSlice;
}

export interface SalesTrendPoint {
  period: string;
  salesAmount: number;
  orderCount: number;
}

export interface TopProductResponse {
  productId: number;
  productName: string;
  productNameEn: string;
  quantity: number;
  salesAmount: number;
}

export interface PaymentMethodShareResponse {
  methodCode: string;
  methodName: string;
  methodNameEn: string;
  amount: number;
  count: number;
}

export interface HourlySalesResponse {
  hour: number;
  orderCount: number;
  salesAmount: number;
}
