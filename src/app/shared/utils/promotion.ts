import { PromotionResponse } from '../../core/api/models/loyalty.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatMoney } from './format';

export type PromotionState = 'RUNNING' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export function promotionState(promotion: PromotionResponse, now = new Date()): PromotionState {
  if (!promotion.active) {
    return 'INACTIVE';
  }
  if (new Date(promotion.endAt).getTime() < now.getTime()) {
    return 'EXPIRED';
  }
  if (new Date(promotion.startAt).getTime() > now.getTime()) {
    return 'SCHEDULED';
  }
  return 'RUNNING';
}

export function promotionHeadline(promotion: PromotionResponse, i18n: I18nService): string {
  switch (promotion.type) {
    case 'PERCENT':
      return i18n.t('promo.headline.percent', { n: promotion.discountValue });
    case 'FIXED_AMOUNT':
      return i18n.t('promo.headline.fixed', { n: formatMoney(promotion.discountValue, false) });
    case 'BUY_X_GET_Y':
      return i18n.t('promo.headline.buyGet', {
        buy: promotion.buyQty ?? 0,
        get: promotion.getQty ?? 0,
      });
    default:
      return i18n.t('promo.headline.multiplier', { n: promotion.discountValue });
  }
}

export function promotionConditions(promotion: PromotionResponse, i18n: I18nService): string[] {
  const conditions: string[] = [];
  if (promotion.minOrderAmount > 0) {
    conditions.push(
      i18n.t('promo.condition.minOrder', { n: formatMoney(promotion.minOrderAmount, false) }),
    );
  }
  if (promotion.maxDiscount) {
    conditions.push(
      i18n.t('promo.condition.maxDiscount', { n: formatMoney(promotion.maxDiscount, false) }),
    );
  }
  if (promotion.memberOnly) {
    conditions.push(i18n.t('promo.condition.memberOnly'));
  }
  if (promotion.channel !== 'ALL') {
    conditions.push(
      i18n.t(promotion.channel === 'ONLINE' ? 'promo.condition.online' : 'promo.condition.walkIn'),
    );
  }
  if (promotion.daysOfWeek?.length) {
    conditions.push(
      i18n.t('promo.condition.days', {
        days: promotion.daysOfWeek.map((day) => dayName(day, i18n)).join(', '),
      }),
    );
  }
  if (promotion.usagePerCustomer) {
    conditions.push(i18n.t('promo.condition.perCustomer', { n: promotion.usagePerCustomer }));
  }
  return conditions;
}

export function dayName(day: number, i18n: I18nService): string {
  const date = new Date(2024, 0, day);
  return new Intl.DateTimeFormat(i18n.locale(), { weekday: 'short' }).format(date);
}
