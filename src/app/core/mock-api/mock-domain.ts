import {
  CategoryResponse,
  OptionGroupResponse,
  ProductResponse,
  PublicProductResponse,
} from '../api/models/catalog.model';
import { ErrorCode } from '../api/models/common.model';
import { PointTransactionResponse, PromotionResponse } from '../api/models/loyalty.model';
import {
  AppliedPromotion,
  BoardItem,
  CartItemRequest,
  OrderChannel,
  OrderItemOptionResponse,
  OrderItemResponse,
  OrderResponse,
  OrderStatus,
  PaymentMethodResponse,
  PaymentResponse,
  PendingPaymentItem,
  QuoteResponse,
  TodayResponse,
} from '../api/models/order.model';
import {
  CustomerResponse,
  MeResponse,
  ShopInfoResponse,
  StaffResponse,
} from '../api/models/user.model';
import type {
  MockCategory,
  MockOrder,
  MockPayment,
  MockPointTransaction,
  MockProduct,
  MockProfile,
  MockPromotion,
  MockState,
  MockUser,
} from './mock-db';
import {
  MockHttpError,
  addDays,
  badRequest,
  dateKey,
  isoDayOfWeek,
  nextDailyCounter,
  nextId,
  notFound,
  orderNoDate,
  pad,
  roundMoney,
  unprocessable,
  uuid,
} from './mock-utils';

interface PricedLine {
  line: OrderItemResponse;
  product: MockProduct;
}

export interface PricingInput {
  channel: OrderChannel;
  items: CartItemRequest[];
  promoCode?: string | null;
  redeemPoints?: number | null;
  customer: MockUser | null;
  now: Date;
}

