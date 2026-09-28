import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

const DEBOUNCE_MS = 300;

@Component({
  selector: 'app-search-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label
      class="bg-card border-line focus-within:border-brand flex h-11 items-center gap-3 rounded-2xl border px-4 transition"
    >
      <i class="pi pi-search text-ink-muted"></i>
      <input
        type="search"
        class="text-ink placeholder:text-ink-muted h-full w-full bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($any($event.target).value)"
        (keydown.enter)="flush()"
      />
      @if (value()) {
        <button
          type="button"
          class="text-ink-muted hover:text-ink grid h-7 w-7 place-items-center rounded-full"
          [attr.aria-label]="clearLabel()"
          (click)="onInput(''); flush()"
        >
          <i class="pi pi-times text-xs"></i>
        </button>
      }
    </label>
  `,
})
export class SearchBox {
  readonly placeholder = input('');
  readonly clearLabel = input('Clear');
  readonly initial = input('');

  readonly search = output<string>();

  protected readonly value = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  protected onInput(value: string): void {
    this.value.set(value);
    this.cancel();
    this.timer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  protected flush(): void {
    this.cancel();
    this.search.emit(this.value().trim());
  }

  private cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
