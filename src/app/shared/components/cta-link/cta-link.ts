import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export type CtaTone = 'accent' | 'brand';

const TONE_CLASS: Record<CtaTone, string> = {
  accent: 'bg-accent text-white shadow-[0_10px_24px_-10px_var(--app-accent)]',
  brand: 'bg-brand text-on-brand shadow-[0_10px_24px_-10px_var(--app-brand)]',
};

const LINK_CLASS =
  'group inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-bold transition hover:-translate-y-0.5 active:scale-95 md:text-base';

@Component({
  selector: 'app-cta-link',
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <ng-template #content>
      {{ label() }}
      <span
        class="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[#3a1466] transition group-hover:translate-x-0.5 md:h-9 md:w-9"
      >
        <i class="pi pi-arrow-right text-xs"></i>
      </span>
    </ng-template>
    @if (external()) {
      <a
        [href]="link()"
        target="_blank"
        rel="noopener noreferrer"
        [class]="linkClass + ' ' + toneClass()"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <a [routerLink]="link()" [fragment]="fragment()" [class]="linkClass + ' ' + toneClass()">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    }
  `,
})
export class CtaLink {
  readonly label = input.required<string>();
  readonly link = input('/');
  readonly fragment = input<string>();
  readonly tone = input<CtaTone>('accent');
  readonly external = input(false);

  protected readonly linkClass = LINK_CLASS;
  protected readonly toneClass = computed(() => TONE_CLASS[this.tone()]);
}