export interface PricingResult {
  quote: QuoteResponse;
  pointMultiplier: number;
  promoCodeErrorCode: ErrorCode | null;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  CONFIRMED: ['PREPARING', 'COMPLETED', 'CANCELLED'],
  PREPARING: ['READY', 'COMPLETED'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function findUser(state: MockState, id: number | null): MockUser | null {
  return id === null ? null : (state.users.find((user) => user.id === id) ?? null);
}

export function requireProfile(user: MockUser): MockProfile {
  if (!user.profile) {
    throw unprocessable('NOT_FOUND', 'Customer profile not found');
  }
  return user.profile;
}

export function findCustomerByPhone(state: MockState, phone: string): MockUser | null {
  return state.users.find((user) => user.phone === phone && user.profile !== null) ?? null;
}

export function nextMemberCode(state: MockState): string {
  return `R5D-${pad(nextId(state, 'member_code'), 6)}`;
}

function buildLines(state: MockState, items: CartItemRequest[]): PricedLine[] {
  if (!items.length) {
    throw badRequest('Cart is empty', [{ field: 'items', message: 'items is required' }]);
  }
  return items.map((item) => {
    const product = state.products.find((candidate) => candidate.id === item.productId);
    if (!product || !product.active || !product.available) {
      throw unprocessable('PRODUCT_UNAVAILABLE', product?.name ?? `#${item.productId}`);
    }
    const quantity = Math.floor(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw badRequest('Invalid quantity', [{ field: 'quantity', message: 'quantity 1-99' }]);
    }
    const groups = product.optionGroupIds
      .map((id) => state.optionGroups.find((group) => group.id === id))
      .filter((group): group is OptionGroupResponse => !!group && group.active);
    const selected = item.optionItemIds ?? [];
    if (new Set(selected).size !== selected.length) {
      throw unprocessable('OPTION_INVALID', 'เลือกตัวเลือกซ้ำ');
    }
    const options: OrderItemOptionResponse[] = selected.map((optionId) => {
      const group = groups.find((candidate) =>
        candidate.items.some((option) => option.id === optionId),
      );
      const option = group?.items.find((candidate) => candidate.id === optionId);
      if (!group || !option || !option.available) {
        throw unprocessable('OPTION_INVALID', `${product.name}: option #${optionId}`);
      }
      return {
        optionItemId: option.id,
        optionGroupName: group.name,
        optionName: option.name,
        optionNameEn: option.nameEn,
        extraPrice: option.extraPrice,
      };
    });
    for (const group of groups) {
      const count = options.filter((option) =>
        group.items.some((candidate) => candidate.id === option.optionItemId),
      ).length;
      if (count < group.minSelect || count > group.maxSelect) {
        throw unprocessable('OPTION_INVALID', `${product.name}: ${group.name}`);
      }
    }
    const optionsPrice = options.reduce((total, option) => total + option.extraPrice, 0);
    const line: OrderItemResponse = {
      productId: product.id,
      productName: product.name,
      productNameEn: product.nameEn,
      unitPrice: product.price,
      optionsPrice,
      quantity,
      lineTotal: roundMoney((product.price + optionsPrice) * quantity),
      note: item.note ?? null,
      options,
    };
    return { line, product };
  });
}

export function isPromotionLive(promotion: PromotionResponse, now: Date): boolean {
  return (
    promotion.active &&
    new Date(promotion.startAt).getTime() <= now.getTime() &&
    new Date(promotion.endAt).getTime() >= now.getTime()
  );
}

function promotionIneligibility(
  state: MockState,
  promotion: MockPromotion,
  context: { channel: OrderChannel; customer: MockUser | null; subtotal: number; now: Date },
): ErrorCode | null {
  const now = context.now.getTime();
  if (!promotion.active || new Date(promotion.endAt).getTime() < now) {
    return 'PROMOTION_EXPIRED';
  }
  if (new Date(promotion.startAt).getTime() > now) {
    return 'PROMOTION_NOT_ELIGIBLE';
  }
  if (promotion.daysOfWeek?.length && !promotion.daysOfWeek.includes(isoDayOfWeek(context.now))) {
    return 'PROMOTION_NOT_ELIGIBLE';
  }
  if (promotion.channel !== 'ALL' && promotion.channel !== context.channel) {
    return 'PROMOTION_NOT_ELIGIBLE';
  }
  if (promotion.memberOnly && !context.customer) {
    return 'PROMOTION_NOT_ELIGIBLE';
  }
  if (context.subtotal < promotion.minOrderAmount) {
    return 'PROMOTION_NOT_ELIGIBLE';
  }
  if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
    return 'PROMOTION_LIMIT_REACHED';
  }
  if (promotion.usagePerCustomer !== null && context.customer) {
    const used = state.promotionUsages.filter(
      (usage) => usage.promotionId === promotion.id && usage.customerId === context.customer?.id,
    ).length;
    if (used >= promotion.usagePerCustomer) {
      return 'PROMOTION_LIMIT_REACHED';
    }
  }
  return null;
}

export function promotionTargetsProduct(promotion: MockPromotion, product: MockProduct): boolean {
  switch (promotion.scope) {
    case 'PRODUCT':
      return promotion.productIds.includes(product.id);
    case 'CATEGORY':
      return promotion.categoryIds.includes(product.categoryId);
    default:
      return true;
  }
}

function promotionDiscount(
  promotion: MockPromotion,
  lines: PricedLine[],
  subtotal: number,
): number {
  const targeted = lines.filter((line) => promotionTargetsProduct(promotion, line.product));
  const base = targeted.reduce((total, line) => total + line.line.lineTotal, 0);
  if (!targeted.length || base <= 0) {
    return 0;
  }
  switch (promotion.type) {
    case 'PERCENT': {
      const raw = (base * promotion.discountValue) / 100;
      return roundMoney(Math.min(raw, promotion.maxDiscount ?? raw));
    }
    case 'FIXED_AMOUNT':
      return roundMoney(Math.min(promotion.discountValue, base, subtotal));
    case 'BUY_X_GET_Y': {
      const buy = promotion.buyQty ?? 0;
      const get = promotion.getQty ?? 0;
      if (buy <= 0 || get <= 0) {
        return 0;
      }
      const units = targeted
        .flatMap((line) =>
          Array.from(
            { length: line.line.quantity },
            () => line.line.unitPrice + line.line.optionsPrice,
          ),
        )
        .sort((a, b) => a - b);
      const freeUnits = Math.floor(units.length / (buy + get)) * get;
      return roundMoney(units.slice(0, freeUnits).reduce((total, price) => total + price, 0));
    }
    default:
      return 0;
  }
}

function toAppliedPromotion(promotion: MockPromotion, discountAmount: number): AppliedPromotion {
  return {
    promotionId: promotion.id,
    name: promotion.name,
    nameEn: promotion.nameEn,
    code: promotion.code,
    type: promotion.type,
    discountAmount,
    pointMultiplier: promotion.type === 'POINT_MULTIPLIER' ? promotion.discountValue : null,
  };
}

export function priceCart(state: MockState, input: PricingInput): PricingResult {
  const settings = state.settings;
  const lines = buildLines(state, input.items);
  const subtotal = roundMoney(lines.reduce((total, line) => total + line.line.lineTotal, 0));
  const context = {
    channel: input.channel,
    customer: input.customer,
    subtotal,
    now: input.now,
  };

  let promoCodeErrorCode: ErrorCode | null = null;
  let codePromotion: MockPromotion | null = null;
  const promoCode = input.promoCode?.trim().toUpperCase() ?? '';
  if (promoCode) {
    const found = state.promotions.find((promotion) => promotion.code?.toUpperCase() === promoCode);
    if (!found) {
      promoCodeErrorCode = 'PROMOTION_NOT_FOUND';
    } else {
      promoCodeErrorCode = promotionIneligibility(state, found, context);
      codePromotion = promoCodeErrorCode ? null : found;
    }
  }

  const eligibleAuto = state.promotions.filter(
    (promotion) => promotion.code === null && !promotionIneligibility(state, promotion, context),
  );

  const discountCandidates = eligibleAuto
    .filter((promotion) => promotion.type !== 'POINT_MULTIPLIER')
    .map((promotion) => ({ promotion, discount: promotionDiscount(promotion, lines, subtotal) }))
    .filter((candidate) => candidate.discount > 0)
    .sort((a, b) => b.promotion.priority - a.promotion.priority || b.discount - a.discount);

  let chosen = discountCandidates[0] ?? null;
  if (codePromotion && codePromotion.type !== 'POINT_MULTIPLIER') {
    const discount = promotionDiscount(codePromotion, lines, subtotal);
    if (discount > 0) {
      chosen = { promotion: codePromotion, discount };
    } else {
      promoCodeErrorCode = 'PROMOTION_NOT_ELIGIBLE';
    }
  }

  const multipliers = [
    ...eligibleAuto.filter((promotion) => promotion.type === 'POINT_MULTIPLIER'),
    ...(codePromotion?.type === 'POINT_MULTIPLIER' ? [codePromotion] : []),
  ].sort((a, b) => b.discountValue - a.discountValue);
  const multiplierPromotion = multipliers[0] ?? null;
  const pointMultiplier = multiplierPromotion?.discountValue ?? 1;

  const promotionDiscountAmount = roundMoney(Math.min(chosen?.discount ?? 0, subtotal));
  const afterPromotion = roundMoney(subtotal - promotionDiscountAmount);

  const balance = input.customer?.profile?.pointsBalance ?? 0;
  const perBaht = settings.redeemPointsPerBaht;
  const maxPointsByPercent =
    Math.floor((afterPromotion * settings.redeemMaxPercent) / 100) * perBaht;
  const rawMax = Math.min(balance, maxPointsByPercent);
  const maxRedeemablePoints =
    input.customer && rawMax >= settings.redeemMinPoints
      ? Math.floor(rawMax / perBaht) * perBaht
      : 0;

  let pointsRedeemed = 0;
  const requested = Math.floor(input.redeemPoints ?? 0);
  if (requested > 0 && input.customer) {
    if (requested < settings.redeemMinPoints) {
      throw unprocessable('POINT_BELOW_MIN', `min ${settings.redeemMinPoints}`);
    }
    if (requested > balance) {
      throw unprocessable('POINT_INSUFFICIENT', `balance ${balance}`);
    }
    if (requested > maxPointsByPercent) {
      throw unprocessable('POINT_EXCEED_LIMIT', `max ${maxPointsByPercent}`);
    }
    pointsRedeemed = Math.floor(requested / perBaht) * perBaht;
  }
  const pointDiscount = roundMoney(pointsRedeemed / perBaht);
  const totalAmount = roundMoney(Math.max(0, afterPromotion - pointDiscount));
  const pointsToEarn = Math.floor(totalAmount / settings.earnBahtPerPoint) * pointMultiplier;

  const appliedPromotions = [
    ...(chosen ? [toAppliedPromotion(chosen.promotion, promotionDiscountAmount)] : []),
    ...(multiplierPromotion ? [toAppliedPromotion(multiplierPromotion, 0)] : []),
  ];

  return {
    quote: {
      items: lines.map((line) => line.line),
      subtotal,
      promotionDiscount: promotionDiscountAmount,
      pointDiscount,
      totalAmount,
      pointsRedeemed,
      pointsToEarn,
      appliedPromotions,
      promoCodeError: promoCodeErrorCode,
      pointsBalance: input.customer ? balance : null,
      maxRedeemablePoints,
      redeemMinPoints: settings.redeemMinPoints,
      redeemPointsPerBaht: perBaht,
      customerName: input.customer?.nickname ?? null,
    },
    pointMultiplier,
    promoCodeErrorCode,
  };
}

function pushPointTransaction(
  state: MockState,
  profile: MockProfile,
  entry: Omit<MockPointTransaction, 'id' | 'balanceAfter'>,
): MockPointTransaction {
  profile.pointsBalance = Math.max(0, profile.pointsBalance + entry.points);
  const transaction: MockPointTransaction = {
    ...entry,
    id: nextId(state, 'point_transaction'),
    balanceAfter: profile.pointsBalance,
  };
  state.pointTransactions.push(transaction);
  return transaction;
}

function consumeFifo(state: MockState, customerId: number, points: number, orderId?: number): void {
  let remaining = points;
  const chunks = state.pointTransactions
    .filter(
      (transaction) => transaction.customerId === customerId && (transaction.remaining ?? 0) > 0,
    )
    .sort((a, b) => {
      if (orderId !== undefined) {
        const aMatch = a.orderId === orderId ? 0 : 1;
        const bMatch = b.orderId === orderId ? 0 : 1;
        if (aMatch !== bMatch) {
          return aMatch - bMatch;
        }
      }
      return (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '');
    });
  for (const chunk of chunks) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(chunk.remaining ?? 0, remaining);
    chunk.remaining = (chunk.remaining ?? 0) - take;
    remaining -= take;
  }
}

