import { OrderChannel } from './order.model';

export type PointTransactionType = 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE' | 'REVERSE';

export interface PointTransactionResponse {
  id: number;
  type: PointTransactionType;
  points: number;
  balanceAfter: number;
  orderNo: string | null;
  remark: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface PointSummaryResponse {
  pointsBalance: number;
  lifetimePoints: number;
  expiringPoints: number;
  expiringAt: string | null;
  earnBahtPerPoint: number;
  redeemPointsPerBaht: number;
  redeemMinPoints: number;
  redeemMaxPercent: number;
  expireDays: number;
}

export interface AdjustPointsRequest {
  points: number;
  remark: string;
}

export type PromotionType = 'PERCENT' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'POINT_MULTIPLIER';
export type PromotionScope = 'ORDER' | 'PRODUCT' | 'CATEGORY';
export type PromotionChannel = 'ALL' | OrderChannel;

export interface PromotionResponse {
  id: number;
  code: string | null;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  bannerUrl: string | null;
  type: PromotionType;
  discountValue: number;
  maxDiscount: number | null;
  buyQty: number | null;
  getQty: number | null;
  minOrderAmount: number;
  scope: PromotionScope;
  memberOnly: boolean;
  channel: PromotionChannel;
  daysOfWeek: number[] | null;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usedCount: number;
  showOnLanding: boolean;
  priority: number;
  active: boolean;
  productIds: number[];
  categoryIds: number[];
}

export type PromotionUpsertRequest = Omit<PromotionResponse, 'id' | 'usedCount'>;

export interface PromotionUsageResponse {
  id: number;
  orderNo: string;
  customerName: string | null;
  discountAmount: number;
  createdAt: string;
}

export interface PromotionValidateRequest {
  code: string;
  channel: OrderChannel;
  subtotal: number;
}
