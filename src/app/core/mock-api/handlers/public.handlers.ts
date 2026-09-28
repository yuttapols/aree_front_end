import { FieldError } from '../../api/models/common.model';
import { PromotionValidateRequest } from '../../api/models/loyalty.model';
import {
  AttachSlipRequest,
  CreateOnlineOrderRequest,
  OrderChannel,
  QuoteRequest,
} from '../../api/models/order.model';
import type { MockState, MockUser } from '../mock-db';
import {
  attachSlip,
  createOrder,
  findCustomerByPhone,
  isPromotionLive,
  priceCart,
  toCategory,
  toOrder,
  toPayment,
  toPaymentMethod,
  toPublicProduct,
  toShopInfo,
} from '../mock-domain';
import { MockContext, MockRouter, bodyOf, numberParam, queryString } from '../mock-router';
import {
  MockHttpError,
  badRequest,
  isThaiPhone,
  normalizePhone,
  notFound,
  unprocessable,
} from '../mock-utils';

function activeCategories(state: MockState) {
  return state.categories
    .filter((category) => category.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function publicProducts(state: MockState, now: Date) {
  return state.products
    .filter(
      (product) =>
        product.isActive &&
        state.categories.some(
          (category) => category.id === product.categoryId && category.isActive,
        ),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((product) => toPublicProduct(state, product, now));
}

function customerFor(context: MockContext): MockUser | null {
  return context.user?.profile ? context.user : null;
}

export function resolvePricingCustomer(
  context: MockContext,
  request: QuoteRequest,
): MockUser | null {
  if (request.channel === 'WALK_IN' && request.customerPhone) {
    return findCustomerByPhone(context.state, normalizePhone(request.customerPhone));
  }
  return request.channel === 'ONLINE' ? customerFor(context) : null;
}

function requireTrackedOrder(state: MockState, token: string) {
  const order = state.orders.find((candidate) => candidate.trackingToken === token);
  if (!order) {
    throw notFound('Order not found');
  }
  return order;
}

export function registerPublicHandlers(router: MockRouter): void {
  router
    .get('/public/shop-info', ({ state, now }) => toShopInfo(state, now))
    .get('/public/categories', ({ state }) =>
      activeCategories(state).map((category) => toCategory(state, category)),
    )
    .get('/public/products', (context) => {
      const categoryId = queryString(context, 'categoryId');
      const keyword = queryString(context, 'keyword').toLowerCase();
      const recommended = queryString(context, 'recommended');
      return publicProducts(context.state, context.now).filter(
        (product) =>
          (!categoryId || product.categoryId === Number(categoryId)) &&
          (!keyword ||
            `${product.name} ${product.nameEn} ${product.description}`
              .toLowerCase()
              .includes(keyword)) &&
          (recommended !== 'true' || product.isRecommended),
      );
    })
    .get('/public/products/:id', (context) => {
      const product = publicProducts(context.state, context.now).find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!product) {
        throw notFound('Product not found');
      }
      return product;
    })
    .get('/public/menu', ({ state, now }) => {
      const products = publicProducts(state, now);
      return {
        categories: activeCategories(state).map((category) => ({
          ...toCategory(state, category),
          products: products.filter((product) => product.categoryId === category.id),
        })),
      };
    })
    .get('/public/payment-methods', (context) => {
      const channel = (queryString(context, 'channel') || 'ONLINE') as OrderChannel;
      return context.state.paymentMethods
        .filter((method) => method.isActive && (channel !== 'ONLINE' || method.availableOnline))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((method) => {
          const response = toPaymentMethod(context.state, method);
          const bank = context.state.settings.bankAccount;
          return method.code === 'TRANSFER' && bank
            ? { ...response, instruction: `${response.instruction}\n${bank}`.trim() }
            : response;
        });
    })
    .post('/public/orders/quote', (context) => {
      const request = bodyOf<QuoteRequest>(context);
      return priceCart(context.state, {
        channel: request.channel ?? 'ONLINE',
        items: request.items ?? [],
        promoCode: request.promoCode,
        redeemPoints: request.redeemPoints,
        customer: resolvePricingCustomer(context, request),
        now: context.now,
      }).quote;
    })
    .post('/public/orders', (context) => {
      const { state, now } = context;
      const request = bodyOf<CreateOnlineOrderRequest>(context);
      if (!state.settings.acceptOnlineOrder) {
        throw unprocessable('SHOP_CLOSED', 'Online ordering is closed');
      }
      const customer = customerFor(context);
      const fields: FieldError[] = [];
      const guestName = request.guestName?.trim() || customer?.nickname || '';
      const guestPhone = request.guestPhone ? normalizePhone(request.guestPhone) : null;
      if (!guestName) {
        fields.push({ field: 'guestName', message: 'guestName is required' });
      }
      if (!customer && (!guestPhone || !isThaiPhone(guestPhone))) {
        fields.push({ field: 'guestPhone', message: 'guestPhone is required' });
      }
      const method = state.paymentMethods.find(
        (candidate) =>
          candidate.code === request.paymentMethodCode &&
          candidate.isActive &&
          candidate.availableOnline,
      );
      if (!method) {
        fields.push({ field: 'paymentMethodCode', message: 'invalid payment method' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      const pricing = priceCart(state, {
        channel: 'ONLINE',
        items: request.items ?? [],
        promoCode: request.promoCode,
        redeemPoints: request.redeemPoints,
        customer,
        now,
      });
      if (pricing.promoCodeErrorCode) {
        throw unprocessable(pricing.promoCodeErrorCode, request.promoCode ?? '');
      }
      const order = createOrder(state, {
        channel: 'ONLINE',
        pricing,
        customer,
        guestName,
        guestPhone: customer ? null : guestPhone,
        note: request.note?.trim() || null,
        paymentMethodCode: method?.code ?? null,
        cashierId: null,
        now,
      });
      return toOrder(state, order);
    })
    .get('/public/orders/track/:token', (context) =>
      toOrder(context.state, requireTrackedOrder(context.state, context.params['token'] ?? '')),
    )
    .post('/public/orders/track/:token/payments', (context) => {
      const order = requireTrackedOrder(context.state, context.params['token'] ?? '');
      const request = bodyOf<AttachSlipRequest>(context);
      const payment = attachSlip(context.state, order, request, context.now);
      return toPayment(context.state, payment);
    })
    .get('/public/promotions', ({ state, now }) =>
      state.promotions
        .filter((promotion) => promotion.showOnLanding && isPromotionLive(promotion, now))
        .sort((a, b) => b.priority - a.priority),
    )
    .get('/public/promotions/:id', (context) => {
      const promotion = context.state.promotions.find(
        (candidate) =>
          candidate.id === numberParam(context, 'id') &&
          candidate.showOnLanding &&
          isPromotionLive(candidate, context.now),
      );
      if (!promotion) {
        throw notFound('Promotion not found');
      }
      return promotion;
    })
    .post('/public/promotions/validate', (context) => {
      const request = bodyOf<PromotionValidateRequest>(context);
      const code = request.code?.trim().toUpperCase();
      const promotion = context.state.promotions.find(
        (candidate) => candidate.code?.toUpperCase() === code,
      );
      if (!promotion) {
        throw new MockHttpError(422, 'PROMOTION_NOT_FOUND', request.code ?? '');
      }
      if (!isPromotionLive(promotion, context.now)) {
        throw new MockHttpError(422, 'PROMOTION_EXPIRED', request.code ?? '');
      }
      return promotion;
    });
}
