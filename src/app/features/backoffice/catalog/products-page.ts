import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
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
import { fallbackPalette } from '../../../core/catalog/catalog.mapper';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  DataTable,
  TableColumn,
  TablePage,
} from '../../../shared/components/data-table/data-table';
import { FoodPlate } from '../../../shared/components/food-plate/food-plate';
import { FormField } from '../../../shared/components/form-field/form-field';
import { ImageUpload } from '../../../shared/components/image-upload/image-upload';
import { Panel } from '../../../shared/components/panel/panel';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { formatMoney } from '../../../shared/utils/format';
import {
  productCode,
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
    MultiSelectModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    DataTable,
    FoodPlate,
    FormField,
    ImageUpload,
    Panel,
    SearchBox,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-panel
      [heading]="i18n.t('catalog.products')"
      [subtitle]="i18n.t('catalog.productTotal', { n: total() })"
    >
      <p-button
        panelActions
        [label]="i18n.t('common.add')"
        icon="pi pi-plus"
        [rounded]="true"
        (onClick)="edit(null)"
      />
      <div class="mb-4 grid gap-3 md:grid-cols-3">
        <app-search-box
          [placeholder]="i18n.t('catalog.searchProduct')"
          [clearLabel]="i18n.t('search.clear')"
          (search)="patch({ keyword: $event })"
        />
        <p-select
          [options]="categoryOptions()"
          optionLabel="label"
          optionValue="value"
          [showClear]="true"
          [fluid]="true"
          [placeholder]="i18n.t('catalog.category')"
          [ngModel]="query().categoryId"
          (ngModelChange)="patch({ categoryId: $event })"
        />
        <p-select
          [options]="activeOptions()"
          optionLabel="label"
          optionValue="value"
          [showClear]="true"
          [fluid]="true"
          [placeholder]="i18n.t('common.status')"
          [ngModel]="query().active"
          (ngModelChange)="patch({ active: $event })"
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
        minWidth="56rem"
        (pageChange)="onPage($event)"
      >
        <ng-template #cell let-row let-column="column">
          @switch (column.key) {
            @case ('name') {
              <span class="flex items-center gap-3">
                <span class="bg-card-muted h-11 w-11 shrink-0 overflow-hidden rounded-xl p-1">
                  @if (row.imageUrl) {
                    <img
                      [src]="row.imageUrl"
                      alt=""
                      class="h-full w-full rounded-lg object-cover"
                    />
                  } @else {
                    <app-food-plate [palette]="row.palette ?? palette(row.id)" />
                  }
                </span>
                <span class="min-w-0">
                  <span class="text-ink block truncate font-semibold">{{ i18n.name(row) }}</span>
                  <span class="text-ink-muted block text-xs">{{ row.code }}</span>
                </span>
              </span>
            }
            @case ('available') {
              <p-toggleswitch
                [ngModel]="row.available"
                [disabled]="!row.active"
                (ngModelChange)="toggleAvailability(row, $event)"
              />
            }
            @case ('active') {
              <app-status-tag kind="active" [value]="row.active" />
            }
            @case ('actions') {
              <p-button
                icon="pi pi-pencil"
                [text]="true"
                [rounded]="true"
                [ariaLabel]="i18n.t('common.edit')"
                (onClick)="edit(row)"
              />
              @if (row.active) {
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('common.delete')"
                  (onClick)="remove(row)"
                />
              }
            }
          }
        </ng-template>
      </app-data-table>
    </app-panel>

    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="dialogOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t(editingId() ? 'catalog.editProduct' : 'catalog.newProduct')"
      [style]="{ width: '46rem' }"
      [breakpoints]="{ '768px': '96vw' }"
    >
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="sm:col-span-2">
          <app-image-upload
            [url]="form.controls.imageUrl.value"
            (urlChange)="form.controls.imageUrl.setValue($event)"
          />
        </div>
        <app-form-field
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
          inputId="p-code"
          [label]="i18n.t('catalog.code') + ' *'"
          [error]="errorFor('code')"
        >
          <input
            pInputText
            id="p-code"
            formControlName="code"
            class="rounded-xl uppercase"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="p-name"
          [label]="i18n.t('catalog.nameTh') + ' *'"
          [error]="errorFor('name')"
        >
          <input pInputText id="p-name" formControlName="name" class="rounded-xl" [fluid]="true" />
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
            class="w-full rounded-xl"
          ></textarea>
        </app-form-field>
        <app-form-field inputId="p-desc-en" [label]="i18n.t('catalog.descriptionEn')">
          <textarea
            pTextarea
            id="p-desc-en"
            formControlName="descriptionEn"
            rows="2"
            class="w-full rounded-xl"
          ></textarea>
        </app-form-field>
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
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="p-badge" [label]="i18n.t('catalog.badge')">
          <p-select
            inputId="p-badge"
            formControlName="badge"
            [options]="badgeOptions()"
            optionLabel="label"
            optionValue="value"
            [showClear]="true"
            [fluid]="true"
            [placeholder]="i18n.t('common.none')"
          />
        </app-form-field>
        <app-form-field inputId="p-groups" [label]="i18n.t('catalog.optionGroups')">
          <p-multiselect
            inputId="p-groups"
            formControlName="optionGroupIds"
            [options]="groupOptions()"
            optionLabel="label"
            optionValue="value"
            display="chip"
            [fluid]="true"
            [placeholder]="i18n.t('common.none')"
          />
          @if (!selectedGroupIds()?.length) {
            <small
              class="bg-accent-soft text-accent mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
              role="status"
            >
              <i class="pi pi-exclamation-triangle mt-0.5 text-xs"></i>
              {{ i18n.t('catalog.noOptionGroupsWarning') }}
            </small>
          }
        </app-form-field>
        <div class="flex flex-wrap gap-5 sm:col-span-2">
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="available" />{{ i18n.t('catalog.available') }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="recommended" />{{
              i18n.t('catalog.recommended')
            }}</label
          >
          <label class="text-ink flex items-center gap-2 text-sm"
            ><p-toggleswitch formControlName="active" />{{ i18n.t('status.active.true') }}</label
          >
        </div>
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
  protected readonly activeOptions = computed(() => [
    { value: true, label: this.i18n.t('status.active.true') },
    { value: false, label: this.i18n.t('status.active.false') },
  ]);

  protected readonly columns = computed<TableColumn<ProductResponse>[]>(() => [
    { key: 'name', label: this.i18n.t('catalog.name'), custom: true },
    { key: 'categoryName', label: this.i18n.t('catalog.category') },
    {
      key: 'price',
      label: this.i18n.t('catalog.price'),
      align: 'right',
      value: (row) => formatMoney(row.price, false),
    },
    { key: 'available', label: this.i18n.t('catalog.available'), align: 'center', custom: true },
    { key: 'active', label: this.i18n.t('common.status'), custom: true },
    { key: 'actions', label: '', align: 'right', width: '7rem', custom: true },
  ]);

  protected readonly form = inject(FormBuilder).group({
    categoryId: [null as number | null, Validators.required],
    code: ['', [requiredText, Validators.maxLength(TEXT_LIMITS.code), productCode]],
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

  protected readonly selectedGroupIds = toSignal(this.form.controls.optionGroupIds.valueChanges, {
    initialValue: this.form.controls.optionGroupIds.value,
  });

  constructor() {
    this.load();
  }

  protected errorFor(field: 'categoryId' | 'code' | 'name' | 'price'): string | null {
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

  protected edit(product: ProductResponse | null): void {
    this.editingId.set(product?.id ?? null);
    this.submitted.set(false);
    this.form.reset({
      categoryId: product?.categoryId ?? this.categories()[0]?.id ?? null,
      code: product?.code ?? '',
      name: product?.name ?? '',
      nameEn: product?.nameEn ?? '',
      description: product?.description ?? '',
      descriptionEn: product?.descriptionEn ?? '',
      price: product?.price ?? 0,
      originalPrice: product?.originalPrice ?? null,
      imageUrl: product?.imageUrl ?? null,
      badge: product?.badge ?? null,
      optionGroupIds: product?.optionGroupIds ?? [],
      available: product?.available ?? true,
      recommended: product?.recommended ?? false,
      active: product?.active ?? true,
    });
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
      categoryId: value.categoryId ?? 0,
      code: (value.code ?? '').trim().toUpperCase(),
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
        switchMap((product) => this.api.setProductOptionGroups(product.id, optionGroupBindings)),
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
      message: this.i18n.t('catalog.confirmDeactivate', { name: this.i18n.name(product) }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.deleteProduct(product.id).subscribe(() => this.afterChange());
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
