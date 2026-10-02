import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ControlVariant = 'surface' | 'glass';

const VARIANT_CLASS: Record<ControlVariant, string> = {
  surface: 'bg-card text-ink shadow-soft border-line hover:text-brand',
  glass: 'bg-white/10 text-white border-white/15 hover:bg-white/20',
};

const BADGE_CLASS: Record<ControlVariant, string> = {
  surface: 'bg-brand text-on-brand',
  glass: 'bg-accent text-white',
};

@Component({
  selector: 'app-icon-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      class="relative grid h-12 w-12 place-items-center rounded-2xl border transition hover:-translate-y-0.5 active:scale-95"
      [class]="variantClass()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      (click)="pressed.emit($event)"
    >
      <i [class]="icon()" class="text-lg"></i>
      @for (count of badgeKey(); track count) {
        <span
          class="animate-pop absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.65rem] font-bold"
          [class]="badgeClass()"
        >
          {{ count }}
        </span>
      }
    </button>
  `,
})
export class IconButton {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly badge = input(0);
  readonly variant = input<ControlVariant>('surface');

  readonly pressed = output<MouseEvent>();

  protected readonly variantClass = computed(() => VARIANT_CLASS[this.variant()]);
  protected readonly badgeClass = computed(() => BADGE_CLASS[this.variant()]);
  protected readonly badgeKey = computed(() => (this.badge() ? [this.badge()] : []));
}