function expiryFrom(state: MockState, now: Date): string {
  return addDays(now, state.settings.expireDays).toISOString();
}

export function earnPoints(state: MockState, order: MockOrder, now: Date, by: string | null): void {
  const customer = findUser(state, order.customerId);
  if (!customer?.profile || order.pointsToEarn <= 0 || order.pointsEarned > 0) {
    return;
  }
  const profile = customer.profile;
  pushPointTransaction(state, profile, {
    customerId: customer.id,
    orderId: order.id,
    type: 'EARN',
    points: order.pointsToEarn,
    remaining: order.pointsToEarn,
    expiresAt: expiryFrom(state, now),
    remark: order.orderNo,
    createdAt: now.toISOString(),
    createdBy: by,
  });
  profile.lifetimePoints += order.pointsToEarn;
  order.pointsEarned = order.pointsToEarn;
}

export function redeemPoints(
  state: MockState,
  customer: MockUser,
  order: MockOrder,
  points: number,
  now: Date,
): void {
  const profile = requireProfile(customer);
  if (points > profile.pointsBalance) {
    throw unprocessable('POINT_INSUFFICIENT', `balance ${profile.pointsBalance}`);
  }
  consumeFifo(state, customer.id, points);
  pushPointTransaction(state, profile, {
    customerId: customer.id,
    orderId: order.id,
    type: 'REDEEM',
    points: -points,
    remaining: null,
    expiresAt: null,
    remark: order.orderNo,
    createdAt: now.toISOString(),
    createdBy: customer.nickname,
  });
}

