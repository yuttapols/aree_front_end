import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ProgressStep {
  label: string;
  icon: string;
  done: boolean;
}

@Component({
  selector: 'app-step-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ol
      class="bg-card border-line shadow-soft flex items-center gap-2 rounded-3xl border p-3 sm:p-4"
    >
      @for (step of steps(); track step.label; let i = $index; let last = $last) {
        <li class="flex min-w-0 flex-1 items-center gap-2" [class.flex-none]="last">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition duration-300"
            [class]="stateClass(i)"
            [attr.aria-current]="i === currentIndex() ? 'step' : null"
          >
            @if (step.done) {
              <i class="pi pi-check animate-pop text-xs"></i>
            } @else {
              <i [class]="step.icon" class="text-xs"></i>
            }
          </span>
          <span
            class="hidden truncate text-sm font-semibold sm:inline"
            [class]="i <= currentIndex() ? 'text-ink' : 'text-ink-muted'"
          >
            {{ step.label }}
          </span>
          @if (!last) {
            <span class="bg-line relative h-1 min-w-4 flex-1 overflow-hidden rounded-full">
              <span
                class="bg-accent absolute inset-0 origin-left rounded-full transition-transform duration-500"
                [style.transform]="step.done ? 'scaleX(1)' : 'scaleX(0)'"
              ></span>
            </span>
          }
        </li>
      }
    </ol>
  `,
})
export class StepProgress {
  readonly steps = input.required<ProgressStep[]>();

  protected readonly currentIndex = computed(() => {
    const index = this.steps().findIndex((step) => !step.done);
    return index === -1 ? this.steps().length - 1 : index;
  });

  protected stateClass(index: number): string {
    const step = this.steps()[index];
    if (step.done) {
      return 'bg-accent text-white';
    }
    return index === this.currentIndex()
      ? 'bg-brand text-on-brand ring-brand-soft ring-4'
      : 'bg-card-muted text-ink-muted';
  }
}
