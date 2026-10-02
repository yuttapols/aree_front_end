import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { ApiException } from '../../core/api/models/common.model';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { UserApi } from '../../core/api/services/user.api';
import { AuthCard } from '../../shared/components/auth-card/auth-card';
import { FormField } from '../../shared/components/form-field/form-field';
import { PasswordInput } from '../../shared/components/password-input/password-input';
import {
  matchField,
  passwordComplexity,
  shouldShowError,
  validationMessage,
} from '../../shared/utils/validators';

@Component({
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule, ButtonModule, AuthCard, FormField, PasswordInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">{{ i18n.t('profile.password.heading') }}</h1>

    <div class="mx-auto max-w-md px-4 py-8 md:py-12">
      <app-auth-card
        [heading]="i18n.t('profile.password.heading')"
        [subtitle]="i18n.t('profile.password.subtitle')"
      >
        <p class="bg-accent-soft text-accent mt-5 rounded-2xl px-4 py-3 text-sm font-semibold">
          <i class="pi pi-info-circle mr-2"></i>{{ i18n.t('changePassword.forcedNotice') }}
        </p>

        <form class="mt-5 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-form-field
            inputId="change-password-current"
            [label]="i18n.t('profile.password.current')"
            [error]="errorFor('currentPassword')"
          >
            <app-password-input
              inputId="change-password-current"
              formControlName="currentPassword"
              [invalid]="!!errorFor('currentPassword')"
            />
          </app-form-field>
          <app-form-field
            inputId="change-password-new"
            [label]="i18n.t('profile.password.new')"
            [error]="errorFor('newPassword')"
          >
            <app-password-input
              inputId="change-password-new"
              formControlName="newPassword"
              autocomplete="new-password"
              [strength]="true"
              [invalid]="!!errorFor('newPassword')"
            />
          </app-form-field>
          <app-form-field
            inputId="change-password-confirm"
            [label]="i18n.t('register.confirmPassword')"
            [error]="errorFor('confirmPassword')"
          >
            <app-password-input
              inputId="change-password-confirm"
              formControlName="confirmPassword"
              autocomplete="new-password"
              [invalid]="!!errorFor('confirmPassword')"
            />
          </app-form-field>
          <p-button
            type="submit"
            [label]="i18n.t('profile.password.submit')"
            [rounded]="true"
            size="large"
            [fluid]="true"
            [loading]="saving()"
          />
        </form>
      </app-auth-card>
    </div>
  `,
})
export class ChangePasswordPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(UserApi);
  private readonly auth = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          passwordComplexity,
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchField('newPassword', 'confirmPassword') },
  );

  protected errorFor(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): string | null {
    const control = this.form.controls[field];
    if (field === 'confirmPassword' && this.submitted() && this.form.hasError('passwordMismatch')) {
      return this.i18n.t('validation.passwordMismatch');
    }
    return shouldShowError(control, this.submitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .changePassword({ currentPassword: value.currentPassword, newPassword: value.newPassword })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.auth.setSession(response.accessToken, response.user);
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t('profile.password.changed'),
          });
          this.router.navigateByUrl(this.authService.landingPathFor(this.auth.role()));
        },
        error: (error: ApiException) =>
          this.form.controls.currentPassword.setErrors({ server: this.i18n.error(error.code) }),
      });
  }
}
