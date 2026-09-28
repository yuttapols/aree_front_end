import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { finalize } from 'rxjs';

import { PaymentMethodResponse } from '../../../core/api/models/order.model';
import { ShopSettings } from '../../../core/api/models/user.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { UserApi } from '../../../core/api/services/user.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ShopInfoStore } from '../../../core/shop/shop-info.store';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { DataTable, TableColumn } from '../../../shared/components/data-table/data-table';
import { FormField } from '../../../shared/components/form-field/form-field';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { requiredText } from '../../../shared/utils/validators';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

@Component({
  selector: 'app-settings-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TabsModule,
    TextareaModule,
    ToggleSwitchModule,
    DataTable,
    FormField,
    PageHeader,
    Panel,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.settings')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <p-tabs value="shop">
        <p-tablist>
          <p-tab value="shop"><i class="pi pi-shop mr-2"></i>{{ i18n.t('settings.shop') }}</p-tab>
          <p-tab value="points"
            ><i class="pi pi-star mr-2"></i>{{ i18n.t('settings.points') }}</p-tab
          >
          <p-tab value="payments"
            ><i class="pi pi-wallet mr-2"></i>{{ i18n.t('settings.payments') }}</p-tab
          >
        </p-tablist>
        <p-tabpanels class="!bg-transparent !px-0">
          <p-tabpanel value="shop">
            <app-panel>
              <form
                class="grid gap-4 md:grid-cols-2"
                [formGroup]="form"
                (ngSubmit)="save()"
                novalidate
              >
                <app-form-field inputId="s-name" [label]="i18n.t('settings.shopName') + ' *'">
                  <input
                    pInputText
                    id="s-name"
                    formControlName="shopName"
                    class="rounded-xl"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field inputId="s-phone" [label]="i18n.t('register.phone')">
                  <input
                    pInputText
                    id="s-phone"
                    formControlName="shopPhone"
                    class="rounded-xl"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field
                  class="md:col-span-2"
                  inputId="s-address"
                  [label]="i18n.t('settings.address')"
                >
                  <textarea
                    pTextarea
                    id="s-address"
                    formControlName="address"
                    rows="2"
                    class="w-full rounded-xl"
                  ></textarea>
                </app-form-field>
                <app-form-field inputId="s-open" [label]="i18n.t('settings.openTime')" hint="HH:mm">
                  <input
                    pInputText
                    id="s-open"
                    formControlName="openTime"
                    class="rounded-xl"
                    [fluid]="true"
                    placeholder="16:00"
                  />
                </app-form-field>
                <app-form-field
                  inputId="s-close"
                  [label]="i18n.t('settings.closeTime')"
                  hint="HH:mm"
                >
                  <input
                    pInputText
                    id="s-close"
                    formControlName="closeTime"
                    class="rounded-xl"
                    [fluid]="true"
                    placeholder="23:00"
                  />
                </app-form-field>
                <app-form-field inputId="s-promptpay" [label]="i18n.t('settings.promptpay')">
                  <input
                    pInputText
                    id="s-promptpay"
                    formControlName="promptpayId"
                    class="rounded-xl"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field inputId="s-bank" [label]="i18n.t('settings.bankAccount')">
                  <input
                    pInputText
                    id="s-bank"
                    formControlName="bankAccount"
                    class="rounded-xl"
                    [fluid]="true"
                  />
                </app-form-field>
                <label class="text-ink flex items-center gap-3 text-sm md:col-span-2">
                  <p-toggleswitch formControlName="acceptOnlineOrder" />{{
                    i18n.t('settings.acceptOnline')
                  }}
                </label>
                <div class="flex justify-end md:col-span-2">
                  <p-button
                    type="submit"
                    [label]="i18n.t('common.save')"
                    icon="pi pi-check"
                    [rounded]="true"
                    [loading]="saving()"
                  />
                </div>
              </form>
            </app-panel>
          </p-tabpanel>

          <p-tabpanel value="points">
            <app-panel [subtitle]="i18n.t('settings.pointsHint')">
              <form
                class="grid gap-4 md:grid-cols-2"
                [formGroup]="form"
                (ngSubmit)="save()"
                novalidate
              >
                <app-form-field inputId="s-earn" [label]="i18n.t('settings.earnBahtPerPoint')">
                  <p-inputnumber
                    inputId="s-earn"
                    formControlName="earnBahtPerPoint"
                    [min]="1"
                    suffix=" ฿ / 1 pt"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field inputId="s-redeem" [label]="i18n.t('settings.redeemPointsPerBaht')">
                  <p-inputnumber
                    inputId="s-redeem"
                    formControlName="redeemPointsPerBaht"
                    [min]="1"
                    suffix=" pt / 1 ฿"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field inputId="s-min" [label]="i18n.t('settings.redeemMinPoints')">
                  <p-inputnumber
                    inputId="s-min"
                    formControlName="redeemMinPoints"
                    [min]="1"
                    suffix=" pt"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field inputId="s-max" [label]="i18n.t('settings.redeemMaxPercent')">
                  <p-inputnumber
                    inputId="s-max"
                    formControlName="redeemMaxPercent"
                    [min]="1"
                    [max]="100"
                    suffix=" %"
                    [fluid]="true"
                  />
                </app-form-field>
                <app-form-field inputId="s-expire" [label]="i18n.t('settings.expireDays')">
                  <p-inputnumber
                    inputId="s-expire"
                    formControlName="expireDays"
                    [min]="1"
                    [fluid]="true"
                  />
                </app-form-field>
                <div class="flex items-end justify-end md:col-span-2">
                  <p-button
                    type="submit"
                    [label]="i18n.t('common.save')"
                    icon="pi pi-check"
                    [rounded]="true"
                    [loading]="saving()"
                  />
                </div>
              </form>
            </app-panel>
          </p-tabpanel>

          <p-tabpanel value="payments">
            <app-panel>
              <p-button
                panelActions
                [label]="i18n.t('common.add')"
                icon="pi pi-plus"
                [rounded]="true"
                (onClick)="editMethod(null)"
              />
              <app-data-table
                [rows]="methods()"
                [columns]="methodColumns()"
                [lazy]="false"
                [total]="methods().length"
                [emptyTitle]="'-'"
              >
                <ng-template #cell let-row let-column="column">
                  @switch (column.key) {
                    @case ('isActive') {
                      <p-toggleswitch
                        [ngModel]="row.isActive"
                        (ngModelChange)="patchMethod(row, { isActive: $event })"
                      />
                    }
                    @case ('availableOnline') {
                      <p-toggleswitch
                        [ngModel]="row.availableOnline"
                        (ngModelChange)="patchMethod(row, { availableOnline: $event })"
                      />
                    }
                    @case ('requiresSlip') {
                      <app-status-tag kind="active" [value]="row.requiresSlip" />
                    }
                    @case ('actions') {
                      <p-button
                        icon="pi pi-pencil"
                        [text]="true"
                        [rounded]="true"
                        [ariaLabel]="i18n.t('common.edit')"
                        (onClick)="editMethod(row)"
                      />
                    }
                  }
                </ng-template>
              </app-data-table>
            </app-panel>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>

    <p-dialog
      [visible]="methodOpen()"
      (visibleChange)="methodOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t('settings.paymentMethod')"
      [style]="{ width: '32rem' }"
      [breakpoints]="{ '640px': '96vw' }"
    >
      <form
        class="grid gap-4 sm:grid-cols-2"
        [formGroup]="methodForm"
        (ngSubmit)="saveMethod()"
        novalidate
      >
        <app-form-field inputId="m-code" [label]="i18n.t('catalog.code') + ' *'">
          <input
            pInputText
            id="m-code"
            formControlName="code"
            class="rounded-xl uppercase"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="m-name" [label]="i18n.t('catalog.nameTh') + ' *'">
          <input pInputText id="m-name" formControlName="name" class="rounded-xl" [fluid]="true" />
        </app-form-field>
        <app-form-field inputId="m-name-en" [label]="i18n.t('catalog.nameEn')">
          <input
            pInputText
            id="m-name-en"
            formControlName="nameEn"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          class="sm:col-span-2"
          inputId="m-instruction"
          [label]="i18n.t('settings.instruction')"
        >
          <textarea
            pTextarea
            id="m-instruction"
            formControlName="instruction"
            rows="2"
            class="w-full rounded-xl"
          ></textarea>
        </app-form-field>
        <div class="flex flex-wrap gap-4 sm:col-span-2">
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="requiresSlip" />{{
              i18n.t('settings.requiresSlip')
            }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="requiresReference" />{{
              i18n.t('settings.requiresReference')
            }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="availableOnline" />{{
              i18n.t('settings.availableOnline')
            }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="isActive" />{{ i18n.t('status.active.true') }}</label
          >
        </div>
        <div class="flex justify-end gap-2 sm:col-span-2">
          <p-button
            [label]="i18n.t('common.cancel')"
            [text]="true"
            (onClick)="methodOpen.set(false)"
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
  `,
})
export class SettingsPage {
  protected readonly i18n = inject(I18nService);
  private readonly userApi = inject(UserApi);
  private readonly orderApi = inject(OrderApi);
  private readonly shop = inject(ShopInfoStore);
  private readonly messages = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.settings' },
  ];
  protected readonly saving = signal(false);
  protected readonly methods = signal<PaymentMethodResponse[]>([]);
  protected readonly methodOpen = signal(false);
  protected readonly editingMethodId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    shopName: ['', [requiredText]],
    shopPhone: [''],
    address: [''],
    openTime: ['16:00', [Validators.pattern(TIME_PATTERN)]],
    closeTime: ['23:00', [Validators.pattern(TIME_PATTERN)]],
    acceptOnlineOrder: [true],
    promptpayId: [''],
    bankAccount: [''],
    earnBahtPerPoint: [25, [Validators.min(1)]],
    redeemPointsPerBaht: [10, [Validators.min(1)]],
    redeemMinPoints: [100, [Validators.min(1)]],
    redeemMaxPercent: [50, [Validators.min(1), Validators.max(100)]],
    expireDays: [365, [Validators.min(1)]],
  });

  protected readonly methodForm = this.fb.nonNullable.group({
    code: ['', [requiredText]],
    name: ['', [requiredText]],
    nameEn: [''],
    instruction: [''],
    requiresSlip: [false],
    requiresReference: [false],
    availableOnline: [true],
    isActive: [true],
  });

  protected readonly methodColumns = computed<TableColumn<PaymentMethodResponse>[]>(() => [
    { key: 'code', label: this.i18n.t('catalog.code') },
    { key: 'name', label: this.i18n.t('catalog.name'), value: (row) => this.i18n.name(row) },
    { key: 'requiresSlip', label: this.i18n.t('settings.requiresSlip'), custom: true },
    { key: 'availableOnline', label: this.i18n.t('settings.availableOnline'), custom: true },
    { key: 'isActive', label: this.i18n.t('status.active.true'), custom: true },
    { key: 'actions', label: '', align: 'right', width: '5rem', custom: true },
  ]);

  constructor() {
    this.userApi.settings().subscribe((settings) => this.form.reset(settings));
    this.loadMethods();
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messages.add({ severity: 'error', summary: this.i18n.error('VALIDATION_ERROR') });
      return;
    }
    this.saving.set(true);
    this.userApi
      .updateSettings(this.form.getRawValue() as ShopSettings)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe((settings) => {
        this.form.reset(settings);
        this.shop.load();
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
      });
  }

  protected editMethod(method: PaymentMethodResponse | null): void {
    this.editingMethodId.set(method?.id ?? null);
    this.methodForm.reset({
      code: method?.code ?? '',
      name: method?.name ?? '',
      nameEn: method?.nameEn ?? '',
      instruction: method?.instruction ?? '',
      requiresSlip: method?.requiresSlip ?? false,
      requiresReference: method?.requiresReference ?? false,
      availableOnline: method?.availableOnline ?? true,
      isActive: method?.isActive ?? true,
    });
    if (method) {
      this.methodForm.controls.code.disable();
    } else {
      this.methodForm.controls.code.enable();
    }
    this.methodOpen.set(true);
  }

  protected saveMethod(): void {
    this.methodForm.markAllAsTouched();
    if (this.methodForm.invalid) {
      return;
    }
    const request = this.methodForm.getRawValue();
    const id = this.editingMethodId();
    this.saving.set(true);
    (id
      ? this.orderApi.updatePaymentMethod(id, request)
      : this.orderApi.createPaymentMethod(request)
    )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.methodOpen.set(false);
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.loadMethods();
      });
  }

  protected patchMethod(
    method: PaymentMethodResponse,
    patch: Partial<PaymentMethodResponse>,
  ): void {
    const next = { ...method, ...patch };
    this.orderApi
      .updatePaymentMethod(method.id, {
        code: next.code,
        name: next.name,
        nameEn: next.nameEn,
        requiresSlip: next.requiresSlip,
        requiresReference: next.requiresReference,
        availableOnline: next.availableOnline,
        isActive: next.isActive,
        instruction: next.instruction,
      })
      .subscribe(() => this.loadMethods());
  }

  private loadMethods(): void {
    this.orderApi.adminPaymentMethods().subscribe((methods) => this.methods.set(methods));
  }
}
