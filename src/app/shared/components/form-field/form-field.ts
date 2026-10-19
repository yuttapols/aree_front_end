import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const REQUIRED_MARK = ' *';

@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <label [for]="inputId()" class="text-ink text-sm font-semibold"
      >{{ text() }}
      @if (required()) {
        <span class="text-red-500" aria-hidden="true"> *</span>
      }
    </label>
    <ng-content />
    @if (error()) {
      <small
        [id]="inputId() + '-error'"
        class="animate-pop flex items-center gap-1.5 text-xs text-red-500"
        role="alert"
      >
        <i class="pi pi-exclamation-circle text-xs"></i>
        {{ error() }}
      </small>
    } @else if (hint()) {
      <small class="text-ink-muted text-xs">{{ hint() }}</small>
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);

  protected readonly required = computed(() => this.label().endsWith(REQUIRED_MARK));
  protected readonly text = computed(() =>
    this.required() ? this.label().slice(0, -REQUIRED_MARK.length) : this.label(),
  );
}
