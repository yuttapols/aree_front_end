import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FileUrlPipe } from '../../pipes/file-url.pipe';
import {
  bytesToMegabytes,
  checkImageFile,
  compressImage,
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  type ImageFileError,
} from '../../utils/image';

const DEFAULT_MAX_DIMENSION = 960;

export type UploadMode = 'server' | 'inline';
export type UploadShape = 'square' | 'circle' | 'wide';

const SHAPE_CLASS: Record<UploadShape, string> = {
  square: 'h-28 w-28',
  circle: 'h-24 w-24 !rounded-full',
  wide: 'h-24 w-56',
};

@Component({
  selector: 'app-image-upload',
  imports: [ButtonModule, FileUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="bg-card-muted border-line text-ink-muted hover:border-brand grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed transition"
        [class]="shapeClass()"
        [attr.aria-label]="i18n.t('upload.choose')"
        (click)="picker.click()"
      >
        @if (url()) {
          <img
            [src]="url() | fileUrl"
            [alt]="i18n.t('upload.preview')"
            class="h-full w-full object-cover"
          />
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
        <small class="text-ink-muted text-xs">{{
          i18n.t('upload.hint', { n: maxMegabytes() })
        }}</small>
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
  readonly endpoint = input('/files');
  readonly shape = input<UploadShape>('square');
  readonly removable = input(true);
  readonly maxBytes = input(IMAGE_MAX_BYTES);
  readonly maxDimension = input(DEFAULT_MAX_DIMENSION);

  readonly urlChange = output<string | null>();
  readonly fileChange = output<File>();

  protected readonly uploading = signal(false);
  protected readonly accept = IMAGE_ACCEPT;
  protected readonly maxMegabytes = computed(() => bytesToMegabytes(this.maxBytes()));
  protected readonly shapeClass = computed(() => SHAPE_CLASS[this.shape()]);

  protected async onPick(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const original = target.files?.[0];
    target.value = '';
    if (!original) {
      return;
    }
    const sourceError = await checkImageFile(original);
    if (sourceError) {
      this.showError(sourceError);
      return;
    }
    this.uploading.set(true);
    const compressed = await compressImage(original, this.maxDimension());
    const file = compressed.size < original.size ? compressed : original;
    if (file.size > this.maxBytes()) {
      this.uploading.set(false);
      this.showError('PAYLOAD_TOO_LARGE');
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
      .upload(this.endpoint(), file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe((response) => this.urlChange.emit(response.url));
  }

  private showError(code: ImageFileError): void {
    this.messages.add({
      severity: 'error',
      summary: this.i18n.error(code),
      detail: this.i18n.t('upload.hint', { n: this.maxMegabytes() }),
    });
  }
}
