import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center justify-center py-10 text-center' },
  template: `
    <span class="bg-brand-soft text-brand mb-3 grid h-14 w-14 place-items-center rounded-full">
      <i [class]="icon()" class="text-xl"></i>
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
