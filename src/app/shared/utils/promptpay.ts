function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index++) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function formatTarget(target: string): string {
  const digits = target.replace(/\D/g, '');
  if (digits.length >= 13) {
    return field('02', digits);
  }
  const phone = `0066${digits.replace(/^0/, '')}`.padStart(13, '0');
  return field('01', phone);
}

export function promptPayPayload(target: string, amount?: number): string {
  const merchant = field('00', 'A000000677010111') + formatTarget(target);
  const parts = [
    field('00', '01'),
    field('01', amount ? '12' : '11'),
    field('29', merchant),
    field('53', '764'),
    ...(amount ? [field('54', amount.toFixed(2))] : []),
    field('58', 'TH'),
  ];
  const withoutCrc = `${parts.join('')}6304`;
  return `${withoutCrc}${crc16(withoutCrc)}`;
}
