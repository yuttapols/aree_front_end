import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="from-brand-soft to-accent-soft border-line relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border bg-linear-to-r p-5 md:p-6"
    >
      <span
        class="pointer-events-none absolute -top-10 right-24 h-32 w-32 rounded-full bg-white/40 blur-2xl"
        aria-hidden="true"
      ></span>
      <div class="relative flex min-w-0 items-center gap-4">
        <span
          class="bg-brand text-on-brand shadow-soft grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        >
          <i [class]="icon()" class="text-lg"></i>
        </span>
        <div class="min-w-0">
          <p class="font-display text-ink text-lg font-bold">{{ heading() }}</p>
          @if (subtitle()) {
            <p class="text-ink-muted text-sm">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="relative flex flex-wrap items-center gap-3">
        @if (badge()) {
          <span class="bg-card text-ink shadow-soft rounded-full px-3 py-1.5 text-xs font-semibold">
            {{ badge() }}
          </span>
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class SectionHero {
  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly badge = input<string | null>(null);
}
