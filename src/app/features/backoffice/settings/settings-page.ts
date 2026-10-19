import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
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
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { FormField } from '../../../shared/components/form-field/form-field';
import { SaveBar } from '../../../shared/components/save-bar/save-bar';
import { SettingsSection } from '../../../shared/components/settings-section/settings-section';
import { PageHeader } from '../../../shared/components/page-header/page-header';

import {
  paymentMethodCode,
  requiredText,
  textField,
  thaiPhone,
} from '../../../shared/utils/validators';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const MINUTES_PER_DAY = 24 * 60;

function minutesOf(time: string): number | null {
  return TIME_PATTERN.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;
}

const METHOD_ICONS: Record<string, string> = {
  CASH: 'pi pi-money-bill',
  TRANSFER: 'pi pi-building-columns',
  PROMPTPAY: 'pi pi-qrcode',
  CARD: 'pi pi-credit-card',
};

@Component({
  selector: 'app-settings-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    TabsModule,
    TextareaModule,
    ToggleSwitchModule,
    BrandLogo,
    EmptyState,
    SaveBar,
    SettingsSection,
    FormField,
    PageHeader,
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
            <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <form class="grid gap-6" [formGroup]="form" (ngSubmit)="save()" novalidate>
                <app-settings-section
                  icon="pi pi-shop"
                  [heading]="i18n.t('settings.section.profile')"
                  [description]="i18n.t('settings.section.profileHint')"
                >
                  <div class="grid gap-4 md:grid-cols-2">
                    <app-form-field inputId="s-name" [label]="i18n.t('settings.shopName') + ' *'">
                      <p-iconfield>
                        <p-inputicon class="pi pi-shop text-brand" />
                        <input
                          pInputText
                          id="s-name"
                          formControlName="shopName"
                          class="rounded-xl"
                          [fluid]="true"
                        />
                      </p-iconfield>
                    </app-form-field>
                    <app-form-field inputId="s-phone" [label]="i18n.t('register.phone')">
                      <p-iconfield>
                        <p-inputicon class="pi pi-phone text-brand" />
                        <input
                          pInputText
                          id="s-phone"
                          type="tel"
                          inputmode="numeric"
                          formControlName="shopPhone"
                          class="rounded-xl"
                          placeholder="0812345678"
                          [fluid]="true"
                        />
                      </p-iconfield>
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
                        rows="3"
                        [autoResize]="true"
                        class="w-full rounded-xl"
                      ></textarea>
                    </app-form-field>
                  </div>
                </app-settings-section>

                <app-settings-section
                  icon="pi pi-clock"
                  [heading]="i18n.t('settings.section.hours')"
                  [description]="i18n.t('settings.section.hoursHint')"
                >
                  @if (hoursDuration(); as hours) {
                    <span
                      sectionActions
                      class="bg-accent-soft text-accent rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap"
                      >{{ i18n.t('settings.hoursDuration', { n: hours }) }}</span
                    >
                  }
                  <div class="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
                    <app-form-field inputId="s-open" [label]="i18n.t('settings.openTime')">
                      <input
                        pInputText
                        id="s-open"
                        type="time"
                        formControlName="openTime"
                        class="rounded-xl text-lg font-semibold tabular-nums"
                        [fluid]="true"
                      />
                    </app-form-field>
                    <i
                      class="pi pi-arrow-right text-ink-muted hidden pb-3.5 sm:block"
                      aria-hidden="true"
                    ></i>
                    <app-form-field inputId="s-close" [label]="i18n.t('settings.closeTime')">
                      <input
                        pInputText
                        id="s-close"
                        type="time"
                        formControlName="closeTime"
                        class="rounded-xl text-lg font-semibold tabular-nums"
                        [fluid]="true"
                      />
                    </app-form-field>
                  </div>
                  @if (hoursBar(); as segments) {
                    <div class="mt-5" aria-hidden="true">
                      <div class="bg-canvas relative h-3 overflow-hidden rounded-full">
                        @for (segment of segments; track segment.left) {
                          <span
                            class="from-brand to-accent absolute inset-y-0 rounded-full bg-linear-to-r"
                            [style.left.%]="segment.left"
                            [style.width.%]="segment.width"
                          ></span>
                        }
                      </div>
                      <div class="text-ink-muted mt-1.5 flex justify-between text-xs tabular-nums">
                        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span
                        ><span>24:00</span>
                      </div>
                    </div>
                  }
                </app-settings-section>

                <app-settings-section
                  icon="pi pi-wallet"
                  [heading]="i18n.t('settings.section.payment')"
                  [description]="i18n.t('settings.section.paymentHint')"
                >
                  <div class="grid gap-4 md:grid-cols-2">
                    <app-form-field inputId="s-promptpay" [label]="i18n.t('settings.promptpay')">
                      <p-iconfield>
                        <p-inputicon class="pi pi-qrcode text-brand" />
                        <input
                          pInputText
                          id="s-promptpay"
                          inputmode="numeric"
                          formControlName="promptpayId"
                          class="rounded-xl tabular-nums"
                          placeholder="0812345678"
                          [fluid]="true"
                        />
                      </p-iconfield>
                    </app-form-field>
                    <app-form-field inputId="s-bank" [label]="i18n.t('settings.bankAccount')">
                      <p-iconfield>
                        <p-inputicon class="pi pi-building-columns text-brand" />
                        <input
                          pInputText
                          id="s-bank"
                          formControlName="bankAccount"
                          class="rounded-xl"
                          [fluid]="true"
                        />
                      </p-iconfield>
                    </app-form-field>
                  </div>
                </app-settings-section>

                <label
                  for="s-online"
                  class="animate-rise flex cursor-pointer items-center gap-4 rounded-3xl border p-5 transition-colors md:px-6"
                  [class.border-emerald-300]="formValue().acceptOnlineOrder"
                  [class.bg-emerald-50]="formValue().acceptOnlineOrder"
                  [class.dark:border-emerald-700]="formValue().acceptOnlineOrder"
                  [class.dark:bg-emerald-950/40]="formValue().acceptOnlineOrder"
                  [class.border-line]="!formValue().acceptOnlineOrder"
                  [class.bg-card]="!formValue().acceptOnlineOrder"
                >
                  <span
                    class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg transition-colors"
                    [class.bg-emerald-500]="formValue().acceptOnlineOrder"
                    [class.text-white]="formValue().acceptOnlineOrder"
                    [class.bg-canvas]="!formValue().acceptOnlineOrder"
                    [class.text-ink-muted]="!formValue().acceptOnlineOrder"
                    aria-hidden="true"
                  >
                    <i class="pi pi-globe"></i>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="font-display text-ink block text-lg leading-tight font-bold">{{
                      i18n.t('settings.section.online')
                    }}</span>
                    <span class="text-ink-muted block text-sm">{{
                      formValue().acceptOnlineOrder
                        ? i18n.t('settings.section.onlineOn')
                        : i18n.t('settings.section.onlineOff')
                    }}</span>
                  </span>
                  <p-toggleswitch inputId="s-online" formControlName="acceptOnlineOrder" />
                </label>
              </form>

              <aside class="lg:sticky lg:top-24" [attr.aria-label]="i18n.t('settings.preview')">
                <p
                  class="text-ink-muted mb-2 flex items-center gap-2 text-xs font-bold tracking-wide uppercase"
                >
                  <i class="pi pi-eye" aria-hidden="true"></i>{{ i18n.t('settings.preview') }}
                </p>
                <div class="bg-card border-line shadow-lift overflow-hidden rounded-3xl border">
                  <div class="bg-royal flex items-center gap-3 px-5 py-6 text-white">
                    <app-brand-logo class="h-14" />
                    <div class="min-w-0">
                      <p class="font-display truncate text-xl font-extrabold">
                        {{ formValue().shopName || i18n.t('brand.name') }}
                      </p>
                      <span
                        class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        [class.bg-emerald-400/20]="formValue().acceptOnlineOrder"
                        [class.text-emerald-100]="formValue().acceptOnlineOrder"
                        [class.bg-white/15]="!formValue().acceptOnlineOrder"
                        [class.text-white/80]="!formValue().acceptOnlineOrder"
                      >
                        <span
                          class="h-1.5 w-1.5 rounded-full"
                          [class.bg-emerald-300]="formValue().acceptOnlineOrder"
                          [class.bg-white/60]="!formValue().acceptOnlineOrder"
                        ></span>
                        {{
                          formValue().acceptOnlineOrder
                            ? i18n.t('settings.previewOpen')
                            : i18n.t('settings.previewClosed')
                        }}
                      </span>
                    </div>
                  </div>
                  <dl class="divide-line divide-y px-5 text-sm">
                    @for (row of previewRows(); track row.icon) {
                      <div class="flex gap-3 py-3">
                        <dt class="text-brand w-5 shrink-0 pt-0.5">
                          <i [class]="row.icon" aria-hidden="true"></i>
                          <span class="sr-only">{{ row.label }}</span>
                        </dt>
                        <dd
                          class="min-w-0 break-words"
                          [class.text-ink]="row.value"
                          [class.text-ink-muted]="!row.value"
                          [class.italic]="!row.value"
                        >
                          {{ row.value || i18n.t('settings.previewEmpty') }}
                        </dd>
                      </div>
                    }
                  </dl>
                </div>
              </aside>
            </div>
          </p-tabpanel>

          <p-tabpanel value="points">
            <form class="max-w-4xl" [formGroup]="form" (ngSubmit)="save()" novalidate>
              <app-settings-section
                icon="pi pi-star"
                [heading]="i18n.t('settings.section.points')"
                [description]="i18n.t('settings.pointsHint')"
              >
                <div class="grid gap-4 md:grid-cols-2">
                  <app-form-field inputId="s-earn" [label]="i18n.t('settings.earnBahtPerPoint')">
                    <p-inputnumber
                      inputId="s-earn"
                      formControlName="earnBahtPerPoint"
                      [min]="1"
                      suffix=" ฿ / 1 pt"
                      [fluid]="true"
                    />
                  </app-form-field>
                  <app-form-field
                    inputId="s-redeem"
                    [label]="i18n.t('settings.redeemPointsPerBaht')"
                  >
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
                </div>
              </app-settings-section>
            </form>
          </p-tabpanel>

          <p-tabpanel value="payments">
            <app-settings-section
              icon="pi pi-wallet"
              [heading]="i18n.t('settings.payments')"
              [description]="
                i18n.t('settings.methodsHint', { n: activeMethodCount(), total: methods().length })
              "
            >
              <p-button
                sectionActions
                [label]="i18n.t('common.add')"
                icon="pi pi-plus"
                [rounded]="true"
                (onClick)="editMethod(null)"
              />
              @if (methods().length) {
                <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  @for (method of methods(); track method.id) {
                    <article
                      class="bg-card group relative flex flex-col overflow-hidden rounded-3xl border-2 transition hover:-translate-y-0.5 hover:shadow-lg"
                      [class]="
                        method.active
                          ? 'border-line hover:border-brand/40'
                          : 'border-dashed border-line opacity-70'
                      "
                    >
                      <div
                        class="relative flex items-center gap-4 p-5"
                        [class]="
                          method.active ? 'from-brand-soft to-card bg-gradient-to-br' : 'bg-canvas'
                        "
                      >
                        <span
                          class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl shadow-sm"
                          [class]="method.active ? 'bg-royal text-white' : 'bg-card text-ink-muted'"
                        >
                          <i [class]="methodIcon(method)"></i>
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="font-display text-ink truncate text-lg font-bold">
                            {{ i18n.name(method) }}
                          </p>
                          <span
                            class="bg-card text-ink-muted border-line mt-1 inline-block rounded-md border px-2 py-0.5 font-mono text-[0.7rem] font-semibold tracking-wider"
                            >{{ method.code }}</span
                          >
                        </div>
                        <p-button
                          icon="pi pi-pencil"
                          [rounded]="true"
                          [outlined]="true"
                          severity="secondary"
                          [ariaLabel]="i18n.t('common.edit')"
                          (onClick)="editMethod(method)"
                        />
                      </div>

                      <div class="flex flex-1 flex-col gap-3 px-5 pb-5">
                        @if (method.instruction) {
                          <p class="text-ink-muted line-clamp-2 text-sm">
                            {{ method.instruction }}
                          </p>
                        }
                        <div class="flex flex-wrap gap-1.5">
                          @if (method.requiresReference) {
                            <span
                              class="bg-brand-soft text-brand rounded-full px-2.5 py-1 text-xs font-bold"
                            >
                              <i class="pi pi-hashtag mr-1 text-[0.65rem]"></i
                              >{{ i18n.t('settings.requiresReference') }}
                            </span>
                          }
                        </div>
                        <div class="border-line mt-auto grid grid-cols-2 gap-2 border-t pt-3">
                          <label
                            class="bg-canvas flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-3 py-2.5"
                          >
                            <span class="text-ink flex items-center gap-2 text-sm font-semibold">
                              <i class="pi pi-globe text-brand text-xs"></i
                              >{{ i18n.t('settings.allowOnline') }}
                            </span>
                            <p-toggleswitch
                              [ngModel]="method.allowOnline"
                              (ngModelChange)="patchMethod(method, { allowOnline: $event })"
                            />
                          </label>
                          <label
                            class="bg-canvas flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-3 py-2.5"
                          >
                            <span class="text-ink flex items-center gap-2 text-sm font-semibold">
                              <i
                                class="pi pi-power-off text-xs"
                                [class]="method.active ? 'text-green-600' : 'text-ink-muted'"
                              ></i
                              >{{ i18n.t('status.active.true') }}
                            </span>
                            <p-toggleswitch
                              [ngModel]="method.active"
                              (ngModelChange)="patchMethod(method, { active: $event })"
                            />
                          </label>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <app-empty-state icon="pi pi-wallet" [title]="i18n.t('settings.noMethods')" />
              }
            </app-settings-section>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <app-save-bar [visible]="dirty()" [saving]="saving()" (save)="save()" (discard)="discard()" />
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
            ><p-toggleswitch formControlName="requiresReference" />{{
              i18n.t('settings.requiresReference')
            }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="allowOnline" />{{
              i18n.t('settings.allowOnline')
            }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="active" />{{ i18n.t('status.active.true') }}</label
          >
        </div>
        <div class="dialog-actions flex justify-end gap-2 sm:col-span-2">
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
    shopName: ['', textField(TEXT_LIMITS.shortText, true)],
    shopPhone: ['', [Validators.maxLength(TEXT_LIMITS.phone), thaiPhone]],
    address: ['', textField(TEXT_LIMITS.address)],
    openTime: ['16:00', [Validators.pattern(TIME_PATTERN)]],
    closeTime: ['23:00', [Validators.pattern(TIME_PATTERN)]],
    acceptOnlineOrder: [true],
    promptpayId: ['', [Validators.maxLength(TEXT_LIMITS.phone), Validators.pattern(/^[0-9-]*$/)]],
    bankAccount: ['', textField(TEXT_LIMITS.shortText)],
    earnBahtPerPoint: [25, [Validators.min(1)]],
    redeemPointsPerBaht: [10, [Validators.min(1)]],
    redeemMinPoints: [100, [Validators.min(1)]],
    redeemMaxPercent: [50, [Validators.min(1), Validators.max(100)]],
    expireDays: [365, [Validators.min(1)]],
  });

  protected readonly methodForm = this.fb.nonNullable.group({
    code: ['', [requiredText, Validators.maxLength(TEXT_LIMITS.code), paymentMethodCode]],
    name: ['', textField(TEXT_LIMITS.methodName, true)],
    nameEn: ['', textField(TEXT_LIMITS.methodName)],
    instruction: ['', textField(TEXT_LIMITS.instruction)],
    requiresReference: [false],
    allowOnline: [true],
    active: [true],
    icon: ['', [Validators.maxLength(TEXT_LIMITS.shortText), Validators.pattern(/^[a-z0-9 -]*$/)]],
  });

  protected readonly activeMethodCount = computed(
    () => this.methods().filter((method) => method.active).length,
  );

  protected methodIcon(method: PaymentMethodResponse): string {
    if (method.icon) {
      return method.icon.startsWith('pi') ? method.icon : `pi pi-${method.icon}`;
    }
    return METHOD_ICONS[method.code] ?? 'pi pi-wallet';
  }

  constructor() {
    this.userApi.settings().subscribe((settings) => this.applySettings(settings));
    this.loadMethods();
  }

  private readonly loadedSettings = signal<ShopSettings | null>(null);

  protected readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly dirty = computed(() => {
    const loaded = this.loadedSettings();
    const value = this.formValue() as Partial<ShopSettings>;
    return (
      !!loaded &&
      (Object.keys(this.form.controls) as (keyof ShopSettings)[]).some(
        (key) => value[key] !== loaded[key],
      )
    );
  });

  protected readonly hoursDuration = computed(() => {
    const open = minutesOf(this.formValue().openTime ?? '');
    const close = minutesOf(this.formValue().closeTime ?? '');
    if (open === null || close === null || open === close) {
      return null;
    }
    const minutes = (close - open + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    return Math.round((minutes / 60) * 10) / 10;
  });

  protected readonly hoursBar = computed(() => {
    const open = minutesOf(this.formValue().openTime ?? '');
    const close = minutesOf(this.formValue().closeTime ?? '');
    if (open === null || close === null || open === close) {
      return null;
    }
    const percent = (minutes: number) => (minutes / MINUTES_PER_DAY) * 100;
    if (close > open) {
      return [{ left: percent(open), width: percent(close - open) }];
    }
    return [
      { left: 0, width: percent(close) },
      { left: percent(open), width: 100 - percent(open) },
    ];
  });

  protected readonly previewRows = computed(() => {
    const value = this.formValue();
    const hours = value.openTime && value.closeTime ? `${value.openTime} – ${value.closeTime}` : '';
    const payments = [
      value.promptpayId ? `PromptPay ${value.promptpayId}` : '',
      value.bankAccount ?? '',
    ]
      .filter(Boolean)
      .join(' · ');
    return [
      { icon: 'pi pi-clock', label: this.i18n.t('settings.section.hours'), value: hours },
      { icon: 'pi pi-phone', label: this.i18n.t('register.phone'), value: value.shopPhone ?? '' },
      {
        icon: 'pi pi-map-marker',
        label: this.i18n.t('settings.address'),
        value: value.address ?? '',
      },
      { icon: 'pi pi-wallet', label: this.i18n.t('settings.section.payment'), value: payments },
    ];
  });

  private applySettings(settings: ShopSettings): void {
    this.loadedSettings.set(settings);
    this.form.reset(settings);
  }

  protected discard(): void {
    const loaded = this.loadedSettings();
    if (loaded) {
      this.form.reset(loaded);
    }
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.messages.add({ severity: 'error', summary: this.i18n.error('VALIDATION_ERROR') });
      return;
    }
    this.saving.set(true);
    this.userApi
      .updateSettings(this.form.getRawValue() as ShopSettings, this.loadedSettings())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe((settings) => {
        this.applySettings(settings);
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
      requiresReference: method?.requiresReference ?? false,
      allowOnline: method?.allowOnline ?? true,
      active: method?.active ?? true,
      icon: method?.icon ?? '',
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
    const id = this.editingMethodId();
    const existing = this.methods().find((method) => method.id === id);
    const request = {
      ...this.methodForm.getRawValue(),
      sortOrder: existing?.sortOrder ?? this.methods().length + 1,
    };
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
        requiresReference: next.requiresReference,
        allowOnline: next.allowOnline,
        active: next.active,
        instruction: next.instruction,
        icon: next.icon,
        sortOrder: next.sortOrder,
      })
      .subscribe(() => this.loadMethods());
  }

  private loadMethods(): void {
    this.orderApi.adminPaymentMethods().subscribe((methods) => this.methods.set(methods));
  }
}
