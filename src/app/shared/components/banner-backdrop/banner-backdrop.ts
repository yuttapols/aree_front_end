import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

import { FileUrlPipe } from '../../pipes/file-url.pipe';

export type BannerBackdropVariant = 'vivid' | 'soft';

const OVERLAY_CLASS: Record<BannerBackdropVariant, string> = {
  vivid: 'bg-linear-to-r from-[#2a0d4a]/95 via-[#3a1466]/70 to-transparent',
  soft: 'bg-linear-to-r from-[#2a0d4a]/95 via-[#3a1466]/85 to-[#3a1466]/45',
};

@Component({
  selector: 'app-banner-backdrop',
  imports: [FileUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-0 block overflow-hidden' },
  template: `
    @if (url() && !failed()) {
      <picture>
        @if (mobileUrl()) {
          <source media="(max-width: 640px)" [attr.srcset]="mobileUrl() | fileUrl" />
        }
        <img
          [src]="url() | fileUrl"
          alt=""
          [attr.loading]="eager() ? 'eager' : 'lazy'"
          class="h-full w-full object-cover"
          [class.scale-105]="blur()"
          [class.blur-[2px]]="blur()"
          (error)="failed.set(true)"
        />
      </picture>
      <div class="absolute inset-0" [class]="overlayClass()"></div>
    }
  `,
})
export class BannerBackdrop {
  readonly url = input<string | null>(null);
  readonly mobileUrl = input<string | null>(null);
  readonly variant = input<BannerBackdropVariant>('soft');
  readonly blur = input(false);
  readonly eager = input(false);

  protected readonly failed = linkedSignal({ source: this.url, computation: () => false });
  protected readonly overlayClass = computed(() => OVERLAY_CLASS[this.variant()]);
}
