import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (dataUrl()) {
      <img
        [src]="dataUrl()"
        [alt]="label()"
        [width]="size()"
        [height]="size()"
        class="rounded-2xl bg-white p-2"
      />
    }
  `,
})
export class QrCode {
  readonly value = input.required<string>();
  readonly size = input(180);
  readonly label = input('QR code');

  protected readonly dataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const value = this.value();
      const size = this.size();
      if (!value) {
        this.dataUrl.set(null);
        return;
      }
      toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' })
        .then((url) => this.dataUrl.set(url))
        .catch(() => this.dataUrl.set(null));
    });
  }
}
