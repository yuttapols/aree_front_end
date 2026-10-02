import { SettingEntry, SettingValueType, ShopSettings } from '../models/user.model';

interface SettingDefinition {
  key: string;
  type: SettingValueType;
}

export const SETTING_DEFINITIONS: Record<keyof ShopSettings, SettingDefinition> = {
  shopName: { key: 'shop.name', type: 'STRING' },
  shopPhone: { key: 'shop.phone', type: 'STRING' },
  address: { key: 'shop.address', type: 'STRING' },
  openTime: { key: 'shop.open_time', type: 'TIME' },
  closeTime: { key: 'shop.close_time', type: 'TIME' },
  acceptOnlineOrder: { key: 'shop.accept_online_order', type: 'BOOLEAN' },
  promptpayId: { key: 'payment.promptpay_id', type: 'STRING' },
  bankAccount: { key: 'payment.bank_account', type: 'STRING' },
  earnBahtPerPoint: { key: 'point.earn_baht_per_point', type: 'NUMBER' },
  redeemPointsPerBaht: { key: 'point.redeem_points_per_baht', type: 'NUMBER' },
  redeemMinPoints: { key: 'point.redeem_min_points', type: 'NUMBER' },
  redeemMaxPercent: { key: 'point.redeem_max_percent', type: 'NUMBER' },
  expireDays: { key: 'point.expire_days', type: 'NUMBER' },
};

const SETTING_FIELDS = Object.keys(SETTING_DEFINITIONS) as (keyof ShopSettings)[];

function parseValue(value: string | null, type: SettingValueType): string | number | boolean {
  if (type === 'BOOLEAN') {
    return value === 'true';
  }
  if (type === 'NUMBER') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value ?? '';
}

export function toShopSettings(entries: SettingEntry[]): ShopSettings {
  const byKey = new Map(entries.map((entry) => [entry.key, entry.value]));
  const settings: Record<string, string | number | boolean> = {};
  for (const field of SETTING_FIELDS) {
    const definition = SETTING_DEFINITIONS[field];
    settings[field] = parseValue(byKey.get(definition.key) ?? null, definition.type);
  }
  return settings as unknown as ShopSettings;
}

export function toSettingEntries(settings: ShopSettings): SettingEntry[] {
  return SETTING_FIELDS.map((field) => ({
    key: SETTING_DEFINITIONS[field].key,
    value: String(settings[field] ?? ''),
    valueType: SETTING_DEFINITIONS[field].type,
    description: null,
  }));
}

export function changedSettingValues(
  next: ShopSettings,
  previous: ShopSettings | null,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of SETTING_FIELDS) {
    if (!previous || String(next[field]) !== String(previous[field])) {
      values[SETTING_DEFINITIONS[field].key] = String(next[field] ?? '');
    }
  }
  return values;
}

export function fromSettingValues(
  current: ShopSettings,
  values: Record<string, string>,
): ShopSettings {
  const next: Record<string, string | number | boolean> = { ...current };
  for (const field of SETTING_FIELDS) {
    const definition = SETTING_DEFINITIONS[field];
    if (definition.key in values) {
      next[field] = parseValue(values[definition.key], definition.type);
    }
  }
  return next as unknown as ShopSettings;
}
