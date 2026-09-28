import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { finalize } from 'rxjs';

import { ApiException } from '../../core/api/models/common.model';
import { Gender } from '../../core/api/models/user.model';
import { UserApi } from '../../core/api/services/user.api';
import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { FormField } from '../../shared/components/form-field/form-field';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Panel } from '../../shared/components/panel/panel';
import { PasswordInput } from '../../shared/components/password-input/password-input';
import { PointsChip } from '../../shared/components/points-chip/points-chip';
import { QrCode } from '../../shared/components/qr-code/qr-code';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { formatNumber, formatPhone, fromDateKey, toDateKey } from '../../shared/utils/format';
import { compressImage } from '../../shared/utils/image';
import {
  matchField,
  optionalEmail,
  requiredText,
  shouldShowError,
  validationMessage,
} from '../../shared/utils/validators';

const AVATAR_TYPES = 'image/png,image/jpeg,image/webp';

@Component({
  selector: 'app-profile-info',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    Avatar,
    FormField,
    PageHeader,
    Panel,
    PasswordInput,
    PointsChip,
    QrCode,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.nav.info')" [crumbs]="crumbs" />

    @if (auth.user(); as user) {
      <div class="flex flex-col gap-5 px-4 py-6 md:px-8">
        <section class="bg-card border-line shadow-soft overflow-hidden rounded-3xl border">
          <div class="bg-royal relative h-24 overflow-hidden md:h-28">
            <i
              class="pi pi-star-fill pointer-events-none absolute -top-6 right-10 text-[8rem] text-white/10"
            ></i>
            <i
              class="pi pi-star-fill pointer-events-none absolute right-48 -bottom-10 text-[5rem] text-white/5"
            ></i>
          </div>
          <div class="relative flex flex-wrap items-end gap-x-5 gap-y-3 px-5 pb-5 md:px-7">
            <div class="relative -mt-12 shrink-0">
              <span
                class="ring-card block rounded-full shadow-lg ring-4 [&_.p-avatar]:!h-24 [&_.p-avatar]:!w-24 [&_.p-avatar]:!text-3xl"
              >
                <app-avatar [url]="user.avatarUrl" [name]="user.nickname" size="xlarge" />
              </span>
              <button
                type="button"
                class="bg-accent ring-card absolute right-0 bottom-0 grid h-9 w-9 place-items-center rounded-full text-white shadow-md ring-4 transition hover:scale-105 active:scale-95"
                [attr.aria-label]="i18n.t('profile.changeAvatar')"
                [disabled]="uploading()"
                (click)="avatarInput.click()"
              >
                <i
                  class="pi text-sm"
                  [class]="uploading() ? 'pi-spin pi-spinner' : 'pi-camera'"
                ></i>
              </button>
              <input
                #avatarInput
                type="file"
                class="hidden"
                [accept]="avatarTypes"
                (change)="uploadAvatar($event)"
              />
            </div>
            <div class="min-w-0 flex-1 pt-3 pb-1">
              <h2 class="font-display text-ink truncate text-2xl font-bold">{{ user.nickname }}</h2>
              <p class="text-ink-muted text-sm">
                {{ user.memberCode }} · {{ i18n.t('member.joinedAt') }}
                {{ user.createdAt | thaiDate: i18n.lang() : 'date' }}
              </p>
            </div>
            @if (auth.isCustomer()) {
              <div class="flex flex-wrap items-center gap-2 pb-1">
                <app-points-chip [points]="user.pointsBalance" />
                <span
                  class="bg-card-muted text-ink-muted rounded-full px-2.5 py-1 text-xs font-semibold"
                >
                  {{ i18n.t('points.lifetime') }} {{ format(user.lifetimePoints) }}
                </span>
              </div>
            }
          </div>
        </section>

        <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div class="flex flex-col gap-5">
            <app-panel
              [heading]="i18n.t('profile.info.heading')"
              [subtitle]="i18n.t('profile.info.subtitle')"
            >
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
                <div class="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <app-form-field
                    inputId="profile-nickname"
                    [label]="i18n.t('register.name') + ' *'"
                    [error]="profileError('nickname')"
                  >
                    <input
                      pInputText
                      id="profile-nickname"
                      formControlName="nickname"
                      class="rounded-xl"
                      [fluid]="true"
                      [invalid]="!!profileError('nickname')"
                    />
                  </app-form-field>
                  <app-form-field
                    inputId="profile-phone"
                    [label]="i18n.t('register.phone')"
                    [hint]="i18n.t('profile.phoneLocked')"
                  >
                    <input
                      pInputText
                      id="profile-phone"
                      class="rounded-xl"
                      [fluid]="true"
                      [value]="phone(user.phone)"
                      [disabled]="true"
                    />
                  </app-form-field>
                  <app-form-field inputId="profile-first" [label]="i18n.t('profile.firstName')">
                    <input
                      pInputText
                      id="profile-first"
                      formControlName="firstName"
                      class="rounded-xl"
                      [fluid]="true"
                    />
                  </app-form-field>
                  <app-form-field inputId="profile-last" [label]="i18n.t('profile.lastName')">
                    <input
                      pInputText
                      id="profile-last"
                      formControlName="lastName"
                      class="rounded-xl"
                      [fluid]="true"
                    />
                  </app-form-field>
                  <app-form-field
                    class="sm:col-span-2"
                    inputId="profile-email"
                    [label]="i18n.t('profile.email')"
                    [error]="profileError('email')"
                  >
                    <input
                      pInputText
                      id="profile-email"
                      type="email"
                      formControlName="email"
                      class="rounded-xl"
                      [fluid]="true"
                      placeholder="you@example.com"
                      [invalid]="!!profileError('email')"
                    />
                  </app-form-field>
                  <app-form-field inputId="profile-birth" [label]="i18n.t('profile.birthDate')">
                    <p-datepicker
                      inputId="profile-birth"
                      formControlName="birthDate"
                      dateFormat="dd/mm/yy"
                      [showIcon]="true"
                      [fluid]="true"
                      [maxDate]="today"
                    />
                  </app-form-field>
                  <app-form-field inputId="profile-gender" [label]="i18n.t('profile.gender')">
                    <p-select
                      inputId="profile-gender"
                      formControlName="gender"
                      [options]="genders()"
                      optionLabel="label"
                      optionValue="value"
                      [showClear]="true"
                      [fluid]="true"
                      [placeholder]="i18n.t('common.select')"
                    />
                  </app-form-field>
                </div>
                <div class="border-line mt-6 flex justify-end border-t pt-5">
                  <p-button
                    type="submit"
                    [label]="i18n.t('common.save')"
                    icon="pi pi-check"
                    [rounded]="true"
                    [loading]="savingProfile()"
                  />
                </div>
              </form>
            </app-panel>

            <app-panel
              [heading]="i18n.t('profile.password.heading')"
              [subtitle]="i18n.t('profile.password.subtitle')"
            >
              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
                <div class="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <app-form-field
                    class="sm:col-span-2"
                    inputId="password-current"
                    [label]="i18n.t('profile.password.current')"
                    [error]="passwordError('currentPassword')"
                  >
                    <app-password-input
                      inputId="password-current"
                      formControlName="currentPassword"
                      [invalid]="!!passwordError('currentPassword')"
                    />
                  </app-form-field>
                  <app-form-field
                    inputId="password-new"
                    [label]="i18n.t('profile.password.new')"
                    [error]="passwordError('newPassword')"
                  >
                    <app-password-input
                      inputId="password-new"
                      formControlName="newPassword"
                      autocomplete="new-password"
                      [strength]="true"
                      [invalid]="!!passwordError('newPassword')"
                    />
                  </app-form-field>
                  <app-form-field
                    inputId="password-confirm"
                    [label]="i18n.t('register.confirmPassword')"
                    [error]="passwordError('confirmPassword')"
                  >
                    <app-password-input
                      inputId="password-confirm"
                      formControlName="confirmPassword"
                      autocomplete="new-password"
                      [invalid]="!!passwordError('confirmPassword')"
                    />
                  </app-form-field>
                </div>
                <div class="border-line mt-6 flex justify-end border-t pt-5">
                  <p-button
                    type="submit"
                    [label]="i18n.t('profile.password.submit')"
                    icon="pi pi-lock"
                    [rounded]="true"
                    [outlined]="true"
                    [loading]="savingPassword()"
                  />
                </div>
              </form>
            </app-panel>
          </div>

          <aside
            class="bg-royal relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_48px_-24px_rgb(58_20_102/0.7)] lg:sticky lg:top-24"
          >
            <i
              class="pi pi-star-fill pointer-events-none absolute -top-8 -right-8 text-[9rem] text-white/10"
            ></i>
            <div class="relative flex items-center justify-between">
              <span class="flex items-center gap-2">
                <span class="bg-accent grid h-8 w-8 place-items-center rounded-xl">
                  <i class="pi pi-star-fill text-xs"></i>
                </span>
                <span class="font-display font-bold">{{ i18n.t('brand.name') }}</span>
              </span>
              <span class="text-[0.65rem] font-bold tracking-[0.2em] text-white/70 uppercase">
                {{ i18n.t('profile.memberCard') }}
              </span>
            </div>
            @if (user.memberCode) {
              <div class="relative mx-auto mt-5 w-fit rounded-2xl bg-white p-2 shadow-lg">
                <app-qr-code [value]="user.memberCode" [size]="160" [label]="user.memberCode" />
              </div>
              <p
                class="font-display relative mt-4 text-center text-2xl font-bold tracking-[0.18em]"
              >
                {{ user.memberCode }}
              </p>
              <p class="relative mt-1 text-center text-xs text-white/70">
                {{ i18n.t('profile.showQr') }}
              </p>
            }
            <div class="relative mt-5 grid grid-cols-2 gap-2">
              <div class="rounded-2xl bg-white/10 px-3 py-2.5">
                <p class="text-[0.65rem] text-white/70">{{ i18n.t('member.points') }}</p>
                <p class="font-display text-accent text-xl font-extrabold">
                  {{ format(user.pointsBalance) }}
                </p>
              </div>
              <div class="rounded-2xl bg-white/10 px-3 py-2.5">
                <p class="text-[0.65rem] text-white/70">{{ i18n.t('member.joinedAt') }}</p>
                <p class="text-sm font-semibold">
                  {{ user.createdAt | thaiDate: i18n.lang() : 'date' }}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    }
  `,
})
export class ProfileInfo {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(UserApi);
  private readonly messages = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'profile.nav.overview', link: '/profile' },
    { labelKey: 'profile.nav.info' },
  ];
  protected readonly today = new Date();
  protected readonly phone = formatPhone;
  protected readonly format = formatNumber;
  protected readonly avatarTypes = AVATAR_TYPES;

  protected readonly uploading = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileSubmitted = signal(false);
  protected readonly passwordSubmitted = signal(false);

  protected readonly profileForm = this.fb.group({
    nickname: this.fb.nonNullable.control('', [requiredText]),
    firstName: this.fb.control<string | null>(null),
    lastName: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null, [optionalEmail]),
    birthDate: this.fb.control<Date | null>(null),
    gender: this.fb.control<Gender | null>(null),
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchField('newPassword', 'confirmPassword') },
  );

  protected genders() {
    return [
      { label: this.i18n.t('profile.gender.MALE'), value: 'MALE' },
      { label: this.i18n.t('profile.gender.FEMALE'), value: 'FEMALE' },
      { label: this.i18n.t('profile.gender.OTHER'), value: 'OTHER' },
    ];
  }

  constructor() {
    let filled = false;
    effect(() => {
      const user = this.auth.user();
      if (user && !filled) {
        filled = true;
        this.profileForm.reset({
          nickname: user.nickname,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          birthDate: fromDateKey(user.birthDate),
          gender: user.gender,
        });
      }
    });
  }

  protected profileError(field: 'nickname' | 'email'): string | null {
    const control = this.profileForm.controls[field];
    return shouldShowError(control, this.profileSubmitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected passwordError(
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
  ): string | null {
    const control = this.passwordForm.controls[field];
    if (
      field === 'confirmPassword' &&
      this.passwordSubmitted() &&
      this.passwordForm.hasError('passwordMismatch')
    ) {
      return this.i18n.t('validation.passwordMismatch');
    }
    return shouldShowError(control, this.passwordSubmitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected async uploadAvatar(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const original = target.files?.[0];
    target.value = '';
    if (!original) {
      return;
    }
    if (!AVATAR_TYPES.split(',').includes(original.type)) {
      this.messages.add({ severity: 'error', summary: this.i18n.error('FILE_INVALID') });
      return;
    }
    this.uploading.set(true);
    const file = await compressImage(original, 480);
    this.api
      .uploadAvatar(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe((user) => {
        this.auth.setUser(user);
        this.messages.add({ severity: 'success', summary: this.i18n.t('profile.avatarSaved') });
      });
  }

  protected saveProfile(): void {
    this.profileSubmitted.set(true);
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) {
      return;
    }
    const value = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.api
      .updateProfile({
        nickname: value.nickname.trim(),
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        birthDate: value.birthDate ? toDateKey(value.birthDate) : null,
        gender: value.gender,
      })
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe((user) => {
        this.auth.setUser(user);
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
      });
  }

  protected changePassword(): void {
    this.passwordSubmitted.set(true);
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      return;
    }
    const value = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.api
      .changePassword({ currentPassword: value.currentPassword, newPassword: value.newPassword })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.passwordSubmitted.set(false);
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t('profile.password.changed'),
          });
        },
        error: (error: ApiException) =>
          this.passwordForm.controls.currentPassword.setErrors({
            server: this.i18n.error(error.code),
          }),
      });
  }
}
