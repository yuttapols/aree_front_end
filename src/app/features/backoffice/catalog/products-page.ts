import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { catchError, finalize, of, switchMap } from 'rxjs';

import {
  ProductBadge,
  ProductQuery,
  ProductResponse,
} from '../../../core/api/models/catalog.model';
import { CatalogApi } from '../../../core/api/services/catalog.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { fallbackPalette, productOptionGroupIds } from '../../../core/catalog/catalog.mapper';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  DataTable,
  TableColumn,
  TablePage,
} from '../../../shared/components/data-table/data-table';
import { ProductImage } from '../../../shared/components/product-image/product-image';
import { SectionHero } from '../../../shared/components/section-hero/section-hero';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { FormField } from '../../../shared/components/form-field/form-field';
import { ImageUpload } from '../../../shared/components/image-upload/image-upload';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { formatMoney } from '../../../shared/utils/format';
import {
  requiredText,
  shouldShowError,
  textField,
  validationMessage,
} from '../../../shared/utils/validators';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';

const PAGE_SIZE = 10;
const BADGES: ProductBadge[] = ['bestseller', 'new', 'recommended'];

const MAX_PRICE = 99_999.99;

@Component({
  selector: 'app-products-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    DataTable,
    FormField,
    ImageUpload,
    MoneyPipe,
    ProductImage,
    SearchBox,
    SectionHero,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-hero
      class="mb-5"
      icon="pi pi-shopping-bag"
      [heading]="i18n.t('catalog.products')"
      [subtitle]="i18n.t('catalog.productsHint')"
      [badge]="i18n.t('catalog.productTotal', { n: total() })"
    >
      <p-button
        [label]="i18n.t('catalog.newProduct')"
        icon="pi pi-plus"
        [rounded]="true"
        (onClick)="edit(null)"
      />
    </app-section-hero>

    <div class="bg-card border-line shadow-soft rounded-3xl border p-4 md:p-5">
      <div class="mb-4 grid gap-3 md:grid-cols-[2fr_1fr]">
        <app-search-box
          [placeholder]="i18n.t('catalog.searchProduct')"
          [clearLabel]="i18n.t('search.clear')"
          (search)="patch({ keyword: $event })"
        />
        <p-select
          [options]="filterCategoryOptions()"
          optionLabel="label"
          optionValue="value"
          [showClear]="true"
          [fluid]="true"
          [placeholder]="i18n.t('catalog.category')"
          [ngModel]="query().categoryId"
          (ngModelChange)="patch({ categoryId: $event })"
        />
      </div>
      <app-data-table
        [rows]="products()"
        [columns]="columns()"
        [loading]="loading()"
        [total]="total()"
        [page]="query().page"
        [pageSize]="query().size"
        [emptyTitle]="i18n.t('menu.empty')"
        minWidth="60rem"
        (pageChange)="onPage($event)"
      >
        <ng-template #cell let-row let-column="column">
          @switch (column.key) {
            @case ('name') {
              <span class="flex items-center gap-3" [class.opacity-70]="!row.active">
                <span
                  class="bg-royal relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-sm"
                >
                  <app-product-image
                    class="block h-full w-full"
                    [src]="row.imageUrl"
                    [palette]="row.palette ?? palette(row.id)"
                    [label]="i18n.name(row)"
                    plateClass="mx-auto h-[86%] translate-y-[8%]"
                  />
                  @if (!row.available) {
                    <span
                      class="absolute inset-0 grid place-items-center bg-black/50 text-[0.6rem] font-bold text-white"
                      >{{ i18n.t('catalog.soldOut') }}</span
                    >
                  }
                </span>
                <span class="min-w-0">
                  <span class="flex items-center gap-1.5">
                    <span class="text-ink truncate font-semibold">{{ i18n.name(row) }}</span>
                    @if (row.recommended) {
                      <i
                        class="pi pi-star-fill text-accent text-[0.65rem]"
                        [attr.aria-label]="i18n.t('catalog.recommended')"
                      ></i>
                    }
                  </span>
                  <span class="mt-0.5 flex items-center gap-1.5">
                    <span class="text-ink-muted font-mono text-[0.7rem]">{{ row.code }}</span>
                    @if (row.badge) {
                      <span
                        class="bg-accent rounded-full px-2 py-px text-[0.6rem] font-bold text-white"
                        >{{ badgeLabel(row.badge) }}</span
                      >
                    }
                    @if (groupCount(row); as groupCount) {
                      <span
                        class="bg-card-muted text-ink-muted rounded-full px-2 py-px text-[0.6rem]"
                      >
                        <i class="pi pi-list-check text-[0.55rem]"></i>
                        {{ i18n.t('catalog.groupCount', { n: groupCount }) }}
                      </span>
                    }
                  </span>
                </span>
              </span>
            }
            @case ('category') {
              <span
                class="bg-brand-soft text-brand rounded-full px-2.5 py-1 text-xs font-semibold"
                >{{ row.categoryName }}</span
              >
            }
            @case ('price') {
              <span class="block text-right">
                <span class="font-display text-ink text-base font-bold tabular-nums">{{
                  row.price | money: false
                }}</span>
                @if (row.originalPrice && row.originalPrice > row.price) {
                  <span class="text-ink-muted block text-xs line-through">{{
                    row.originalPrice | money: false
                  }}</span>
                }
              </span>
            }
            @case ('available') {
              <p-toggleswitch
                [ngModel]="row.available"
                [disabled]="!row.active"
                [ariaLabel]="i18n.t('catalog.available')"
                (ngModelChange)="toggleAvailability(row, $event)"
              />
            }
            @case ('active') {
              <app-status-tag kind="active" [value]="row.active" />
            }
            @case ('actions') {
              <span class="inline-flex items-center">
                <p-button
                  icon="pi pi-pencil"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('common.edit')"
                  (onClick)="edit(row)"
                />
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('common.delete')"
                  (onClick)="remove(row)"
                />
              </span>
            }
          }
        </ng-template>
      </app-data-table>
    </div>

    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="dialogOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t(editingId() ? 'catalog.editProduct' : 'catalog.newProduct')"
      [style]="{ width: '60rem' }"
      [breakpoints]="{ '960px': '96vw' }"
    >
      <form
        class="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]"
        [formGroup]="form"
        (ngSubmit)="save()"
        novalidate
      >
        <aside class="grid content-start gap-4 md:sticky md:top-0">
          <div class="bg-canvas border-line rounded-3xl border p-4">
            <app-image-upload
              [url]="form.controls.imageUrl.value"
              (urlChange)="form.controls.imageUrl.setValue($event)"
            />
          </div>
          <div class="bg-canvas border-line divide-line divide-y rounded-3xl border">
            @for (toggle of statusToggles; track toggle.control) {
              <label
                class="flex cursor-pointer items-center gap-3 px-4 py-3"
                [for]="'p-' + toggle.control"
              >
                <span
                  class="bg-brand-soft text-brand grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  aria-hidden="true"
                >
                  <i [class]="toggle.icon"></i>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="text-ink block text-sm font-semibold">{{
                    i18n.t(toggle.label)
                  }}</span>
                  <span class="text-ink-muted block text-xs leading-snug">{{
                    i18n.t(toggle.hint)
                  }}</span>
                </span>
                <p-toggleswitch
                  [inputId]="'p-' + toggle.control"
                  [formControlName]="toggle.control"
                />
              </label>
            }
          </div>
        </aside>

        <div class="grid min-w-0 content-start gap-6">
          <section class="grid gap-4">
            <header class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-display text-ink flex items-center gap-2 text-base font-bold">
                <span class="bg-accent h-5 w-1.5 rounded-full" aria-hidden="true"></span>
                {{ i18n.t('catalog.section.basic') }}
              </h3>
              @if (editingProduct(); as product) {
                <span
                  class="bg-brand-soft text-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold"
                  [attr.aria-label]="i18n.t('catalog.code') + ' ' + product.code"
                >
                  <i class="pi pi-hashtag text-[0.65rem]" aria-hidden="true"></i>{{ product.code }}
                </span>
              } @else {
                <span class="text-ink-muted text-xs">{{ i18n.t('catalog.codeAuto') }}</span>
              }
            </header>
            <div class="grid gap-4 sm:grid-cols-2">
              <app-form-field
                class="sm:col-span-2"
                inputId="p-category"
                [label]="i18n.t('catalog.category') + ' *'"
                [error]="errorFor('categoryId')"
              >
                <p-select
                  inputId="p-category"
                  formControlName="categoryId"
                  [options]="categoryOptions()"
                  optionLabel="label"
                  optionValue="value"
                  [fluid]="true"
                />
              </app-form-field>
              <app-form-field
                inputId="p-name"
                [label]="i18n.t('catalog.nameTh') + ' *'"
                [error]="errorFor('name')"
              >
                <input
                  pInputText
                  id="p-name"
                  formControlName="name"
                  class="rounded-xl"
                  [fluid]="true"
                />
              </app-form-field>
              <app-form-field inputId="p-name-en" [label]="i18n.t('catalog.nameEn')">
                <input
                  pInputText
                  id="p-name-en"
                  formControlName="nameEn"
                  class="rounded-xl"
                  [fluid]="true"
                />
              </app-form-field>
              <app-form-field inputId="p-desc" [label]="i18n.t('catalog.description')">
                <textarea
                  pTextarea
                  id="p-desc"
                  formControlName="description"
                  rows="2"
                  [autoResize]="true"
                  class="w-full rounded-xl"
                ></textarea>
              </app-form-field>
              <app-form-field inputId="p-desc-en" [label]="i18n.t('catalog.descriptionEn')">
                <textarea
                  pTextarea
                  id="p-desc-en"
                  formControlName="descriptionEn"
                  rows="2"
                  [autoResize]="true"
                  class="w-full rounded-xl"
                ></textarea>
              </app-form-field>
            </div>
          </section>

          <section class="grid gap-4">
            <h3 class="font-display text-ink flex items-center gap-2 text-base font-bold">
              <span class="bg-accent h-5 w-1.5 rounded-full" aria-hidden="true"></span>
              {{ i18n.t('catalog.section.pricing') }}
            </h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <app-form-field
                inputId="p-price"
                [label]="i18n.t('catalog.price') + ' *'"
                [error]="errorFor('price')"
              >
                <p-inputnumber
                  inputId="p-price"
                  formControlName="price"
                  mode="currency"
                  currency="THB"
                  locale="th-TH"
                  [min]="0"
                  [fluid]="true"
                />
              </app-form-field>
              <app-form-field
                inputId="p-original"
                [label]="i18n.t('catalog.originalPrice')"
                [hint]="i18n.t('catalog.originalPriceHint')"
              >
                <p-inputnumber
                  inputId="p-original"
                  formControlName="originalPrice"
                  mode="currency"
                  currency="THB"
                  locale="th-TH"
                  [min]="0"
                  [showClear]="true"
                  [fluid]="true"
                />
              </app-form-field>
            </div>
            @if (discountPercent(); as percent) {
              <p
                class="bg-accent-soft text-accent flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm"
                role="status"
              >
                <span class="font-display text-lg font-extrabold">{{
                  formValue().price | money
                }}</span>
                <span class="text-ink-muted line-through">{{
                  formValue().originalPrice | money
                }}</span>
                <span
                  class="bg-accent text-on-brand ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold"
                  >{{ i18n.t('catalog.discountPercent', { n: percent }) }}</span
                >
              </p>
            }
          </section>

          <section class="grid gap-4">
            <h3 class="font-display text-ink flex items-center gap-2 text-base font-bold">
              <span class="bg-accent h-5 w-1.5 rounded-full" aria-hidden="true"></span>
              {{ i18n.t('catalog.section.display') }}
            </h3>
            <div class="grid gap-2">
              <span id="p-badge-label" class="text-ink text-sm font-semibold">{{
                i18n.t('catalog.badge')
              }}</span>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="p-badge-label">
                <button
                  type="button"
                  role="radio"
                  class="rounded-full border px-4 py-1.5 text-sm font-semibold transition"
                  [attr.aria-checked]="!formValue().badge"
                  [class]="badgeChipClass(!formValue().badge)"
                  (click)="setBadge(null)"
                >
                  {{ i18n.t('common.none') }}
                </button>
                @for (option of badgeOptions(); track option.value) {
                  <button
                    type="button"
                    role="radio"
                    class="rounded-full border px-4 py-1.5 text-sm font-semibold transition"
                    [attr.aria-checked]="formValue().badge === option.value"
                    [class]="badgeChipClass(formValue().badge === option.value)"
                    (click)="setBadge(option.value)"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            <div class="grid gap-2">
              <span class="text-ink flex items-center justify-between gap-2 text-sm font-semibold">
                <span id="p-groups-label">{{ i18n.t('catalog.optionGroups') }}</span>
                @if (!groupsReady()) {
                  <i class="pi pi-spin pi-spinner text-ink-muted" aria-hidden="true"></i>
                }
              </span>
              <div class="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby="p-groups-label">
                @for (group of groupCards(); track group.id) {
                  <button
                    type="button"
                    role="checkbox"
                    class="flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition disabled:opacity-50"
                    [attr.aria-checked]="group.selected"
                    [disabled]="!groupsReady()"
                    [class.border-brand]="group.selected"
                    [class.bg-brand-soft]="group.selected"
                    [class.border-line]="!group.selected"
                    [class.hover:border-brand]="!group.selected"
                    (click)="toggleGroup(group.id)"
                  >
                    <span
                      class="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-xs transition"
                      [class.border-brand]="group.selected"
                      [class.bg-brand]="group.selected"
                      [class.text-on-brand]="group.selected"
                      [class.border-line]="!group.selected"
                      aria-hidden="true"
                    >
                      @if (group.selected) {
                        <i class="pi pi-check text-[0.65rem]"></i>
                      }
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="text-ink block truncate text-sm font-semibold">{{
                        group.label
                      }}</span>
                      <span class="text-ink-muted block text-xs">{{
                        i18n.t('catalog.groupItems', { n: group.itemCount })
                      }}</span>
                    </span>
                  </button>
                }
              </div>
              @if (groupsReady() && !selectedGroupIds()?.length) {
                <small
                  class="bg-accent-soft text-accent flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                  role="status"
                >
                  <i class="pi pi-exclamation-triangle mt-0.5 text-xs"></i>
                  {{ i18n.t('catalog.noOptionGroupsWarning') }}
                </small>
              }
            </div>
          </section>
        </div>

        <div class="dialog-actions flex justify-end gap-2 md:col-span-2">
          <p-button
            [label]="i18n.t('common.cancel')"
            [text]="true"
            (onClick)="dialogOpen.set(false)"
          />
          <p-button
            type="submit"
            [label]="i18n.t('common.save')"
            icon="pi pi-check"
            [rounded]="true"
            [loading]="saving()"
          />
        </div>
      </form>
    </p-dialog>
  `,
})
export class ProductsPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(CatalogApi);
  private readonly catalog = inject(CatalogStore);
  private readonly confirm = inject(ConfirmService);
  private readonly messages = inject(MessageService);

  protected readonly query = signal<ProductQuery>({
    page: 0,
    size: PAGE_SIZE,
    categoryId: null,
    keyword: '',
    active: null,
  });
  protected readonly products = signal<ProductResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly editingProduct = computed(
    () => this.products().find((product) => product.id === this.editingId()) ?? null,
  );
  protected readonly submitted = signal(false);
  protected readonly groupsReady = signal(true);
  protected readonly palette = fallbackPalette;

  private readonly categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  private readonly groups = toSignal(this.api.optionGroups().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  protected readonly categoryOptions = computed(() =>
    this.categories().map((category) => ({ value: category.id, label: this.i18n.name(category) })),
  );
  protected readonly groupOptions = computed(() =>
    this.groups().map((group) => ({ value: group.id, label: this.i18n.name(group) })),
  );
  protected readonly badgeOptions = computed(() =>
    BADGES.map((value) => ({ value, label: this.i18n.t(`menu.badge.${value}`) })),
  );
  protected readonly filterCategoryOptions = computed(() =>
    this.categories()
      .filter((category) => category.active)
      .map((category) => ({ value: category.id, label: this.i18n.name(category) })),
  );

  protected readonly columns = computed<TableColumn<ProductResponse>[]>(() => [
    { key: 'name', label: this.i18n.t('catalog.name'), custom: true },
    { key: 'category', label: this.i18n.t('catalog.category'), custom: true },
    { key: 'price', label: this.i18n.t('catalog.price'), align: 'right', custom: true },
    { key: 'available', label: this.i18n.t('catalog.available'), align: 'center', custom: true },
    { key: 'active', label: this.i18n.t('common.status'), custom: true },
    { key: 'actions', label: '', align: 'right', width: '7rem', custom: true },
  ]);

  protected readonly form = inject(FormBuilder).group({
    categoryId: [null as number | null, Validators.required],
    name: ['', textField(TEXT_LIMITS.productName, true)],
    nameEn: ['', textField(TEXT_LIMITS.productName)],
    description: ['', textField(TEXT_LIMITS.description)],
    descriptionEn: ['', textField(TEXT_LIMITS.description)],
    price: [
      0 as number | null,
      [Validators.required, Validators.min(0), Validators.max(MAX_PRICE)],
    ],
    originalPrice: [null as number | null],
    imageUrl: [null as string | null],
    badge: [null as ProductBadge | null],
    optionGroupIds: [[] as number[]],
    available: [true],
    recommended: [false],
    active: [true],
  });

  protected readonly statusToggles = [
    {
      control: 'available',
      icon: 'pi pi-box',
      label: 'catalog.available',
      hint: 'catalog.availableHint',
    },
    {
      control: 'recommended',
      icon: 'pi pi-thumbs-up',
      label: 'catalog.recommended',
      hint: 'catalog.recommendedHint',
    },
    {
      control: 'active',
      icon: 'pi pi-eye',
      label: 'status.active.true',
      hint: 'catalog.activeHint',
    },
  ] as const;

  protected readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly discountPercent = computed(() => {
    const { price, originalPrice } = this.formValue();
    if (!originalPrice || price === null || price === undefined || originalPrice <= price) {
      return null;
    }
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  });

  protected readonly groupCards = computed(() => {
    const selected = new Set(this.formValue().optionGroupIds ?? []);
    return this.groups().map((group) => ({
      id: group.id,
      label: this.i18n.name(group),
      itemCount: group.items.length,
      selected: selected.has(group.id),
    }));
  });

  protected readonly selectedGroupIds = toSignal(this.form.controls.optionGroupIds.valueChanges, {
    initialValue: this.form.controls.optionGroupIds.value,
  });

  constructor() {
    this.load();
  }

  protected badgeChipClass(selected: boolean): string {
    return selected
      ? 'border-brand bg-brand text-on-brand shadow-soft'
      : 'border-line text-ink-muted hover:border-brand hover:text-brand';
  }

  protected setBadge(badge: ProductBadge | null): void {
    this.form.controls.badge.setValue(badge);
    this.form.controls.badge.markAsDirty();
  }

  protected toggleGroup(groupId: number): void {
    const control = this.form.controls.optionGroupIds;
    const current = control.value ?? [];
    control.setValue(
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
    control.markAsDirty();
  }

  protected errorFor(field: 'categoryId' | 'name' | 'price'): string | null {
    const control = this.form.controls[field];
    return shouldShowError(control, this.submitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected patch(patch: Partial<ProductQuery>): void {
    this.query.update((query) => ({ ...query, ...patch, page: 0 }));
    this.load();
  }

  protected onPage(event: TablePage): void {
    this.query.update((query) => ({ ...query, page: event.page, size: event.size }));
    this.load();
  }

  protected badgeLabel(badge: ProductBadge): string {
    return this.i18n.t(`menu.badge.${badge}`);
  }

  protected edit(product: ProductResponse | null): void {
    this.editingId.set(product?.id ?? null);
    this.submitted.set(false);
    this.form.reset({
      categoryId: product?.categoryId ?? this.categories()[0]?.id ?? null,
      name: product?.name ?? '',
      nameEn: product?.nameEn ?? '',
      description: product?.description ?? '',
      descriptionEn: product?.descriptionEn ?? '',
      price: product?.price ?? 0,
      originalPrice: product?.originalPrice ?? null,
      imageUrl: product?.imageUrl ?? null,
      badge: product?.badge ?? null,
      optionGroupIds: [],
      available: product?.available ?? true,
      recommended: product?.recommended ?? false,
      active: product?.active ?? true,
    });
    this.groupsReady.set(!product);
    if (product) {
      this.api.adminProduct(product.id).subscribe((detail) => {
        if (this.editingId() !== product.id) {
          return;
        }
        this.form.controls.optionGroupIds.setValue(productOptionGroupIds(detail) ?? []);
        this.groupsReady.set(true);
      });
    }
    this.dialogOpen.set(true);
  }

  protected groupCount(product: ProductResponse): number {
    return productOptionGroupIds(product)?.length ?? 0;
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const request = {
      categoryId: value.categoryId ?? 0,
      name: (value.name ?? '').trim(),
      nameEn: (value.nameEn ?? '').trim(),
      description: value.description ?? '',
      descriptionEn: value.descriptionEn ?? '',
      price: value.price ?? 0,
      originalPrice: value.originalPrice || null,
      imageUrl: value.imageUrl,
      badge: value.badge,
      available: value.available ?? true,
      recommended: value.recommended ?? false,
      active: value.active ?? true,
      sortOrder: this.editingProduct()?.sortOrder ?? 0,
    };
    const id = this.editingId();
    this.saving.set(true);
    const optionGroupBindings = (value.optionGroupIds ?? []).map((optionGroupId, sortOrder) => ({
      optionGroupId,
      sortOrder,
    }));
    (id ? this.api.updateProduct(id, request) : this.api.createProduct(request))
      .pipe(
        switchMap((product) =>
          this.groupsReady()
            ? this.api.setProductOptionGroups(product.id, optionGroupBindings)
            : of(product),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe(() => {
        this.dialogOpen.set(false);
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.afterChange();
      });
  }

  protected toggleAvailability(product: ProductResponse, available: boolean): void {
    this.api.setAvailability(product.id, available).subscribe(() => {
      this.messages.add({
        severity: 'info',
        summary: this.i18n.t(available ? 'catalog.nowAvailable' : 'catalog.nowSoldOut', {
          name: this.i18n.name(product),
        }),
      });
      this.afterChange();
    });
  }

  protected async remove(product: ProductResponse): Promise<void> {
    const ok = await this.confirm.ask({
      message: this.i18n.t('catalog.confirmDelete', { name: this.i18n.name(product) }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.deleteProduct(product.id).subscribe(() => {
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('catalog.deleted', { name: this.i18n.name(product) }),
        });
        this.afterChange();
      });
    }
  }

  private afterChange(): void {
    this.load();
    this.catalog.refresh();
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .products(this.query())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.products.set(response.items);
        this.total.set(response.totalItems);
      });
  }
}