export function adjustPoints(
  state: MockState,
  customer: MockUser,
  points: number,
  remark: string,
  now: Date,
  by: string,
): MockPointTransaction {
  const profile = requireProfile(customer);
  if (points < 0) {
    if (-points > profile.pointsBalance) {
      throw unprocessable('POINT_INSUFFICIENT', `balance ${profile.pointsBalance}`);
    }
    consumeFifo(state, customer.id, -points);
  } else {
    profile.lifetimePoints += points;
  }
  return pushPointTransaction(state, profile, {
    customerId: customer.id,
    orderId: null,
    type: 'ADJUST',
    points,
    remaining: points > 0 ? points : null,
    expiresAt: points > 0 ? expiryFrom(state, now) : null,
    remark,
    createdAt: now.toISOString(),
    createdBy: by,
  });
}

function reverseOrderPoints(state: MockState, order: MockOrder, now: Date, by: string): void {
  const customer = findUser(state, order.customerId);
  if (!customer?.profile) {
    return;
  }
  const profile = customer.profile;
  if (order.pointsRedeemed > 0) {
    pushPointTransaction(state, profile, {
      customerId: customer.id,
      orderId: order.id,
      type: 'REVERSE',
      points: order.pointsRedeemed,
      remaining: order.pointsRedeemed,
      expiresAt: expiryFrom(state, now),
      remark: order.orderNo,
      createdAt: now.toISOString(),
      createdBy: by,
    });
  }
  if (order.pointsEarned > 0) {
    const pullBack = Math.min(order.pointsEarned, profile.pointsBalance);
    if (pullBack > 0) {
      consumeFifo(state, customer.id, pullBack, order.id);
      pushPointTransaction(state, profile, {
        customerId: customer.id,
        orderId: order.id,
        type: 'REVERSE',
        points: -pullBack,
        remaining: null,
        expiresAt: null,
        remark: order.orderNo,
        createdAt: now.toISOString(),
        createdBy: by,
      });
    }
  }
}

