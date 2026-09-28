import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { I18nService } from '../../../core/i18n/i18n.service';
import { compressImage } from '../../utils/image';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp';

export type UploadMode = 'server' | 'inline';

@Component({
  selector: 'app-image-upload',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="bg-card-muted border-line text-ink-muted hover:border-brand grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed transition"
        [class]="shape() === 'circle' ? 'h-24 w-24 !rounded-full' : 'h-28 w-28'"
        [attr.aria-label]="i18n.t('upload.choose')"
        (click)="picker.click()"
      >
        @if (url()) {
          <img [src]="url()" [alt]="i18n.t('upload.preview')" class="h-full w-full object-cover" />
        } @else if (uploading()) {
          <i class="pi pi-spin pi-spinner text-xl"></i>
        } @else {
          <i class="pi pi-image text-2xl"></i>
        }
      </button>
      <div class="flex flex-col items-start gap-2">
        <p-button
          [label]="i18n.t(url() ? 'upload.change' : 'upload.choose')"
          icon="pi pi-upload"
          size="small"
          [outlined]="true"
          [rounded]="true"
          [loading]="uploading()"
          (onClick)="picker.click()"
        />
        @if (url() && removable()) {
          <p-button
            [label]="i18n.t('common.remove')"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            [text]="true"
            (onClick)="urlChange.emit(null)"
          />
        }
        <small class="text-ink-muted text-xs">{{ i18n.t('upload.hint') }}</small>
      </div>
      <input #picker type="file" class="hidden" [accept]="accept" (change)="onPick($event)" />
    </div>
  `,
})
export class ImageUpload {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiClient);
  private readonly messages = inject(MessageService);

  readonly url = input<string | null>(null);
  readonly mode = input<UploadMode>('server');
  readonly shape = input<'square' | 'circle'>('square');
  readonly removable = input(true);

  readonly urlChange = output<string | null>();
  readonly fileChange = output<File>();

  protected readonly uploading = signal(false);
  protected readonly accept = ACCEPT;

  protected async onPick(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const original = target.files?.[0];
    target.value = '';
    if (!original) {
      return;
    }
    if (!ACCEPT.split(',').includes(original.type)) {
      this.messages.add({ severity: 'error', summary: this.i18n.error('FILE_INVALID') });
      return;
    }
    this.uploading.set(true);
    const file = await compressImage(original);
    if (file.size > MAX_BYTES) {
      this.uploading.set(false);
      this.messages.add({ severity: 'error', summary: this.i18n.error('FILE_INVALID') });
      return;
    }
    this.fileChange.emit(file);
    if (this.mode() === 'inline') {
      const reader = new FileReader();
      reader.onload = () => {
        this.uploading.set(false);
        this.urlChange.emit(String(reader.result));
      };
      reader.onerror = () => this.uploading.set(false);
      reader.readAsDataURL(file);
      return;
    }
    this.api
      .upload('/files', file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe((response) => this.urlChange.emit(response.url));
  }
}
