import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiException } from '../../core/api/models/common.model';
import { AuthService } from '../../core/auth/auth.service';
import { DEMO_ACCOUNTS, DemoAccount } from '../../core/data/demo-accounts';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthCard } from '../../shared/components/auth-card/auth-card';
import { FormField } from '../../shared/components/form-field/form-field';
import { PasswordInput } from '../../shared/components/password-input/password-input';
import { StatusTag } from '../../shared/components/status-tag/status-tag';
import { readJson, removeStorage, writeJson } from '../../shared/utils/storage';
import { phoneOrEmail, validationMessage } from '../../shared/utils/validators';
import { TEXT_LIMITS, safeInternalPath } from '../../shared/utils/sanitize';

const REMEMBERED_ACCOUNT_KEY = 'roti.login.remembered';

type LoginField = 'username' | 'password';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    AuthCard,
    FormField,
    PasswordInput,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">{{ i18n.t('login.title') }}</h1>

    <div class="mx-auto max-w-md px-4 py-8 md:py-12">
      <app-auth-card [heading]="i18n.t('login.heading')" [subtitle]="i18n.t('login.subtitle')">
        @if (showDemo) {
          <div class="bg-accent-soft mt-5 rounded-2xl px-4 py-3">
            <p class="text-accent text-sm font-bold">{{ i18n.t('login.demoTitle') }}</p>
            <div class="mt-2 flex flex-col gap-1.5">
              @for (account of demoAccounts; track account.role) {
                <button
                  type="button"
                  class="bg-card hover:ring-accent flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition hover:ring-1"
                  (click)="fillDemo(account)"
                >
                  <span class="text-ink-muted truncate">
                    {{ account.username }} · {{ account.password }}
                  </span>
                  <app-status-tag kind="role" [value]="account.role" />
                </button>
              }
            </div>
          </div>
        }

        <form class="mt-5 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (credentialError()) {
            <p
              class="animate-pop rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500"
              role="alert"
            >
              <i class="pi pi-exclamation-circle mr-1"></i>{{ credentialError() }}
            </p>
          }
          <app-form-field
            inputId="login-username"
            [label]="i18n.t('login.username')"
            [error]="errorFor('username')"
          >
            <input
              pInputText
              id="login-username"
              formControlName="username"
              autocomplete="username"
              class="rounded-xl"
              [fluid]="true"
              [placeholder]="i18n.t('login.usernamePlaceholder')"
              [invalid]="!!errorFor('username')"
              [attr.aria-describedby]="errorFor('username') ? 'login-username-error' : null"
            />
          </app-form-field>

          <app-form-field
            inputId="login-password"
            [label]="i18n.t('register.password')"
            [error]="errorFor('password')"
          >
            <app-password-input
              inputId="login-password"
              formControlName="password"
              autocomplete="current-password"
              [invalid]="!!errorFor('password')"
            />
          </app-form-field>

          <div class="flex items-center gap-2">
            <p-checkbox inputId="login-remember" formControlName="remember" [binary]="true" />
            <label for="login-remember" class="text-ink cursor-pointer text-sm select-none">
              {{ i18n.t('login.remember') }}
            </label>
          </div>

          <p-button
            type="submit"
            [label]="i18n.t('login.submit')"
            icon="pi pi-sign-in"
            [rounded]="true"
            size="large"
            [fluid]="true"
            [loading]="submitting()"
          />
        </form>

        <p authFooter>
          {{ i18n.t('login.noAccount') }}
          <a
            routerLink="/register"
            class="text-brand ml-1 font-semibold underline underline-offset-4 transition hover:opacity-80"
          >
            {{ i18n.t('nav.register') }}
          </a>
        </p>
      </app-auth-card>
    </div>
  `,
})
export class LoginPage {
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly credentialError = signal<string | null>(null);
  protected readonly showDemo = environment.useMockApi;
  protected readonly demoAccounts = DEMO_ACCOUNTS;

  private readonly rememberedAccount = readRememberedAccount();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: [
      this.rememberedAccount ?? '',
      [Validators.required, Validators.maxLength(TEXT_LIMITS.email), phoneOrEmail],
    ],
    password: ['', [Validators.required, Validators.maxLength(TEXT_LIMITS.password)]],
    remember: [this.rememberedAccount !== null],
  });

  protected errorFor(field: LoginField): string | null {
    const control = this.form.controls[field];
    return control.touched || this.submitted() ? validationMessage(control, this.i18n) : null;
  }

  protected fillDemo(account: DemoAccount): void {
    this.form.patchValue({ username: account.username, password: account.password });
    this.credentialError.set(null);
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.credentialError.set(null);
    if (this.form.invalid) {
      return;
    }
    const { username, password, remember } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .login({ username: username.trim(), password })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          if (remember) {
            writeJson(REMEMBERED_ACCOUNT_KEY, username.trim());
          } else {
            removeStorage(REMEMBERED_ACCOUNT_KEY);
          }
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t('login.success'),
            detail: this.i18n.t('register.welcome', { name: user.nickname }),
          });
          const target = safeInternalPath(this.returnUrl(), this.auth.landingPathFor(user.role));
          this.router.navigateByUrl(target);
        },
        error: (error: ApiException) => this.credentialError.set(this.i18n.error(error.code)),
      });
  }
}

function readRememberedAccount(): string | null {
  const value = readJson(REMEMBERED_ACCOUNT_KEY);
  return typeof value === 'string' && value ? value : null;
}