export function expirePoints(state: MockState, now: Date): void {
  const expired = state.pointTransactions.filter(
    (transaction) =>
      (transaction.remaining ?? 0) > 0 &&
      transaction.expiresAt !== null &&
      new Date(transaction.expiresAt).getTime() < now.getTime(),
  );
  for (const chunk of expired) {
    const customer = findUser(state, chunk.customerId);
    if (!customer?.profile) {
      continue;
    }
    const points = chunk.remaining ?? 0;
    chunk.remaining = 0;
    pushPointTransaction(state, customer.profile, {
      customerId: customer.id,
      orderId: null,
      type: 'EXPIRE',
      points: -points,
      remaining: null,
      expiresAt: null,
      remark: null,
      createdAt: now.toISOString(),
      createdBy: 'system',
    });
  }
}

export interface CreateOrderInput {
  channel: OrderChannel;
  pricing: PricingResult;
  customer: MockUser | null;
  guestName: string | null;
  guestPhone: string | null;
  note: string | null;
  paymentMethodCode: string | null;
  cashierId: number | null;
  now: Date;
}

export function createOrder(state: MockState, input: CreateOrderInput): MockOrder {
  const counter = nextDailyCounter(state, dateKey(input.now));
  const quote = input.pricing.quote;
  const order: MockOrder = {
    id: nextId(state, 'orders'),
    orderNo: `R5D-${orderNoDate(input.now)}-${pad(counter, 4)}`,
    trackingToken: uuid(),
    channel: input.channel,
    status: 'PENDING_PAYMENT',
    customerId: input.customer?.id ?? null,
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    items: quote.items,
    subtotal: quote.subtotal,
    promotionDiscount: quote.promotionDiscount,
    pointDiscount: quote.pointDiscount,
    totalAmount: quote.totalAmount,
    pointsRedeemed: quote.pointsRedeemed,
    pointsEarned: 0,
    pointsToEarn: input.customer ? quote.pointsToEarn : 0,
    pointMultiplier: input.pricing.pointMultiplier,
    note: input.note,
    queueNo: counter,
    cashierId: input.cashierId,
    paymentMethodCode: input.paymentMethodCode,
    appliedPromotions: quote.appliedPromotions,
    createdAt: input.now.toISOString(),
    confirmedAt: null,
    preparingAt: null,
    readyAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
  };
  state.orders.push(order);
  for (const applied of quote.appliedPromotions) {
    const promotion = state.promotions.find((candidate) => candidate.id === applied.promotionId);
    if (!promotion) {
      continue;
    }
    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
      throw unprocessable('PROMOTION_LIMIT_REACHED', promotion.name);
    }
    promotion.usedCount += 1;
    state.promotionUsages.push({
      id: nextId(state, 'promotion_usage'),
      promotionId: promotion.id,
      orderId: order.id,
      customerId: order.customerId,
      discountAmount: applied.discountAmount,
      createdAt: input.now.toISOString(),
    });
  }
  if (input.customer && quote.pointsRedeemed > 0) {
    redeemPoints(state, input.customer, order, quote.pointsRedeemed, input.now);
  }
  confirmIfPaid(state, order, input.now);
  return order;
}

export function paidAmount(state: MockState, orderId: number): number {
  return roundMoney(
    state.payments
      .filter((payment) => payment.orderId === orderId && payment.status === 'PAID')
      .reduce((total, payment) => total + payment.amount, 0),
  );
}

export function confirmIfPaid(state: MockState, order: MockOrder, now: Date): void {
  if (order.status === 'PENDING_PAYMENT' && paidAmount(state, order.id) >= order.totalAmount) {
    order.status = 'CONFIRMED';
    order.confirmedAt = now.toISOString();
  }
}

export function transitionOrder(
  state: MockState,
  order: MockOrder,
  target: OrderStatus,
  now: Date,
  by: string,
): void {
  if (target === 'CANCELLED') {
    throw badRequest('Use cancel endpoint');
  }
  if (!ALLOWED_TRANSITIONS[order.status].includes(target)) {
    throw unprocessable('ORDER_INVALID_STATUS', `${order.status} → ${target}`);
  }
  order.status = target;
  const at = now.toISOString();
  if (target === 'PREPARING') {
    order.preparingAt = at;
  } else if (target === 'READY') {
    order.readyAt = at;
  } else if (target === 'COMPLETED') {
    order.preparingAt = order.preparingAt ?? at;
    order.readyAt = order.readyAt ?? at;
    order.completedAt = at;
    earnPoints(state, order, now, by);
  }
}

