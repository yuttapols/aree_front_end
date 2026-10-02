import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { I18nService } from '../../core/i18n/i18n.service';
import {
  containsControlCharacters,
  containsMarkup,
  isPaymentMethodCode,
  isProductCode,
} from './sanitize';

const THAI_PHONE_PATTERN = /^0\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function digitsOnly(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function requiredText(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

export function thaiPhone(control: AbstractControl): ValidationErrors | null {
  const value = digitsOnly(control.value);
  return !value || THAI_PHONE_PATTERN.test(value) ? null : { thaiPhone: true };
}

export function passwordComplexity(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  return /[A-Za-z]/.test(value) && /\d/.test(value) ? null : { passwordComplexity: true };
}

export function optionalEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return !value || EMAIL_PATTERN.test(value) ? null : { email: true };
}

export function phoneOrEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }
  return EMAIL_PATTERN.test(value) || THAI_PHONE_PATTERN.test(digitsOnly(value))
    ? null
    : { username: true };
}

export function safeText(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  return containsMarkup(value) || containsControlCharacters(value) ? { unsafeText: true } : null;
}

export function textField(maxLength: number, required = false): ValidatorFn[] {
  const validators: ValidatorFn[] = [Validators.maxLength(maxLength), safeText];
  return required ? [requiredText, ...validators] : validators;
}

export function productCode(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return !value || isProductCode(value.toUpperCase()) ? null : { codeFormat: true };
}

export function paymentMethodCode(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return !value || isPaymentMethodCode(value.toUpperCase()) ? null : { codeFormat: true };
}

export function matchField(source: string, target: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const first = group.get(source)?.value;
    const second = group.get(target)?.value;
    return first && second && first !== second ? { passwordMismatch: true } : null;
  };
}

export function validationMessage(control: AbstractControl, i18n: I18nService): string | null {
  if (control.hasError('required')) {
    return i18n.t('validation.required');
  }
  if (control.hasError('minlength')) {
    return i18n.t('validation.minLength', { n: control.getError('minlength').requiredLength });
  }
  if (control.hasError('maxlength')) {
    return i18n.t('validation.maxLength', { n: control.getError('maxlength').requiredLength });
  }
  if (control.hasError('min')) {
    return i18n.t('validation.min', { n: control.getError('min').min });
  }
  if (control.hasError('max')) {
    return i18n.t('validation.max', { n: control.getError('max').max });
  }
  if (control.hasError('thaiPhone')) {
    return i18n.t('validation.phone');
  }
  if (control.hasError('email')) {
    return i18n.t('validation.email');
  }
  if (control.hasError('username')) {
    return i18n.t('validation.username');
  }
  if (control.hasError('passwordComplexity')) {
    return i18n.t('validation.passwordComplexity');
  }
  if (control.hasError('unsafeText')) {
    return i18n.t('validation.unsafeText');
  }
  if (control.hasError('codeFormat')) {
    return i18n.t('validation.codeFormat');
  }
  if (control.hasError('pattern')) {
    return i18n.t('validation.pattern');
  }
  if (control.hasError('server')) {
    return String(control.getError('server'));
  }
  return null;
}

export function shouldShowError(control: AbstractControl, submitted: boolean): boolean {
  return control.invalid && (control.touched || submitted);
}
