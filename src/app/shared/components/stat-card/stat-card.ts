import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatTone = 'brand' | 'accent';

const TONE_CLASS: Record<StatTone, string> = {
  brand: 'bg-brand-soft text-brand',
  accent: 'bg-accent-soft text-accent',
};

const GLOW_CLASS: Record<StatTone, string> = {
  brand: 'bg-brand-soft',
  accent: 'bg-accent-soft',
};

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="bg-card border-line shadow-soft animate-rise group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span
        class="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        [class]="glowClass()"
        aria-hidden="true"
      ></span>
      <span
        class="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
        [class]="toneClass()"
      >
        <i [class]="icon()" class="text-lg"></i>
      </span>
      <div class="relative min-w-0 flex-1">
        <p class="text-ink-muted truncate text-xs">{{ label() }}</p>
        <p class="font-display text-ink truncate text-2xl font-bold tabular-nums">{{ value() }}</p>
        @if (delta() !== null) {
          <p
            class="text-xs font-semibold"
            [class]="delta()! >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
          >
            <i
              [class]="delta()! >= 0 ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-right'"
              class="text-[0.6rem]"
            ></i>
            {{ delta()! >= 0 ? '+' : '' }}{{ delta() }}%
            <span class="text-ink-muted font-normal">{{ deltaLabel() }}</span>
          </p>
        } @else if (caption()) {
          <p class="text-ink-muted truncate text-xs">{{ caption() }}</p>
        }
      </div>
    </div>
  `,
})
export class StatCard {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly tone = input<StatTone>('brand');
  readonly delta = input<number | null>(null);
  readonly deltaLabel = input('');
  readonly caption = input<string | null>(null);

  protected readonly toneClass = computed(() => TONE_CLASS[this.tone()]);
  protected readonly glowClass = computed(() => GLOW_CLASS[this.tone()]);
}