export function cancelOrder(
  state: MockState,
  order: MockOrder,
  reason: string,
  now: Date,
  by: string,
): void {
  if (!ALLOWED_TRANSITIONS[order.status].includes('CANCELLED')) {
    throw unprocessable('ORDER_INVALID_STATUS', `${order.status} → CANCELLED`);
  }
  if (!reason.trim()) {
    throw badRequest('Reason is required', [{ field: 'reason', message: 'reason is required' }]);
  }
  order.status = 'CANCELLED';
  order.cancelledAt = now.toISOString();
  order.cancelReason = reason.trim();
  reverseOrderPoints(state, order, now, by);
  for (const payment of state.payments.filter((candidate) => candidate.orderId === order.id)) {
    if (payment.status === 'PAID') {
      payment.status = 'REFUNDED';
    } else if (payment.status === 'PENDING') {
      payment.status = 'REJECTED';
      payment.rejectReason = reason.trim();
    }
  }
  const usages = state.promotionUsages.filter((usage) => usage.orderId === order.id);
  for (const usage of usages) {
    const promotion = state.promotions.find((candidate) => candidate.id === usage.promotionId);
    if (promotion) {
      promotion.usedCount = Math.max(0, promotion.usedCount - 1);
    }
  }
  state.promotionUsages = state.promotionUsages.filter((usage) => usage.orderId !== order.id);
}

export interface AddPaymentInput {
  methodCode: string;
  amount?: number | null;
  cashReceived: number | null;
  referenceNo: string | null;
}

export function addPayment(
  state: MockState,
  order: MockOrder,
  input: AddPaymentInput,
  staff: MockUser,
  now: Date,
): MockPayment {
  if (order.status !== 'PENDING_PAYMENT') {
    throw unprocessable('ORDER_INVALID_STATUS', order.status);
  }
  const method = state.paymentMethods.find(
    (candidate) => candidate.code === input.methodCode && candidate.active,
  );
  if (!method) {
    throw badRequest('Invalid payment method', [{ field: 'methodCode', message: 'invalid' }]);
  }
  const remaining = roundMoney(order.totalAmount - paidAmount(state, order.id));
  const amount = input.amount != null ? roundMoney(input.amount) : remaining;
  if (amount <= 0 || amount > remaining) {
    throw unprocessable('PAYMENT_AMOUNT_MISMATCH', `remaining ${remaining}`);
  }
  let changeAmount: number | null = null;
  if (method.code === 'CASH') {
    const received = roundMoney(input.cashReceived ?? amount);
    if (received < amount) {
      throw unprocessable('PAYMENT_AMOUNT_MISMATCH', `received ${received}`);
    }
    changeAmount = roundMoney(received - amount);
  }
  if (method.requiresReference && !input.referenceNo?.trim()) {
    throw badRequest('Reference is required', [{ field: 'referenceNo', message: 'required' }]);
  }
  const payment: MockPayment = {
    id: nextId(state, 'payment'),
    orderId: order.id,
    methodCode: method.code,
    amount,
    cashReceived: method.code === 'CASH' ? roundMoney(input.cashReceived ?? amount) : null,
    changeAmount,
    referenceNo: input.referenceNo?.trim() || null,
    slipUrl: null,
    status: 'PAID',
    paidAt: now.toISOString(),
    verifiedBy: staff.id,
    rejectReason: null,
    createdAt: now.toISOString(),
  };
  state.payments.push(payment);
  order.paymentMethodCode = order.paymentMethodCode ?? method.code;
  confirmIfPaid(state, order, now);
  return payment;
}

export function attachSlip(
  state: MockState,
  order: MockOrder,
  input: {
    methodCode: string;
    amount?: number | null;
    referenceNo?: string | null;
    slipUrl: string;
  },
  now: Date,
): MockPayment {
  if (order.status !== 'PENDING_PAYMENT') {
    throw unprocessable('ORDER_INVALID_STATUS', order.status);
  }
  const method = state.paymentMethods.find(
    (candidate) => candidate.code === input.methodCode && candidate.active,
  );
  if (!method || !method.requiresSlip) {
    throw badRequest('Invalid payment method', [{ field: 'methodCode', message: 'invalid' }]);
  }
  if (!input.slipUrl) {
    throw unprocessable('SLIP_REQUIRED', 'slip is required');
  }
  if (method.requiresReference && !input.referenceNo?.trim()) {
    throw unprocessable('REFERENCE_REQUIRED', 'reference is required');
  }
  const remaining = roundMoney(order.totalAmount - paidAmount(state, order.id));
  const amount =
    input.amount != null && input.amount > 0 ? Math.min(input.amount, remaining) : remaining;
  const payment: MockPayment = {
    id: nextId(state, 'payment'),
    orderId: order.id,
    methodCode: method.code,
    amount: roundMoney(amount),
    cashReceived: null,
    changeAmount: null,
    referenceNo: input.referenceNo?.trim() || null,
    slipUrl: input.slipUrl,
    status: 'PENDING',
    paidAt: null,
    verifiedBy: null,
    rejectReason: null,
    createdAt: now.toISOString(),
  };
  state.payments
    .filter((candidate) => candidate.orderId === order.id && candidate.status === 'PENDING')
    .forEach((candidate) => {
      candidate.status = 'REJECTED';
      candidate.rejectReason = 'replaced';
    });
  state.payments.push(payment);
  order.paymentMethodCode = method.code;
  return payment;
}

