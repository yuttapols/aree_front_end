import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type StepperSize = 'sm' | 'md';

@Component({
  selector: 'app-qty-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (collapsed()) {
      <button
        type="button"
        class="grid place-items-center rounded-full bg-accent text-white shadow-md transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-card-muted disabled:text-ink-muted disabled:shadow-none disabled:hover:scale-100"
        [class]="buttonClass()"
        [disabled]="disabled()"
        [attr.aria-label]="addLabel()"
        (click)="increment.emit()"
      >
        <i class="pi pi-plus text-base"></i>
      </button>
    } @else {
      <div class="bg-accent-soft animate-pop flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          class="text-ink grid place-items-center rounded-full transition hover:bg-black/5 active:scale-90 disabled:opacity-40 dark:hover:bg-white/10"
          [class]="buttonClass()"
          [disabled]="qty() <= min()"
          [attr.aria-label]="removeLabel()"
          (click)="decrement.emit()"
        >
          <i class="pi pi-minus text-sm"></i>
        </button>
        <span class="text-ink min-w-7 text-center font-semibold tabular-nums" aria-live="polite">{{
          qty()
        }}</span>
        <button
          type="button"
          class="bg-accent grid place-items-center rounded-full text-white transition hover:brightness-110 active:scale-90 disabled:opacity-40"
          [class]="buttonClass()"
          [disabled]="disabled()"
          [attr.aria-label]="addLabel()"
          (click)="increment.emit()"
        >
          <i class="pi pi-plus text-sm"></i>
        </button>
      </div>
    }
  `,
})
export class QtyStepper {
  readonly qty = input(0);
  readonly min = input(0);
  readonly disabled = input(false);
  readonly size = input<StepperSize>('md');
  readonly addLabel = input('+');
  readonly removeLabel = input('-');

  readonly increment = output<void>();
  readonly decrement = output<void>();

  protected readonly collapsed = computed(() => this.qty() <= 0 && this.min() <= 0);
  protected readonly buttonClass = computed(() => (this.size() === 'sm' ? 'h-7 w-7' : 'h-10 w-10'));
}
