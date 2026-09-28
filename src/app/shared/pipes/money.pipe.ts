import { Pipe, PipeTransform } from '@angular/core';

import { formatMoney } from '../utils/format';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, withDecimals = true): string {
    return formatMoney(value ?? 0, withDecimals);
  }
}
