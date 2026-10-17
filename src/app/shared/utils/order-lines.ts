import { OrderItemResponse } from '../../core/api/models/order.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { CartLine, MenuOptionGroup } from '../../core/models/menu.model';
import { formatMoney } from './format';
import { isDefaultOnGroup } from './options';

export interface SummaryLine {
  key: string;
  name: string;
  qty: number;
  extras: string;
  omitted: string[];
  total: number;
  note?: string | null;
}

interface ChosenOption {
  groupName: string;
  name: string;
  label: string;
  price: number;
}

export type OptionGroupsLookup = (productId: number) => MenuOptionGroup[] | undefined;

function describeOptions(
  chosen: ChosenOption[],
  groups: MenuOptionGroup[] | undefined,
  i18n: I18nService,
): Pick<SummaryLine, 'extras' | 'omitted'> {
  const defaultGroups = (groups ?? []).filter(isDefaultOnGroup);
  const inDefaultGroup = (option: ChosenOption) =>
    defaultGroups.some((group) => group.name.th === option.groupName);
  const extras = chosen
    .filter((option) => !inDefaultGroup(option))
    .map((option) =>
      option.price > 0 ? `${option.label} (+${formatMoney(option.price, false)})` : option.label,
    );
  const omitted = defaultGroups.flatMap((group) =>
    group.options
      .filter(
        (option) =>
          option.available &&
          !chosen.some(
            (picked) => picked.groupName === group.name.th && picked.name === option.name.th,
          ),
      )
      .map((option) => i18n.t('options.without', { name: i18n.text(option.name) })),
  );
  return { extras: extras.join(', '), omitted };
}

export function cartSummaryLines(lines: CartLine[], i18n: I18nService): SummaryLine[] {
  return lines.map((line) => ({
    key: line.key,
    name: i18n.text(line.item.name),
    qty: line.qty,
    ...describeOptions(
      line.options.map((option) => ({
        groupName:
          line.item.optionGroups.find((group) => group.id === option.groupId)?.name.th ?? '',
        name: option.name.th,
        label: i18n.text(option.name),
        price: option.price,
      })),
      line.item.optionGroups,
      i18n,
    ),
    total: line.unitPrice * line.qty,
  }));
}

export function orderSummaryLines(
  items: OrderItemResponse[],
  i18n: I18nService,
  groupsFor?: OptionGroupsLookup,
): SummaryLine[] {
  return items.map((item, index) => ({
    key: `${item.productId}-${index}`,
    name: i18n.pick(item.productName, item.productNameEn ?? item.productName),
    qty: item.quantity,
    ...describeOptions(
      item.options.map((option) => ({
        groupName: option.groupName,
        name: option.name,
        label: i18n.pick(option.name, option.nameEn ?? option.name),
        price: option.extraPrice,
      })),
      groupsFor?.(item.productId),
      i18n,
    ),
    total: item.lineTotal,
    note: item.note,
  }));
}
