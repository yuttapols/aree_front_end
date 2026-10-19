import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-save-bar',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none fixed inset-x-0 bottom-6 z-40 block px-4' },
  template: `
    @if (visible()) {
      <div
        role="status"
        class="bg-royal animate-pop pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-full py-2.5 pr-2.5 pl-5 text-white shadow-[0_18px_40px_-12px_rgb(58_20_102/0.6)]"
      >
        <span
          class="bg-accent h-2.5 w-2.5 shrink-0 animate-pulse rounded-full"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 text-sm font-medium">{{ i18n.t('settings.unsaved') }}</span>
        <p-button
          [label]="i18n.t('settings.discard')"
          [text]="true"
          [rounded]="true"
          styleClass="!text-white hover:!bg-white/10"
          [disabled]="saving()"
          (onClick)="discard.emit()"
        />
        <p-button
          [label]="i18n.t('common.save')"
          icon="pi pi-check"
          [rounded]="true"
          severity="warn"
          [loading]="saving()"
          (onClick)="save.emit()"
        />
      </div>
    }
  `,
})
export class SaveBar {
  protected readonly i18n = inject(I18nService);
  readonly visible = input(false);
  readonly saving = input(false);
  readonly save = output<void>();
  readonly discard = output<void>();
}
