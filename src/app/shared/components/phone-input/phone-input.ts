import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

const MAX_DIGITS = 10;

function formatPartial(digits: string): string {
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

@Component({
  selector: 'app-phone-input',
  imports: [InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInput), multi: true },
  ],
  template: `
    <input
      pInputText
      type="tel"
      inputmode="numeric"
      autocomplete="tel-national"
      class="rounded-xl"
      [id]="inputId()"
      [fluid]="true"
      [placeholder]="placeholder()"
      [invalid]="invalid()"
      [disabled]="disabled()"
      [value]="display()"
      [attr.aria-describedby]="describedBy()"
      (input)="onInput($any($event.target))"
      (blur)="onTouched()"
    />
  `,
})
export class PhoneInput implements ControlValueAccessor {
  readonly inputId = input('');
  readonly placeholder = input('081-234-5678');
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly display = signal('');
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.display.set(
      formatPartial(
        String(value ?? '')
          .replace(/\D/g, '')
          .slice(0, MAX_DIGITS),
      ),
    );
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(target: HTMLInputElement): void {
    const digits = target.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    const formatted = formatPartial(digits);
    target.value = formatted;
    this.display.set(formatted);
    this.onChange(digits);
  }
}
