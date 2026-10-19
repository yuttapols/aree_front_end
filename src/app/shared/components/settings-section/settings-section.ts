import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-settings-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="bg-card border-line shadow-soft animate-rise overflow-hidden rounded-3xl border transition-shadow duration-300 hover:shadow-lift"
    >
      <header
        class="border-line from-brand-soft/70 flex items-center gap-4 border-b bg-linear-to-r to-transparent px-5 py-4 md:px-6"
      >
        <span
          class="from-brand to-accent shadow-soft grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-lg text-white"
          aria-hidden="true"
        >
          <i [class]="icon()"></i>
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="font-display text-ink text-lg leading-tight font-bold">{{ heading() }}</h2>
          @if (description()) {
            <p class="text-ink-muted mt-0.5 text-sm">{{ description() }}</p>
          }
        </div>
        <div class="flex shrink-0 items-center gap-2 empty:hidden">
          <ng-content select="[sectionActions]" />
        </div>
      </header>
      <div class="px-5 py-5 md:px-6">
        <ng-content />
      </div>
    </section>
  `,
})
export class SettingsSection {
  readonly heading = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input('pi pi-cog');
}
