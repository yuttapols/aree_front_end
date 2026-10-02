export type OrderChannel = 'WALK_IN' | 'ONLINE';

export type OrderStatus =
  'PENDING_PAYMENT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REJECTED' | 'REFUNDED';

export type PaymentMethodCode = 'CASH' | 'TRANSFER' | 'PROMPTPAY' | 'CARD' | string;

export interface PaymentMethodResponse {
  id: number;
  code: PaymentMethodCode;
  name: string;
  nameEn: string;
  requiresSlip: boolean;
  requiresReference: boolean;
  allowOnline: boolean;
  active: boolean;
  sortOrder: number;
  instruction: string;
  icon: string | null;
  promptpayId: string | null;
  bankAccount: string | null;
}

export interface PaymentMethodUpsertRequest {
  code: string;
  name: string;
  nameEn: string;
  requiresSlip: boolean;
  requiresReference: boolean;
  allowOnline: boolean;
  active: boolean;
  instruction: string;
  icon: string | null;
  sortOrder: number;
}

export interface CartItemRequest {
  productId: number;
  quantity: number;
  optionItemIds: number[];
  note?: string | null;
}

export interface QuoteRequest {
  channel: OrderChannel;
  items: CartItemRequest[];
  promoCode?: string | null;
  redeemPoints?: number | null;
  customerPhone?: string | null;
}

export interface AdminQuoteRequest {
  items: CartItemRequest[];
  promoCode?: string | null;
  redeemPoints?: number | null;
  customerPhone?: string | null;
}

export interface OrderItemOptionResponse {
  optionItemId: number;
  optionGroupName: string;
  optionName: string;
  optionNameEn: string;
  extraPrice: number;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  productNameEn: string;
  unitPrice: number;
  optionsPrice: number;
  quantity: number;
  lineTotal: number;
  note: string | null;
  options: OrderItemOptionResponse[];
}

export interface AppliedPromotion {
  promotionId: number;
  name: string;
  nameEn: string;
  code: string | null;
  type: string;
  discountAmount: number;
  pointMultiplier: number | null;
}

export interface QuoteResponse {
  items: OrderItemResponse[];
  subtotal: number;
  promotionDiscount: number;
  pointDiscount: number;
  totalAmount: number;
  pointsRedeemed: number;
  pointsToEarn: number;
  appliedPromotions: AppliedPromotion[];
  promoCodeError: string | null;
  pointsBalance: number | null;
  maxRedeemablePoints: number;
  redeemMinPoints: number;
  redeemPointsPerBaht: number;
  customerName: string | null;
}

export interface PaymentResponse {
  id: number;
  orderId: number;
  methodCode: PaymentMethodCode;
  methodName: string;
  methodNameEn: string;
  amount: number;
  cashReceived: number | null;
  changeAmount: number | null;
  referenceNo: string | null;
  hasSlip: boolean;
  status: PaymentStatus;
  paidAt: string | null;
  rejectReason: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

export interface PendingPaymentItem {
  payment: PaymentResponse;
  orderId: number;
  orderNo: string;
  orderStatus: OrderStatus;
  orderTotal: number;
  customerName: string | null;
}

export interface OrderCustomerRef {
  id: number;
  nickname: string;
  memberCode?: string | null;
}

export interface OrderResponse {
  id: number;
  orderNo: string;
  trackingToken: string;
  channel: OrderChannel;
  status: OrderStatus;
  customer: OrderCustomerRef | null;
  guestName: string | null;
  guestPhone: string | null;
  items: OrderItemResponse[];
  subtotal: number;
  promotionDiscount: number;
  pointDiscount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  pointsToEarn: number;
  note: string | null;
  queueNo: number;
  cashierId: number | null;
  paymentMethodCode: PaymentMethodCode | null;
  payments: PaymentResponse[];
  appliedPromotions: AppliedPromotion[];
  createdAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface CreateOnlineOrderRequest {
  items: CartItemRequest[];
  guestName: string | null;
  guestPhone: string | null;
  note: string | null;
  paymentMethodCode: PaymentMethodCode;
  promoCode: string | null;
  redeemPoints: number | null;
}

export interface CreatePosOrderRequest {
  items: CartItemRequest[];
  customerPhone: string | null;
  guestName?: string | null;
  note: string | null;
  promoCode: string | null;
  redeemPoints: number | null;
}

export interface AddPaymentRequest {
  methodCode: PaymentMethodCode;
  amount?: number | null;
  cashReceived: number | null;
  referenceNo: string | null;
}

export interface AttachSlipRequest {
  methodCode: PaymentMethodCode;
  amount?: number | null;
  referenceNo?: string | null;
  slip: File;
}

export interface VerifyPaymentRequest {
  approve: boolean;
  rejectReason: string | null;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
}

export interface CancelOrderRequest {
  reason: string;
}

export interface OrderQuery {
  page: number;
  size: number;
  status?: OrderStatus | null;
  channel?: OrderChannel | null;
  date?: string | null;
  keyword?: string | null;
}

export interface BoardItem {
  id: number;
  orderNo: string;
  channel: OrderChannel;
  status: OrderStatus;
  queueNo: number;
  customerName: string | null;
  items: OrderItemResponse[];
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export type KitchenBoardResponse = BoardItem[];

export interface TodayResponse {
  date: string;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  completedCount: number;
  netSales: number;
  pendingPayments: number;
  lastQueueNo: number | null;
}

export interface ReceiptResponse {
  shopName: string;
  shopPhone: string;
  address: string;
  order: OrderResponse;
  cashierName: string | null;
  printedAt: string;
}
