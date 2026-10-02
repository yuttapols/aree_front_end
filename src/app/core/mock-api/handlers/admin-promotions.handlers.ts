import { FieldError } from '../../api/models/common.model';
import { PromotionUpsertRequest } from '../../api/models/loyalty.model';
import type { MockState } from '../mock-db';
import { findUser } from '../mock-domain';
import { MockRouter, bodyOf, numberParam, requireAdmin } from '../mock-router';
import { badRequest, nextId, notFound, required } from '../mock-utils';

function validatePromotion(
  state: MockState,
  request: PromotionUpsertRequest,
  id?: number,
): PromotionUpsertRequest {
  const fields: FieldError[] = [];
  required(request.name, 'name', fields);
  required(request.startAt, 'startAt', fields);
  required(request.endAt, 'endAt', fields);
  const code = request.code?.trim().toUpperCase() || null;
  if (
    code &&
    state.promotions.some((promotion) => promotion.code === code && promotion.id !== id)
  ) {
    fields.push({ field: 'code', message: 'code already used' });
  }
  if (request.startAt && request.endAt && request.startAt > request.endAt) {
    fields.push({ field: 'endAt', message: 'endAt must be after startAt' });
  }
  if (
    request.type === 'BUY_X_GET_Y' &&
    (!(Number(request.buyQty) > 0) || !(Number(request.getQty) > 0))
  ) {
    fields.push({ field: 'buyQty', message: 'buy/get qty required' });
  }
  if (request.type !== 'BUY_X_GET_Y' && !(Number(request.discountValue) > 0)) {
    fields.push({ field: 'discountValue', message: 'discountValue > 0' });
  }
  if (request.type === 'PERCENT' && Number(request.discountValue) > 100) {
    fields.push({ field: 'discountValue', message: 'discountValue <= 100' });
  }
  if (request.scope === 'PRODUCT' && !request.productIds?.length) {
    fields.push({ field: 'productIds', message: 'productIds required' });
  }
  if (request.scope === 'CATEGORY' && !request.categoryIds?.length) {
    fields.push({ field: 'categoryIds', message: 'categoryIds required' });
  }
  if (fields.length) {
    throw badRequest('Validation failed', fields);
  }
  return {
    ...request,
    code,
    nameEn: request.nameEn || request.name,
    descriptionEn: request.descriptionEn || request.description,
    productIds: request.scope === 'PRODUCT' ? request.productIds : [],
    categoryIds: request.scope === 'CATEGORY' ? request.categoryIds : [],
    daysOfWeek: request.daysOfWeek?.length ? request.daysOfWeek : null,
  };
}

export function registerAdminPromotionHandlers(router: MockRouter): void {
  router
    .get('/admin/promotions', (context) => {
      requireAdmin(context);
      return [...context.state.promotions].sort((a, b) => b.id - a.id);
    })
    .get('/admin/promotions/:id', (context) => {
      requireAdmin(context);
      const promotion = context.state.promotions.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!promotion) {
        throw notFound();
      }
      return promotion;
    })
    .post('/admin/promotions', (context) => {
      requireAdmin(context);
      const request = validatePromotion(context.state, bodyOf<PromotionUpsertRequest>(context));
      const promotion = { ...request, id: nextId(context.state, 'promotion'), usedCount: 0 };
      context.state.promotions.push(promotion);
      return promotion;
    })
    .put('/admin/promotions/:id', (context) => {
      requireAdmin(context);
      const promotion = context.state.promotions.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!promotion) {
        throw notFound();
      }
      Object.assign(
        promotion,
        validatePromotion(context.state, bodyOf<PromotionUpsertRequest>(context), promotion.id),
      );
      return promotion;
    })
    .delete('/admin/promotions/:id', (context) => {
      requireAdmin(context);
      const promotion = context.state.promotions.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!promotion) {
        throw notFound();
      }
      promotion.active = false;
      return null;
    })
    .get('/admin/promotions/:id/usages', (context) => {
      requireAdmin(context);
      const id = numberParam(context, 'id');
      return context.state.promotionUsages
        .filter((usage) => usage.promotionId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((usage) => {
          const order = context.state.orders.find((candidate) => candidate.id === usage.orderId);
          return {
            id: usage.id,
            orderNo: order?.orderNo ?? '',
            customerName:
              findUser(context.state, usage.customerId)?.nickname ?? order?.guestName ?? null,
            discountAmount: usage.discountAmount,
            createdAt: usage.createdAt,
          };
        });
    });
}
