export function discountPercent(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) {
    return 0;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('en-US')}`;
}

const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function formatCompact(value: number): string {
  return COMPACT.format(value);
}

export function sumOptionPrices(options: { price: number }[]): number {
  return options.reduce((total, option) => total + option.price, 0);
}
