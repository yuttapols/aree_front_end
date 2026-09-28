import { OrderItemResponse } from '../../core/api/models/order.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { CartLine } from '../../core/models/menu.model';
import { formatMoney } from './format';

export interface SummaryLine {
  key: string;
  name: string;
  qty: number;
  extras: string;
  total: number;
  note?: string | null;
}

export function cartSummaryLines(lines: CartLine[], i18n: I18nService): SummaryLine[] {
  return lines.map((line) => ({
    key: line.key,
    name: i18n.text(line.item.name),
    qty: line.qty,
    extras: line.options
      .map((option) =>
        option.price > 0
          ? `${i18n.text(option.name)} (+${formatMoney(option.price, false)})`
          : i18n.text(option.name),
      )
      .join(', '),
    total: line.unitPrice * line.qty,
  }));
}

export function orderSummaryLines(items: OrderItemResponse[], i18n: I18nService): SummaryLine[] {
  return items.map((item, index) => ({
    key: `${item.productId}-${index}`,
    name: i18n.pick(item.productName, item.productNameEn),
    qty: item.quantity,
    extras: item.options
      .map((option) => {
        const name = i18n.pick(option.optionName, option.optionNameEn);
        return option.extraPrice > 0 ? `${name} (+${formatMoney(option.extraPrice, false)})` : name;
      })
      .join(', '),
    total: item.lineTotal,
    note: item.note,
  }));
}
