import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { finalize } from 'rxjs';

import { StaffResponse, UserRole, UserStatus } from '../../../core/api/models/user.model';
import { UserApi } from '../../../core/api/services/user.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { DataTable, TableColumn } from '../../../shared/components/data-table/data-table';
import { FormField } from '../../../shared/components/form-field/form-field';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { PasswordInput } from '../../../shared/components/password-input/password-input';
import { PhoneInput } from '../../../shared/components/phone-input/phone-input';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { formatDate, formatPhone } from '../../../shared/utils/format';
import { generateTemporaryPassword } from '../../../shared/utils/password';
import {
  optionalEmail,
  requiredText,
  shouldShowError,
  textField,
  thaiPhone,
  validationMessage,
} from '../../../shared/utils/validators';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';

@Component({
  selector: 'app-staff-page',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    DataTable,
    FormField,
    PageHeader,
    Panel,
    PasswordInput,
    PhoneInput,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.staff')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <app-panel [heading]="i18n.t('bo.nav.staff')">
        <p-button
          panelActions
          [label]="i18n.t('common.add')"
          icon="pi pi-plus"
          [rounded]="true"
          (onClick)="edit(null)"
        />
        <app-data-table
          [rows]="staff()"
          [columns]="columns()"
          [loading]="loading()"
          [lazy]="false"
          [total]="staff().length"
          [emptyTitle]="'-'"
        >
          <ng-template #cell let-row let-column="column">
            @switch (column.key) {
              @case ('role') {
                <app-status-tag kind="role" [value]="row.role" />
              }
              @case ('status') {
                <app-status-tag kind="userStatus" [value]="row.status" />
              }
              @case ('actions') {
                <p-button
                  icon="pi pi-pencil"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('common.edit')"
                  (onClick)="edit(row)"
                />
                <p-button
                  icon="pi pi-key"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('bo.staff.resetPassword')"
                  (onClick)="reset(row)"
                />
              }
            }
          </ng-template>
        </app-data-table>
      </app-panel>
    </div>

    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="dialogOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t(editingId() ? 'bo.staff.edit' : 'bo.staff.new')"
      [style]="{ width: '32rem' }"
      [breakpoints]="{ '640px': '96vw' }"
    >
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <app-form-field
          inputId="st-name"
          [label]="i18n.t('quickRegister.nickname') + ' *'"
          [error]="errorFor('nickname')"
        >
          <input
            pInputText
            id="st-name"
            formControlName="nickname"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="st-phone"
          [label]="i18n.t('register.phone') + ' *'"
          [error]="errorFor('phone')"
        >
          <app-phone-input
            inputId="st-phone"
            formControlName="phone"
            [invalid]="!!errorFor('phone')"
          />
        </app-form-field>
        <app-form-field
          inputId="st-email"
          [label]="i18n.t('profile.email')"
          [error]="errorFor('email')"
        >
          <input
            pInputText
            id="st-email"
            formControlName="email"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="st-role" [label]="i18n.t('bo.staff.role')">
          <p-select
            inputId="st-role"
            formControlName="role"
            [options]="roleOptions()"
            optionLabel="label"
            optionValue="value"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="st-status" [label]="i18n.t('common.status')">
          <p-select
            inputId="st-status"
            formControlName="status"
            [options]="statusOptions()"
            optionLabel="label"
            optionValue="value"
            [fluid]="true"
          />
        </app-form-field>
        @if (!editingId()) {
          <app-form-field
            inputId="st-password"
            [label]="i18n.t('register.password') + ' *'"
            [error]="errorFor('password')"
          >
            <app-password-input
              inputId="st-password"
              formControlName="password"
              autocomplete="new-password"
              [strength]="true"
            />
          </app-form-field>
        }
        <div class="flex justify-end gap-2 sm:col-span-2">
          <p-button
            [label]="i18n.t('common.cancel')"
            [text]="true"
            (onClick)="dialogOpen.set(false)"
          />
          <p-button
            type="submit"
            [label]="i18n.t('common.save')"
            [rounded]="true"
            [loading]="saving()"
          />
        </div>
      </form>
    </p-dialog>

    <p-dialog
      [visible]="tempPassword() !== null"
      (visibleChange)="!$event && tempPassword.set(null)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('bo.staff.resetPassword')"
      [style]="{ width: '24rem' }"
    >
      <p class="text-ink-muted text-sm">{{ i18n.t('quickRegister.tempPassword') }}</p>
      <p
        class="font-display bg-canvas mt-2 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest"
      >
        {{ tempPassword() }}
      </p>
    </p-dialog>
  `,
})
export class StaffPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(UserApi);
  private readonly confirm = inject(ConfirmService);
  private readonly messages = inject(MessageService);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.staff' },
  ];
  protected readonly staff = signal<StaffResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly submitted = signal(false);
  protected readonly tempPassword = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nickname: ['', textField(TEXT_LIMITS.nickname, true)],
    phone: ['', [Validators.required, Validators.maxLength(TEXT_LIMITS.phone), thaiPhone]],
    email: ['', [Validators.maxLength(TEXT_LIMITS.email), optionalEmail]],
    role: ['STAFF' as UserRole],
    status: ['ACTIVE' as UserStatus],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(TEXT_LIMITS.password)],
    ],
  });

  protected readonly roleOptions = computed(() =>
    (['STAFF', 'ADMIN'] as UserRole[]).map((value) => ({
      value,
      label: this.i18n.t(`status.role.${value}`),
    })),
  );
  protected readonly statusOptions = computed(() =>
    (['ACTIVE', 'SUSPENDED'] as UserStatus[]).map((value) => ({
      value,
      label: this.i18n.t(`status.user.${value}`),
    })),
  );

  protected readonly columns = computed<TableColumn<StaffResponse>[]>(() => [
    { key: 'nickname', label: this.i18n.t('quickRegister.nickname') },
    { key: 'phone', label: this.i18n.t('register.phone'), value: (row) => formatPhone(row.phone) },
    { key: 'email', label: this.i18n.t('profile.email'), value: (row) => row.email ?? '-' },
    { key: 'role', label: this.i18n.t('bo.staff.role'), custom: true },
    { key: 'status', label: this.i18n.t('common.status'), custom: true },
    {
      key: 'lastLoginAt',
      label: this.i18n.t('bo.staff.lastLogin'),
      value: (row) => formatDate(row.lastLoginAt, this.i18n.lang(), 'datetime'),
    },
    { key: 'actions', label: '', align: 'right', width: '7rem', custom: true },
  ]);

  constructor() {
    this.load();
  }

  protected errorFor(field: 'nickname' | 'phone' | 'email' | 'password'): string | null {
    const control = this.form.controls[field];
    return shouldShowError(control, this.submitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected edit(member: StaffResponse | null): void {
    this.editingId.set(member?.id ?? null);
    this.submitted.set(false);
    this.form.reset({
      nickname: member?.nickname ?? '',
      phone: member?.phone ?? '',
      email: member?.email ?? '',
      role: member?.role ?? 'STAFF',
      status: member?.status ?? 'ACTIVE',
      password: '',
    });
    if (member) {
      this.form.controls.password.disable();
    } else {
      this.form.controls.password.enable();
    }
    this.dialogOpen.set(true);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const request = {
      nickname: value.nickname.trim(),
      phone: value.phone,
      email: value.email.trim() || null,
      role: value.role,
      status: value.status,
      password: this.editingId() ? null : value.password,
    };
    const id = this.editingId();
    this.saving.set(true);
    (id ? this.api.updateStaff(id, request) : this.api.createStaff(request))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.dialogOpen.set(false);
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.load();
      });
  }

  protected async reset(member: StaffResponse): Promise<void> {
    const ok = await this.confirm.ask({
      message: this.i18n.t('bo.staff.confirmReset', { name: member.nickname }),
    });
    if (ok) {
      const newPassword = generateTemporaryPassword();
      this.api
        .resetStaffPassword(member, newPassword)
        .subscribe(() => this.tempPassword.set(newPassword));
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .staff()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((staff) => this.staff.set(staff));
  }
}