export function verifyPayment(
  state: MockState,
  payment: MockPayment,
  approve: boolean,
  reason: string | null,
  staff: MockUser,
  now: Date,
): void {
  if (payment.status !== 'PENDING') {
    throw unprocessable('ORDER_INVALID_STATUS', payment.status);
  }
  const order = state.orders.find((candidate) => candidate.id === payment.orderId);
  if (!order) {
    throw notFound();
  }
  if (approve) {
    payment.status = 'PAID';
    payment.paidAt = now.toISOString();
    payment.verifiedBy = staff.id;
    confirmIfPaid(state, order, now);
  } else {
    if (!reason?.trim()) {
      throw badRequest('Reason is required', [{ field: 'rejectReason', message: 'required' }]);
    }
    payment.status = 'REJECTED';
    payment.rejectReason = reason.trim();
    payment.verifiedBy = staff.id;
  }
}

function customerFullName(user: MockUser | null): string | null {
  if (!user) {
    return null;
  }
  const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ');
  return fullName || user.nickname;
}

export function toMe(user: MockUser): MeResponse {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    nickname: user.nickname,
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    birthDate: user.profile?.birthDate ?? null,
    gender: user.profile?.gender ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    memberCode: user.profile?.memberCode ?? null,
    pointsBalance: user.profile?.pointsBalance ?? 0,
    lifetimePoints: user.profile?.lifetimePoints ?? 0,
    createdAt: user.createdAt,
    passwordChangeRequired: user.passwordChangeRequired,
  };
}

export function toCustomer(state: MockState, user: MockUser): CustomerResponse {
  const orders = state.orders.filter(
    (order) => order.customerId === user.id && order.status === 'COMPLETED',
  );
  const lastOrder = state.orders
    .filter((order) => order.customerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    id: user.id,
    memberCode: user.profile?.memberCode ?? '',
    phone: user.phone,
    email: user.email,
    nickname: user.nickname,
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    pointsBalance: user.profile?.pointsBalance ?? 0,
    lifetimePoints: user.profile?.lifetimePoints ?? 0,
    status: user.status,
    orderCount: orders.length,
    totalSpent: roundMoney(orders.reduce((total, order) => total + order.totalAmount, 0)),
    lastOrderAt: lastOrder?.createdAt ?? null,
    createdAt: user.createdAt,
  };
}

