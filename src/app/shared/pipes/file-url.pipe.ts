import { Pipe, PipeTransform } from '@angular/core';

import { fileUrl } from '../utils/file-url';

@Pipe({ name: 'fileUrl' })
export class FileUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string | null {
    return fileUrl(value);
  }
}
