import { Pipe, PipeTransform } from '@angular/core';

import { Lang } from '../../core/models/menu.model';
import { DateStyle, formatDate } from '../utils/format';

@Pipe({ name: 'thaiDate' })
export class ThaiDatePipe implements PipeTransform {
  transform(value: string | null | undefined, lang: Lang, style: DateStyle = 'date'): string {
    return formatDate(value, lang, style);
  }
}
