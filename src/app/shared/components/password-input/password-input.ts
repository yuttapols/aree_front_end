import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PasswordModule } from 'primeng/password';

import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-password-input',
  imports: [FormsModule, PasswordModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInput), multi: true },
  ],
  template: `
    <p-password
      inputStyleClass="rounded-xl"
      [inputId]="inputId()"
      [autocomplete]="autocomplete()"
      [fluid]="true"
      [toggleMask]="true"
      [feedback]="strength()"
      [invalid]="invalid()"
      [disabled]="disabled()"
      [promptLabel]="i18n.t('password.prompt')"
      [weakLabel]="i18n.t('password.weak')"
      [mediumLabel]="i18n.t('password.medium')"
      [strongLabel]="i18n.t('password.strong')"
      [ngModel]="value()"
      (ngModelChange)="onValueChange($event)"
      (onBlur)="onTouched()"
    />
  `,
})
export class PasswordInput implements ControlValueAccessor {
  protected readonly i18n = inject(I18nService);

  readonly inputId = input('');
  readonly autocomplete = input('current-password');
  readonly strength = input(false);
  readonly invalid = input(false);

  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
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

  protected onValueChange(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }
}
