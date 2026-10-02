import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { ApiException } from '../../core/api/models/common.model';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthCard } from '../../shared/components/auth-card/auth-card';
import { FormField } from '../../shared/components/form-field/form-field';
import { PasswordInput } from '../../shared/components/password-input/password-input';
import { PhoneInput } from '../../shared/components/phone-input/phone-input';
import {
  matchField,
  passwordComplexity,
  requiredText,
  textField,
  thaiPhone,
  validationMessage,
} from '../../shared/utils/validators';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const NICKNAME_MAX_LENGTH = 50;
const PHONE_MAX_LENGTH = 20;

type RegisterField = 'name' | 'phone' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    AuthCard,
    FormField,
    PasswordInput,
    PhoneInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">{{ i18n.t('register.title') }}</h1>

    <div class="mx-auto max-w-md px-4 py-8 md:py-12">
      <app-auth-card
        [heading]="i18n.t('register.heading')"
        [subtitle]="i18n.t('register.subtitle')"
      >
        <form class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-form-field
            inputId="register-name"
            [label]="i18n.t('register.name')"
            [error]="errorFor('name')"
          >
            <input
              pInputText
              id="register-name"
              formControlName="name"
              autocomplete="name"
              class="rounded-xl"
              [fluid]="true"
              [placeholder]="i18n.t('register.namePlaceholder')"
              [invalid]="!!errorFor('name')"
              [attr.aria-describedby]="errorFor('name') ? 'register-name-error' : null"
            />
          </app-form-field>

          <app-form-field
            inputId="register-phone"
            [label]="i18n.t('register.phone')"
            [error]="errorFor('phone')"
          >
            <app-phone-input
              inputId="register-phone"
              formControlName="phone"
              [invalid]="!!errorFor('phone')"
              [describedBy]="errorFor('phone') ? 'register-phone-error' : null"
            />
          </app-form-field>

          <app-form-field
            inputId="register-password"
            [label]="i18n.t('register.password')"
            [error]="errorFor('password')"
            [hint]="i18n.t('validation.minLength', { n: passwordMinLength })"
          >
            <app-password-input
              inputId="register-password"
              formControlName="password"
              autocomplete="new-password"
              [strength]="true"
              [invalid]="!!errorFor('password')"
            />
          </app-form-field>

          <app-form-field
            inputId="register-confirm-password"
            [label]="i18n.t('register.confirmPassword')"
            [error]="errorFor('confirmPassword')"
          >
            <app-password-input
              inputId="register-confirm-password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              [invalid]="!!errorFor('confirmPassword')"
            />
          </app-form-field>

          <p-button
            type="submit"
            styleClass="mt-2"
            [label]="i18n.t('register.submit')"
            icon="pi pi-user-plus"
            [rounded]="true"
            size="large"
            [fluid]="true"
            [loading]="submitting()"
          />
        </form>

        <p authFooter>
          {{ i18n.t('register.hasAccount') }}
          <a
            routerLink="/login"
            class="text-brand ml-1 font-semibold underline underline-offset-4 transition hover:opacity-80"
          >
            {{ i18n.t('login.title') }}
          </a>
        </p>
      </app-auth-card>
    </div>
  `,
})
export class RegisterPage {
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      name: ['', [Validators.minLength(2), ...textField(NICKNAME_MAX_LENGTH, true)]],
      phone: ['', [Validators.required, thaiPhone, Validators.maxLength(PHONE_MAX_LENGTH)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.maxLength(PASSWORD_MAX_LENGTH),
          passwordComplexity,
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchField('password', 'confirmPassword') },
  );

  protected errorFor(field: RegisterField): string | null {
    const control = this.form.controls[field];
    if (!control.touched && !this.submitted()) {
      return null;
    }
    const message = validationMessage(control, this.i18n);
    if (message) {
      return message;
    }
    return field === 'confirmPassword' && this.form.hasError('passwordMismatch')
      ? this.i18n.t('validation.passwordMismatch')
      : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { name, phone, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .register({ nickname: name.trim(), phone, password, email: null })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t('register.success'),
            detail: this.i18n.t('register.welcomeCode', { code: user.memberCode ?? '' }),
          });
          this.router.navigateByUrl('/');
        },
        error: (error: ApiException) => {
          const control =
            error.code === 'PHONE_ALREADY_USED'
              ? this.form.controls.phone
              : this.form.controls.name;
          control.setErrors({ server: this.i18n.error(error.code) });
        },
      });
  }
}
