import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { catchError, finalize, map, of } from 'rxjs';

import {
  PromotionChannel,
  PromotionResponse,
  PromotionScope,
  PromotionType,
  PromotionUpsertRequest,
} from '../../../core/api/models/loyalty.model';
import { CatalogApi } from '../../../core/api/services/catalog.api';
import { PromotionApi } from '../../../core/api/services/promotion.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { FormField } from '../../../shared/components/form-field/form-field';
import { ImageUpload } from '../../../shared/components/image-upload/image-upload';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { PromoCard } from '../../../shared/components/promo-card/promo-card';
import { dayName } from '../../../shared/utils/promotion';
import {
  productCode,
  requiredText,
  shouldShowError,
  textField,
  validationMessage,
} from '../../../shared/utils/validators';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';

const TYPES: PromotionType[] = ['PERCENT', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'POINT_MULTIPLIER'];
const SCOPES: PromotionScope[] = ['ORDER', 'PRODUCT', 'CATEGORY'];
const CHANNELS: PromotionChannel[] = ['ALL', 'WALK_IN', 'ONLINE'];
const DAYS = [1, 2, 3, 4, 5, 6, 7];

@Component({
  selector: 'app-promotion-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    FormField,
    ImageUpload,
    PageHeader,
    Panel,
    PromoCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.promotions')" [crumbs]="crumbs()" />

    <form
      class="grid items-start gap-5 px-4 py-6 md:px-8 xl:grid-cols-[1fr_22rem]"
      [formGroup]="form"
      (ngSubmit)="save()"
      novalidate
    >
      <div class="flex flex-col gap-5">
        <app-panel [heading]="i18n.t('bo.promotions.basic')">
          <div class="grid gap-4 sm:grid-cols-2">
            <app-form-field
              inputId="pr-name"
              [label]="i18n.t('catalog.nameTh') + ' *'"
              [error]="errorFor('name')"
            >
              <input
                pInputText
                id="pr-name"
                formControlName="name"
                class="rounded-xl"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field inputId="pr-name-en" [label]="i18n.t('catalog.nameEn')">
              <input
                pInputText
                id="pr-name-en"
                formControlName="nameEn"
                class="rounded-xl"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field inputId="pr-desc" [label]="i18n.t('catalog.description')">
              <textarea
                pTextarea
                id="pr-desc"
                formControlName="description"
                rows="2"
                class="w-full rounded-xl"
              ></textarea>
            </app-form-field>
            <app-form-field inputId="pr-desc-en" [label]="i18n.t('catalog.descriptionEn')">
              <textarea
                pTextarea
                id="pr-desc-en"
                formControlName="descriptionEn"
                rows="2"
                class="w-full rounded-xl"
              ></textarea>
            </app-form-field>
            <app-form-field
              inputId="pr-code"
              [label]="i18n.t('bo.promotions.code')"
              [hint]="i18n.t('bo.promotions.codeHint')"
            >
              <input
                pInputText
                id="pr-code"
                formControlName="code"
                class="rounded-xl uppercase"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field
              inputId="pr-priority"
              [label]="i18n.t('bo.promotions.priority')"
              [hint]="i18n.t('bo.promotions.priorityHint')"
            >
              <p-inputnumber
                inputId="pr-priority"
                formControlName="priority"
                [showButtons]="true"
                [min]="0"
                [fluid]="true"
              />
            </app-form-field>
            <div class="sm:col-span-2">
              <p class="text-ink mb-2 text-sm font-semibold">
                {{ i18n.t('bo.promotions.banner') }}
              </p>
              <app-image-upload
                [url]="form.controls.bannerUrl.value"
                (urlChange)="form.controls.bannerUrl.setValue($event)"
              />
            </div>
          </div>
        </app-panel>

        <app-panel [heading]="i18n.t('bo.promotions.discount')">
          <div class="grid gap-4 sm:grid-cols-2">
            <app-form-field inputId="pr-type" [label]="i18n.t('bo.promotions.type') + ' *'">
              <p-select
                inputId="pr-type"
                formControlName="type"
                [options]="typeOptions()"
                optionLabel="label"
                optionValue="value"
                [fluid]="true"
              />
            </app-form-field>
            @switch (type()) {
              @case ('BUY_X_GET_Y') {
                <div class="grid grid-cols-2 gap-3">
                  <app-form-field inputId="pr-buy" [label]="i18n.t('bo.promotions.buyQty')">
                    <p-inputnumber
                      inputId="pr-buy"
                      formControlName="buyQty"
                      [min]="1"
                      [showButtons]="true"
                      [fluid]="true"
                    />
                  </app-form-field>
                  <app-form-field inputId="pr-get" [label]="i18n.t('bo.promotions.getQty')">
                    <p-inputnumber
                      inputId="pr-get"
                      formControlName="getQty"
                      [min]="1"
                      [showButtons]="true"
                      [fluid]="true"
                    />
                  </app-form-field>
                </div>
              }
              @default {
                <app-form-field
                  inputId="pr-value"
                  [label]="valueLabel()"
                  [error]="errorFor('discountValue')"
                >
                  <p-inputnumber
                    inputId="pr-value"
                    formControlName="discountValue"
                    [min]="0"
                    [maxFractionDigits]="2"
                    [suffix]="valueSuffix()"
                    [fluid]="true"
                  />
                </app-form-field>
              }
            }
            @if (type() === 'PERCENT') {
              <app-form-field inputId="pr-max" [label]="i18n.t('bo.promotions.maxDiscount')">
                <p-inputnumber
                  inputId="pr-max"
                  formControlName="maxDiscount"
                  mode="currency"
                  currency="THB"
                  locale="th-TH"
                  [min]="0"
                  [fluid]="true"
                />
              </app-form-field>
            }
            <app-form-field inputId="pr-min" [label]="i18n.t('bo.promotions.minOrder')">
              <p-inputnumber
                inputId="pr-min"
                formControlName="minOrderAmount"
                mode="currency"
                currency="THB"
                locale="th-TH"
                [min]="0"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field inputId="pr-scope" [label]="i18n.t('bo.promotions.scope')">
              <p-select
                inputId="pr-scope"
                formControlName="scope"
                [options]="scopeOptions()"
                optionLabel="label"
                optionValue="value"
                [fluid]="true"
              />
            </app-form-field>
            @if (scope() === 'PRODUCT') {
              <app-form-field
                class="sm:col-span-2"
                inputId="pr-products"
                [label]="i18n.t('catalog.products') + ' *'"
              >
                <p-multiselect
                  inputId="pr-products"
                  formControlName="productIds"
                  [options]="productOptions()"
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  [filter]="true"
                  [fluid]="true"
                />
              </app-form-field>
            }
            @if (scope() === 'CATEGORY') {
              <app-form-field
                class="sm:col-span-2"
                inputId="pr-categories"
                [label]="i18n.t('catalog.categories') + ' *'"
              >
                <p-multiselect
                  inputId="pr-categories"
                  formControlName="categoryIds"
                  [options]="categoryOptions()"
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  [fluid]="true"
                />
              </app-form-field>
            }
          </div>
        </app-panel>

        <app-panel [heading]="i18n.t('bo.promotions.conditions')">
          <div class="grid gap-4 sm:grid-cols-2">
            <app-form-field inputId="pr-start" [label]="i18n.t('bo.promotions.startAt') + ' *'">
              <p-datepicker
                inputId="pr-start"
                formControlName="startAt"
                [showTime]="true"
                hourFormat="24"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field
              inputId="pr-end"
              [label]="i18n.t('bo.promotions.endAt') + ' *'"
              [error]="periodError()"
            >
              <p-datepicker
                inputId="pr-end"
                formControlName="endAt"
                [showTime]="true"
                hourFormat="24"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field inputId="pr-channel" [label]="i18n.t('bo.orders.channel')">
              <p-select
                inputId="pr-channel"
                formControlName="channel"
                [options]="channelOptions()"
                optionLabel="label"
                optionValue="value"
                [fluid]="true"
              />
            </app-form-field>
            <div>
              <p class="text-ink mb-1.5 text-sm font-semibold">
                {{ i18n.t('bo.promotions.days') }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                @for (day of days; track day) {
                  <button
                    type="button"
                    class="h-9 w-11 rounded-xl border text-xs font-semibold transition"
                    [class]="
                      hasDay(day)
                        ? 'border-brand bg-brand text-on-brand'
                        : 'border-line text-ink-muted'
                    "
                    (click)="toggleDay(day)"
                  >
                    {{ dayLabel(day) }}
                  </button>
                }
              </div>
              <p class="text-ink-muted mt-1 text-xs">{{ i18n.t('bo.promotions.daysHint') }}</p>
            </div>
            <app-form-field
              inputId="pr-limit"
              [label]="i18n.t('bo.promotions.usageLimit')"
              [hint]="i18n.t('bo.promotions.unlimitedHint')"
            >
              <p-inputnumber
                inputId="pr-limit"
                formControlName="usageLimit"
                [min]="1"
                [fluid]="true"
              />
            </app-form-field>
            <app-form-field
              inputId="pr-per"
              [label]="i18n.t('bo.promotions.perCustomer')"
              [hint]="i18n.t('bo.promotions.unlimitedHint')"
            >
              <p-inputnumber
                inputId="pr-per"
                formControlName="usagePerCustomer"
                [min]="1"
                [fluid]="true"
              />
            </app-form-field>
            <div class="flex flex-wrap gap-5 sm:col-span-2">
              <label class="text-ink flex items-center gap-2 text-sm"
                ><p-toggleswitch formControlName="memberOnly" />{{
                  i18n.t('promo.condition.memberOnly')
                }}</label
              >
              <label class="text-ink flex items-center gap-2 text-sm"
                ><p-toggleswitch formControlName="showOnLanding" />{{
                  i18n.t('bo.promotions.showOnLanding')
                }}</label
              >
              <label class="text-ink flex items-center gap-2 text-sm"
                ><p-toggleswitch formControlName="active" />{{
                  i18n.t('status.active.true')
                }}</label
              >
            </div>
          </div>
        </app-panel>
      </div>

      <div class="flex flex-col gap-4 xl:sticky xl:top-24">
        <p class="text-ink-muted text-xs font-semibold tracking-wider uppercase">
          {{ i18n.t('bo.promotions.preview') }}
        </p>
        <app-promo-card [promotion]="preview()" />
        <p-button
          type="submit"
          [label]="i18n.t('common.save')"
          icon="pi pi-check"
          size="large"
          [rounded]="true"
          [fluid]="true"
          [loading]="saving()"
        />
        <a
          pButton
          routerLink="/backoffice/promotions"
          [label]="i18n.t('common.back')"
          [text]="true"
          [fluid]="true"
        ></a>
      </div>
    </form>
  `,
})
export class PromotionFormPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(PromotionApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly catalog = inject(CatalogStore);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly id = input<string>();

  protected readonly days = DAYS;
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  private readonly usedCount = signal(0);

  protected readonly form = inject(FormBuilder).group({
    name: ['', textField(TEXT_LIMITS.promotionName, true)],
    nameEn: ['', textField(TEXT_LIMITS.promotionName)],
    description: ['', textField(TEXT_LIMITS.description)],
    descriptionEn: ['', textField(TEXT_LIMITS.description)],
    code: ['', [Validators.maxLength(TEXT_LIMITS.code), productCode]],
    bannerUrl: [null as string | null],
    type: ['PERCENT' as PromotionType],
    discountValue: [10 as number | null],
    maxDiscount: [null as number | null],
    buyQty: [2 as number | null],
    getQty: [1 as number | null],
    minOrderAmount: [0 as number | null],
    scope: ['ORDER' as PromotionScope],
    productIds: [[] as number[]],
    categoryIds: [[] as number[]],
    memberOnly: [false],
    channel: ['ALL' as PromotionChannel],
    daysOfWeek: [[] as number[]],
    startAt: [new Date() as Date | null, Validators.required],
    endAt: [new Date(Date.now() + 30 * 86_400_000) as Date | null, Validators.required],
    usageLimit: [null as number | null],
    usagePerCustomer: [null as number | null],
    showOnLanding: [true],
    priority: [1 as number | null],
    active: [true],
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  protected readonly type = computed(() => this.value().type ?? 'PERCENT');
  protected readonly scope = computed(() => this.value().scope ?? 'ORDER');

  protected readonly crumbs = computed<Crumb[]>(() => [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.promotions', link: '/backoffice/promotions' },
    { labelKey: this.id() ? 'bo.promotions.edit' : 'bo.promotions.new' },
  ]);

  protected readonly typeOptions = computed(() =>
    TYPES.map((value) => ({ value, label: this.i18n.t(`promo.type.${value}`) })),
  );
  protected readonly scopeOptions = computed(() =>
    SCOPES.map((value) => ({ value, label: this.i18n.t(`promo.scope.${value}`) })),
  );
  protected readonly channelOptions = computed(() =>
    CHANNELS.map((value) => ({ value, label: this.i18n.t(`promo.channel.${value}`) })),
  );

  private readonly products = toSignal(
    this.catalogApi.products({ page: 0, size: 500 }).pipe(
      map((page) => page.items),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );
  private readonly categories = toSignal(
    this.catalogApi.categories().pipe(catchError(() => of([]))),
    {
      initialValue: [],
    },
  );

  protected readonly productOptions = computed(() =>
    this.products().map((product) => ({
      value: product.id,
      label: `${product.code} · ${this.i18n.name(product)}`,
    })),
  );
  protected readonly categoryOptions = computed(() =>
    this.categories().map((category) => ({ value: category.id, label: this.i18n.name(category) })),
  );

  protected readonly valueLabel = computed(() =>
    this.i18n.t(
      this.type() === 'POINT_MULTIPLIER' ? 'bo.promotions.multiplier' : 'bo.promotions.value',
    ),
  );
  protected readonly valueSuffix = computed(() =>
    this.type() === 'PERCENT' ? ' %' : this.type() === 'POINT_MULTIPLIER' ? ' x' : ' ฿',
  );

  protected readonly preview = computed<PromotionResponse>(() => {
    this.value();
    return { ...this.toRequest(), id: Number(this.id() ?? 0), usedCount: this.usedCount() };
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        this.api.detail(Number(id)).subscribe((promotion) => this.fill(promotion));
      }
    });
  }

  protected errorFor(field: 'name' | 'discountValue'): string | null {
    const control = this.form.controls[field];
    return shouldShowError(control, this.submitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected periodError(): string | null {
    const { startAt, endAt } = this.value();
    return startAt && endAt && startAt > endAt ? this.i18n.t('bo.promotions.periodError') : null;
  }

  protected hasDay(day: number): boolean {
    return (this.value().daysOfWeek ?? []).includes(day);
  }

  protected toggleDay(day: number): void {
    const current = this.form.controls.daysOfWeek.value ?? [];
    this.form.controls.daysOfWeek.setValue(
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );
  }

  protected dayLabel(day: number): string {
    return dayName(day, this.i18n);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.periodError()) {
      return;
    }
    const id = this.id();
    const request = this.toRequest();
    this.saving.set(true);
    (id ? this.api.update(Number(id), request) : this.api.create(request))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.catalog.refresh();
        this.router.navigateByUrl('/backoffice/promotions');
      });
  }

  private fill(promotion: PromotionResponse): void {
    this.usedCount.set(promotion.usedCount);
    this.form.reset({
      ...promotion,
      code: promotion.code ?? '',
      daysOfWeek: promotion.daysOfWeek ?? [],
      startAt: new Date(promotion.startAt),
      endAt: new Date(promotion.endAt),
    });
  }

  private toRequest(): PromotionUpsertRequest {
    const value = this.form.getRawValue();
    return {
      code: value.code?.trim().toUpperCase() || null,
      name: value.name?.trim() ?? '',
      nameEn: value.nameEn?.trim() ?? '',
      description: value.description ?? '',
      descriptionEn: value.descriptionEn ?? '',
      bannerUrl: value.bannerUrl,
      type: value.type ?? 'PERCENT',
      discountValue: value.type === 'BUY_X_GET_Y' ? 0 : (value.discountValue ?? 0),
      maxDiscount: value.type === 'PERCENT' ? value.maxDiscount || null : null,
      buyQty: value.type === 'BUY_X_GET_Y' ? value.buyQty : null,
      getQty: value.type === 'BUY_X_GET_Y' ? value.getQty : null,
      minOrderAmount: value.minOrderAmount ?? 0,
      scope: value.scope ?? 'ORDER',
      memberOnly: value.memberOnly ?? false,
      channel: value.channel ?? 'ALL',
      daysOfWeek: value.daysOfWeek?.length ? value.daysOfWeek : null,
      startAt: (value.startAt ?? new Date()).toISOString(),
      endAt: (value.endAt ?? new Date()).toISOString(),
      usageLimit: value.usageLimit || null,
      usagePerCustomer: value.usagePerCustomer || null,
      showOnLanding: value.showOnLanding ?? false,
      priority: value.priority ?? 0,
      active: value.active ?? true,
      productIds: value.productIds ?? [],
      categoryIds: value.categoryIds ?? [],
    };
  }
}
