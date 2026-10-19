import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
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
import { SaveBar } from '../../shared/components/save-bar/save-bar';
import { SettingsSection } from '../../shared/components/settings-section/settings-section';
import { PasswordInput } from '../../shared/components/password-input/password-input';
import { QrCode } from '../../shared/components/qr-code/qr-code';
import { ThaiDatePipe } from '../../shared/pipes/thai-date.pipe';
import { formatNumber, formatPhone, fromDateKey, toDateKey } from '../../shared/utils/format';
import {
  checkImageFile,
  compressImage,
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
} from '../../shared/utils/image';

const AVATAR_MAX_DIMENSION = 480;
import {
  matchField,
  optionalEmail,
  passwordComplexity,
  requiredText,
  shouldShowError,
  textField,
  validationMessage,
} from '../../shared/utils/validators';
import { TEXT_LIMITS } from '../../shared/utils/sanitize';

@Component({
  selector: 'app-profile-info',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    Avatar,
    FormField,
    PageHeader,
    SaveBar,
    SettingsSection,
    PasswordInput,
    QrCode,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('profile.nav.info')" [crumbs]="crumbs" />

    @if (auth.user(); as user) {
      <div class="flex flex-col gap-6 px-4 py-6 pb-28 md:px-8">
        <section
          class="bg-card border-line shadow-soft animate-rise overflow-hidden rounded-[2rem] border"
        >
          <div
            class="from-brand via-brand to-accent relative h-32 overflow-hidden bg-linear-to-r md:h-40"
          >
            <div
              class="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]"
            ></div>
            <i
              class="pi pi-star-fill pointer-events-none absolute -top-8 right-8 text-[9rem] text-white/15"
            ></i>
            <i
              class="pi pi-star-fill pointer-events-none absolute right-56 -bottom-10 text-[5rem] text-white/10"
            ></i>
          </div>
          <div class="relative flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-6 md:px-8">
            <div class="relative -mt-14 shrink-0">
              <span
                class="ring-card block rounded-full shadow-xl ring-[6px] [&_.p-avatar]:!h-28 [&_.p-avatar]:!w-28 [&_.p-avatar]:!text-4xl"
              >
                <app-avatar [url]="user.avatarUrl" [name]="user.nickname" size="xlarge" />
              </span>
              <button
                type="button"
                class="bg-accent ring-card absolute right-0 bottom-1 grid h-10 w-10 place-items-center rounded-full text-white shadow-md ring-4 transition hover:scale-110 active:scale-95"
                [attr.aria-label]="i18n.t('profile.changeAvatar')"
                [title]="i18n.t('profile.changeAvatar')"
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
            <div class="min-w-0 flex-1 pb-1">
              <h2 class="font-display text-ink truncate text-3xl font-bold">{{ user.nickname }}</h2>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                @if (user.memberCode) {
                  <span
                    class="bg-brand-soft text-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide"
                  >
                    <i class="pi pi-id-card text-[0.7rem]"></i>{{ user.memberCode }}
                  </span>
                }
                <span
                  class="bg-card-muted text-ink-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                >
                  <i class="pi pi-phone text-[0.7rem]"></i>{{ phone(user.phone) }}
                </span>
                @if (user.createdAt) {
                  <span
                    class="bg-card-muted text-ink-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  >
                    <i class="pi pi-calendar text-[0.7rem]"></i>{{ i18n.t('member.joinedAt') }}
                    {{ user.createdAt | thaiDate: i18n.lang() : 'date' }}
                  </span>
                }
              </div>
            </div>
            @if (auth.isCustomer()) {
              <div
                class="from-accent/15 to-brand/10 flex items-center gap-3 rounded-2xl bg-linear-to-br px-5 py-3"
              >
                <span class="bg-accent grid h-11 w-11 place-items-center rounded-xl text-white">
                  <i class="pi pi-star-fill"></i>
                </span>
                <div>
                  <p class="text-ink-muted text-xs font-semibold">{{ i18n.t('member.points') }}</p>
                  <p
                    class="font-display text-accent text-3xl leading-none font-extrabold tabular-nums"
                  >
                    {{ format(user.pointsBalance) }}
                  </p>
                </div>
              </div>
            }
          </div>
        </section>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="flex flex-col gap-6">
            <app-settings-section
              icon="pi pi-user"
              [heading]="i18n.t('profile.info.heading')"
              [description]="i18n.t('profile.info.subtitle')"
            >
              <form
                [formGroup]="profileForm"
                (ngSubmit)="saveProfile()"
                novalidate
                class="grid gap-x-5 gap-y-5 sm:grid-cols-2"
              >
                <app-form-field
                  inputId="profile-nickname"
                  [label]="i18n.t('register.name') + ' *'"
                  [error]="profileError('nickname')"
                >
                  <p-iconfield>
                    <p-inputicon class="pi pi-user text-brand" />
                    <input
                      pInputText
                      id="profile-nickname"
                      formControlName="nickname"
                      class="h-12 rounded-xl"
                      [fluid]="true"
                      [invalid]="!!profileError('nickname')"
                    />
                  </p-iconfield>
                </app-form-field>
                <app-form-field
                  inputId="profile-phone"
                  [label]="i18n.t('register.phone')"
                  [hint]="i18n.t('profile.phoneLocked')"
                >
                  <p-iconfield>
                    <p-inputicon class="pi pi-lock text-ink-muted" />
                    <input
                      pInputText
                      id="profile-phone"
                      class="h-12 rounded-xl"
                      [fluid]="true"
                      [value]="phone(user.phone)"
                      [disabled]="true"
                    />
                  </p-iconfield>
                </app-form-field>
                <app-form-field
                  class="sm:col-span-2"
                  inputId="profile-email"
                  [label]="i18n.t('profile.email')"
                  [error]="profileError('email')"
                >
                  <p-iconfield>
                    <p-inputicon class="pi pi-envelope text-brand" />
                    <input
                      pInputText
                      id="profile-email"
                      type="email"
                      formControlName="email"
                      class="h-12 rounded-xl"
                      [fluid]="true"
                      placeholder="you@example.com"
                      [invalid]="!!profileError('email')"
                    />
                  </p-iconfield>
                </app-form-field>
                <app-form-field inputId="profile-birth" [label]="i18n.t('profile.birthDate')">
                  <p-datepicker
                    inputId="profile-birth"
                    formControlName="birthDate"
                    dateFormat="dd/mm/yy"
                    inputStyleClass="!h-12"
                    styleClass="h-12"
                    [showIcon]="true"
                    [fluid]="true"
                    [maxDate]="today"
                  />
                </app-form-field>
                <div class="flex flex-col gap-1.5">
                  <span class="text-ink text-sm font-semibold">{{ i18n.t('profile.gender') }}</span>
                  <div class="grid grid-cols-3 gap-2" role="radiogroup">
                    @for (option of genders(); track option.value) {
                      <button
                        type="button"
                        role="radio"
                        class="flex h-12 items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold transition"
                        [class]="
                          profileForm.controls.gender.value === option.value
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-line bg-card text-ink hover:border-brand/40'
                        "
                        [attr.aria-checked]="profileForm.controls.gender.value === option.value"
                        (click)="toggleGender(option.value)"
                      >
                        <i [class]="option.icon"></i>{{ option.label }}
                      </button>
                    }
                  </div>
                </div>
              </form>
            </app-settings-section>

            <app-settings-section
              icon="pi pi-shield"
              [heading]="i18n.t('profile.password.heading')"
              [description]="i18n.t('profile.password.subtitle')"
            >
              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
                <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
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
                <div
                  class="bg-canvas mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
                >
                  <p class="text-ink-muted flex items-center gap-2 text-xs">
                    <i class="pi pi-info-circle text-brand"></i
                    >{{ i18n.t('profile.password.subtitle') }}
                  </p>
                  <p-button
                    type="submit"
                    [label]="i18n.t('profile.password.submit')"
                    icon="pi pi-lock"
                    [rounded]="true"
                    [loading]="savingPassword()"
                  />
                </div>
              </form>
            </app-settings-section>
          </div>

          <aside class="flex flex-col gap-4 lg:sticky lg:top-24">
            <div
              class="bg-royal relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_24px_48px_-24px_rgb(58_20_102/0.7)]"
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
                <div class="relative mx-auto mt-6 w-fit rounded-3xl bg-white p-3 shadow-xl">
                  <app-qr-code [value]="user.memberCode" [size]="168" [label]="user.memberCode" />
                </div>
                <p
                  class="font-display relative mt-5 text-center text-2xl font-bold tracking-[0.18em]"
                >
                  {{ user.memberCode }}
                </p>
                <p class="relative mt-1 text-center text-xs text-white/70">
                  {{ i18n.t('profile.showQr') }}
                </p>
              }
              <div
                class="relative mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3"
              >
                <p class="flex items-center gap-1.5 text-xs text-white/70">
                  <i class="pi pi-star-fill text-accent"></i>{{ i18n.t('member.points') }}
                </p>
                <p class="font-display text-accent text-2xl font-extrabold tabular-nums">
                  {{ format(user.pointsBalance) }}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <app-save-bar
        [visible]="profileDirty()"
        [saving]="savingProfile()"
        (save)="saveProfile()"
        (discard)="resetProfile()"
      />
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
  protected readonly avatarTypes = IMAGE_ACCEPT;

  protected readonly uploading = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileSubmitted = signal(false);
  protected readonly profileDirty = signal(false);
  protected readonly passwordSubmitted = signal(false);

  protected readonly profileForm = this.fb.group({
    nickname: this.fb.nonNullable.control('', textField(TEXT_LIMITS.nickname, true)),
    email: this.fb.control<string | null>(null, [
      Validators.maxLength(TEXT_LIMITS.email),
      optionalEmail,
    ]),
    birthDate: this.fb.control<Date | null>(null),
    gender: this.fb.control<Gender | null>(null),
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
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

  protected genders(): { label: string; value: Gender; icon: string }[] {
    return [
      { label: this.i18n.t('profile.gender.MALE'), value: 'MALE', icon: 'pi pi-mars' },
      { label: this.i18n.t('profile.gender.FEMALE'), value: 'FEMALE', icon: 'pi pi-venus' },
      { label: this.i18n.t('profile.gender.OTHER'), value: 'OTHER', icon: 'pi pi-circle' },
    ];
  }

  protected toggleGender(value: Gender): void {
    const control = this.profileForm.controls.gender;
    control.setValue(control.value === value ? null : value);
    control.markAsDirty();
  }

  protected resetProfile(): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    this.profileForm.reset({
      nickname: user.nickname,
      email: user.email,
      birthDate: fromDateKey(user.birthDate),
      gender: user.gender,
    });
    this.profileSubmitted.set(false);
    this.profileDirty.set(false);
  }

  constructor() {
    let filled = false;
    effect(() => {
      const user = this.auth.user();
      if (user && !filled) {
        filled = true;
        untracked(() => this.resetProfile());
      }
    });
    this.profileForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.profileDirty.set(this.profileForm.dirty));
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
    const sourceError = await checkImageFile(original);
    if (sourceError) {
      this.messages.add({ severity: 'error', summary: this.i18n.error(sourceError) });
      return;
    }
    this.uploading.set(true);
    const compressed = await compressImage(original, AVATAR_MAX_DIMENSION);
    const file = compressed.size < original.size ? compressed : original;
    if (file.size > IMAGE_MAX_BYTES) {
      this.uploading.set(false);
      this.messages.add({ severity: 'error', summary: this.i18n.error('PAYLOAD_TOO_LARGE') });
      return;
    }
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
        firstName: this.auth.user()?.firstName ?? null,
        lastName: this.auth.user()?.lastName ?? null,
        email: value.email,
        birthDate: value.birthDate ? toDateKey(value.birthDate) : null,
        gender: value.gender,
      })
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe((user) => {
        this.auth.setUser(user);
        this.profileForm.markAsPristine();
        this.profileDirty.set(false);
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
        next: (response) => {
          this.auth.setSession(response.accessToken, response.user);
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
