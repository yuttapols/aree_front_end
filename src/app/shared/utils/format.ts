import { Lang } from '../../core/models/menu.model';

const LOCALE: Record<Lang, string> = { th: 'th-TH', en: 'en-GB' };

export type DateStyle = 'date' | 'datetime' | 'time' | 'short' | 'long';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  datetime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit' },
  short: { day: 'numeric', month: 'short' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
};

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatMoney(value: number, withDecimals = true): string {
  return `฿${value.toLocaleString('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(
  iso: string | null | undefined,
  lang: Lang,
  style: DateStyle | boolean = 'date',
): string {
  if (!iso) {
    return '-';
  }
  const resolved: DateStyle = style === true ? 'datetime' : style === false ? 'date' : style;
  return new Intl.DateTimeFormat(LOCALE[lang], {
    ...DATE_OPTIONS[resolved],
    timeZone: 'Asia/Bangkok',
  }).format(new Date(iso));
}

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : (phone ?? '');
}
