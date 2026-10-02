import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center justify-center py-10 text-center' },
  template: `
    <span class="relative mb-4 grid h-24 w-24 place-items-center">
      <span class="bg-brand-soft absolute inset-0 rounded-full opacity-50"></span>
      <span class="bg-brand-soft absolute inset-3 rounded-full"></span>
      <span
        class="bg-card text-brand shadow-soft animate-float relative grid h-12 w-12 place-items-center rounded-2xl"
      >
        <i [class]="icon()" class="text-xl"></i>
      </span>
      <span class="bg-accent absolute top-2 right-3 h-2.5 w-2.5 rounded-full"></span>
      <span class="bg-accent/50 absolute bottom-4 left-2 h-1.5 w-1.5 rounded-full"></span>
    </span>
    <p class="text-ink font-semibold">{{ title() }}</p>
    @if (hint()) {
      <p class="text-ink-muted mt-1 max-w-xs text-sm">{{ hint() }}</p>
    }
    <div class="mt-4 empty:hidden"><ng-content /></div>
  `,
})
export class EmptyState {
  readonly icon = input('pi pi-inbox');
  readonly title = input.required<string>();
  readonly hint = input<string | null>(null);
}
