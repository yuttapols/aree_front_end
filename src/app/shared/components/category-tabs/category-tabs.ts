import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface CategoryTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-category-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="h-10 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition"
          [class]="
            tab.id === selected()
              ? 'bg-brand text-on-brand shadow'
              : 'bg-card border-line text-ink-muted hover:text-ink border'
          "
          [attr.aria-selected]="tab.id === selected()"
          (click)="selectedChange.emit(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class CategoryTabs {
  readonly tabs = input.required<CategoryTab[]>();
  readonly selected = input.required<string>();

  readonly selectedChange = output<string>();
}