export function toStaff(user: MockUser): StaffResponse {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export function toPaymentMethod(
  state: MockState,
  method: MockState['paymentMethods'][number],
): PaymentMethodResponse {
  return {
    ...method,
    promptpayId: method.code === 'PROMPTPAY' ? state.settings.promptpayId || null : null,
    bankAccount: method.code === 'TRANSFER' ? state.settings.bankAccount || null : null,
  };
}

export function toPayment(state: MockState, payment: MockPayment): PaymentResponse {
  const method = state.paymentMethods.find((candidate) => candidate.code === payment.methodCode);
  const verifier = findUser(state, payment.verifiedBy);
  return {
    id: payment.id,
    orderId: payment.orderId,
    methodCode: payment.methodCode,
    methodName: method?.name ?? payment.methodCode,
    methodNameEn: method?.nameEn ?? payment.methodCode,
    amount: payment.amount,
    cashReceived: payment.cashReceived,
    changeAmount: payment.changeAmount,
    referenceNo: payment.referenceNo,
    hasSlip: payment.slipUrl !== null,
    status: payment.status,
    paidAt: payment.paidAt,
    rejectReason: payment.rejectReason,
    verifiedBy: verifier?.nickname ?? null,
    createdAt: payment.createdAt,
  };
}

export function toPendingPaymentItem(state: MockState, payment: MockPayment): PendingPaymentItem {
  const order = state.orders.find((candidate) => candidate.id === payment.orderId);
  return {
    payment: toPayment(state, payment),
    orderId: payment.orderId,
    orderNo: order?.orderNo ?? '',
    orderStatus: order?.status ?? 'CANCELLED',
    orderTotal: order?.totalAmount ?? 0,
    customerName: order ? orderCustomerName(state, order) : null,
  };
}

function orderCustomerName(state: MockState, order: MockOrder): string | null {
  return order.guestName ?? findUser(state, order.customerId)?.nickname ?? null;
}

export function toOrder(state: MockState, order: MockOrder): OrderResponse {
  const customer = findUser(state, order.customerId);
  const cashier = findUser(state, order.cashierId);
  return {
    id: order.id,
    orderNo: order.orderNo,
    trackingToken: order.trackingToken,
    channel: order.channel,
    status: order.status,
    customer: customer
      ? {
          id: customer.id,
          nickname: customerFullName(customer) ?? customer.nickname,
          memberCode: customer.profile?.memberCode ?? null,
        }
      : null,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    items: order.items,
    subtotal: order.subtotal,
    promotionDiscount: order.promotionDiscount,
    pointDiscount: order.pointDiscount,
    totalAmount: order.totalAmount,
    paidAmount: paidAmount(state, order.id),
    remainingAmount: roundMoney(order.totalAmount - paidAmount(state, order.id)),
    pointsRedeemed: order.pointsRedeemed,
    pointsEarned: order.pointsEarned,
    pointsToEarn: order.pointsToEarn,
    note: order.note,
    queueNo: order.queueNo,
    cashierId: cashier?.id ?? null,
    paymentMethodCode: order.paymentMethodCode,
    payments: state.payments
      .filter((payment) => payment.orderId === order.id)
      .map((payment) => toPayment(state, payment)),
    appliedPromotions: order.appliedPromotions,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    preparingAt: order.preparingAt,
    readyAt: order.readyAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
  };
}

export function toPointTransaction(
  state: MockState,
  transaction: MockPointTransaction,
): PointTransactionResponse {
  const order = state.orders.find((candidate) => candidate.id === transaction.orderId);
  return {
    id: transaction.id,
    type: transaction.type,
    points: transaction.points,
    balanceAfter: transaction.balanceAfter,
    orderNo: order?.orderNo ?? null,
    remark: transaction.remark,
    expiresAt: transaction.expiresAt,
    createdAt: transaction.createdAt,
    createdBy: transaction.createdBy,
  };
}

export function toCategory(state: MockState, category: MockCategory): CategoryResponse {
  return {
    ...category,
    productCount: state.products.filter(
      (product) => product.categoryId === category.id && product.active,
    ).length,
  };
}

export function toProduct(state: MockState, product: MockProduct): ProductResponse {
  const category = state.categories.find((candidate) => candidate.id === product.categoryId);
  return { ...product, categoryName: category?.name ?? '' };
}

export function toPublicProduct(
  state: MockState,
  product: MockProduct,
  now: Date,
): PublicProductResponse {
  return {
    ...toProduct(state, product),
    hasOptions: product.optionGroupIds.length > 0,
    optionGroups: product.optionGroupIds
      .map((id) => state.optionGroups.find((group) => group.id === id))
      .filter((group): group is OptionGroupResponse => !!group && group.active),
    promotionIds: state.promotions
      .filter(
        (promotion) =>
          isPromotionLive(promotion, now) &&
          promotion.showOnLanding &&
          promotion.scope !== 'ORDER' &&
          promotionTargetsProduct(promotion, product),
      )
      .map((promotion) => promotion.id),
  };
}

export function toShopInfo(state: MockState, now: Date): ShopInfoResponse {
  const settings = state.settings;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = settings.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = settings.closeTime.split(':').map(Number);
  const open = (openHour ?? 0) * 60 + (openMinute ?? 0);
  const close = (closeHour ?? 0) * 60 + (closeMinute ?? 0);
  return {
    name: settings.shopName,
    phone: settings.shopPhone,
    address: settings.address,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
    acceptOnlineOrder: settings.acceptOnlineOrder,
    openNow: minutes >= open && minutes < close,
  };
}

export function requireOrderById(state: MockState, id: number): MockOrder {
  const order = state.orders.find((candidate) => candidate.id === id);
  if (!order) {
    throw notFound('Order not found');
  }
  return order;
}

export function isMockHttpError(error: unknown): error is MockHttpError {
  return error instanceof MockHttpError;
}
