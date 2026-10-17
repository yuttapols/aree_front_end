import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, TableRowReorderEvent } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { CategoryResponse } from '../../../core/api/models/catalog.model';
import { CatalogApi } from '../../../core/api/services/catalog.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { ApiException } from '../../../core/api/models/common.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { FormField } from '../../../shared/components/form-field/form-field';
import { SectionHero } from '../../../shared/components/section-hero/section-hero';
import { ConfirmService } from '../../../shared/services/confirm.service';
import {
  requiredText,
  shouldShowError,
  textField,
  validationMessage,
} from '../../../shared/utils/validators';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';

function activeFirst(categories: CategoryResponse[]): CategoryResponse[] {
  return [...categories].sort(
    (left, right) => Number(right.active) - Number(left.active) || left.sortOrder - right.sortOrder,
  );
}

const ICONS = [
  'pi pi-heart',
  'pi pi-star',
  'pi pi-sun',
  'pi pi-bolt',
  'pi pi-box',
  'pi pi-gift',
  'pi pi-filter',
];

@Component({
  selector: 'app-categories-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TableModule,
    ToggleSwitchModule,
    TooltipModule,
    EmptyState,
    FormField,
    SectionHero,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-hero
      class="mb-5"
      icon="pi pi-th-large"
      [heading]="i18n.t('catalog.categories')"
      [subtitle]="i18n.t('catalog.categoriesHint')"
    >
      <p-button
        [label]="i18n.t('catalog.newCategory')"
        icon="pi pi-plus"
        [rounded]="true"
        (onClick)="edit(null)"
      />
    </app-section-hero>

    <div class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      @for (stat of stats(); track stat.labelKey) {
        <div
          class="bg-card border-line shadow-soft flex items-center gap-3 rounded-2xl border px-4 py-3"
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" [class]="stat.tone">
            <i [class]="stat.icon"></i>
          </span>
          <span class="min-w-0">
            <span class="text-ink-muted block truncate text-xs">{{ i18n.t(stat.labelKey) }}</span>
            <span class="font-display text-ink block text-xl font-bold tabular-nums">{{
              stat.value ?? '–'
            }}</span>
          </span>
        </div>
      }
    </div>

    <div class="bg-card border-line shadow-soft overflow-hidden rounded-3xl border">
      <div class="border-line flex items-center gap-2 border-b px-5 py-3">
        <i class="pi pi-arrows-v text-brand text-xs"></i>
        <span class="text-ink-muted text-xs">{{ i18n.t('catalog.dragHint') }}</span>
      </div>
      <p-table
        [value]="categories()"
        [loading]="loading()"
        (onRowReorder)="reorder($event)"
        [tableStyle]="{ 'min-width': '48rem' }"
      >
        <ng-template #header>
          <tr>
            <th class="w-24"></th>
            <th>{{ i18n.t('catalog.name') }}</th>
            <th>{{ i18n.t('catalog.slug') }}</th>
            <th class="text-center">{{ i18n.t('catalog.productCount') }}</th>
            <th>{{ i18n.t('common.status') }}</th>
            <th class="w-28"></th>
          </tr>
        </ng-template>
        <ng-template #body let-row let-index="rowIndex">
          <tr [pReorderableRow]="index" class="group">
            <td>
              <span class="flex items-center gap-2">
                <span
                  class="text-ink-muted hover:bg-brand-soft hover:text-brand grid h-8 w-8 cursor-grab place-items-center rounded-full transition active:cursor-grabbing"
                  pReorderableRowHandle
                  [attr.aria-label]="i18n.t('catalog.dragHint')"
                >
                  <i class="pi pi-bars text-xs"></i>
                </span>
                <span class="text-ink-muted w-5 text-center text-xs font-bold tabular-nums">{{
                  index + 1
                }}</span>
              </span>
            </td>
            <td>
              <span class="flex items-center gap-3" [class.opacity-60]="!row.active">
                <span
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                  [class]="row.active ? 'bg-royal text-white' : 'bg-card-muted text-ink-muted'"
                >
                  <i [class]="iconClass(row.icon)"></i>
                </span>
                <span class="min-w-0">
                  <span class="text-ink block truncate text-[0.95rem] font-bold">{{
                    i18n.name(row)
                  }}</span>
                  @if (row.description) {
                    <span class="text-ink-muted block max-w-sm truncate text-xs">{{
                      row.description
                    }}</span>
                  }
                </span>
              </span>
            </td>
            <td>
              <span
                class="border-line text-ink-muted inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs"
              >
                <i class="pi pi-link text-[0.6rem]"></i>{{ row.slug }}
              </span>
            </td>
            <td class="text-center">
              @if (countOf(row); as count) {
                <span
                  class="bg-accent-soft text-accent inline-flex min-w-16 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums"
                >
                  <i class="pi pi-box text-[0.6rem]"></i>
                  {{ i18n.t('catalog.productCountShort', { n: count }) }}
                </span>
              } @else if (countOf(row) === 0) {
                <span
                  class="bg-card-muted text-ink-muted inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 text-xs"
                  >{{ i18n.t('catalog.productCountShort', { n: 0 }) }}</span
                >
              } @else {
                <i class="pi pi-spin pi-spinner text-ink-muted text-xs"></i>
              }
            </td>
            <td>
              <label class="text-ink inline-flex items-center gap-2 text-xs font-semibold">
                <p-toggleswitch
                  [ngModel]="row.active"
                  [ngModelOptions]="{ standalone: true }"
                  [disabled]="toggling() === row.id"
                  [ariaLabel]="i18n.t('status.active.true')"
                  (ngModelChange)="setActive(row, $event)"
                />
                <span
                  [class]="row.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-muted'"
                >
                  {{ i18n.t(row.active ? 'status.active.true' : 'status.active.false') }}
                </span>
              </label>
            </td>
            <td class="text-right">
              <span
                class="inline-flex items-center opacity-70 transition-opacity group-hover:opacity-100"
              >
                <p-button
                  icon="pi pi-pencil"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('common.edit')"
                  (onClick)="edit(row)"
                />
                <span
                  class="inline-block"
                  [pTooltip]="
                    (countOf(row) ?? 0) > 0 ? i18n.t('catalog.categoryHasProducts') : undefined
                  "
                  tooltipPosition="left"
                >
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [rounded]="true"
                    [disabled]="(countOf(row) ?? 0) > 0"
                    [ariaLabel]="i18n.t('common.delete')"
                    (onClick)="remove(row)"
                  />
                </span>
              </span>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="6">
              <app-empty-state icon="pi pi-th-large" [title]="i18n.t('catalog.noCategories')" />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="dialogOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t(editingId() ? 'catalog.editCategory' : 'catalog.newCategory')"
      [style]="{ width: '32rem' }"
      [breakpoints]="{ '640px': '96vw' }"
    >
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <app-form-field
          inputId="cat-name"
          [label]="i18n.t('catalog.nameTh') + ' *'"
          [error]="errorFor('name')"
        >
          <input
            pInputText
            id="cat-name"
            formControlName="name"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="cat-name-en" [label]="i18n.t('catalog.nameEn')">
          <input
            pInputText
            id="cat-name-en"
            formControlName="nameEn"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="cat-slug"
          [label]="i18n.t('catalog.slug') + ' *'"
          [error]="errorFor('slug')"
          [hint]="i18n.t('catalog.slugHint')"
        >
          <input
            pInputText
            id="cat-slug"
            formControlName="slug"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="cat-desc" [label]="i18n.t('catalog.description')">
          <input
            pInputText
            id="cat-desc"
            formControlName="description"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <div class="sm:col-span-2">
          <p class="text-ink mb-2 text-sm font-semibold">{{ i18n.t('catalog.icon') }}</p>
          <div class="flex flex-wrap gap-2">
            @for (icon of icons; track icon) {
              <button
                type="button"
                class="grid h-10 w-10 place-items-center rounded-xl border transition"
                [class]="
                  form.controls.icon.value === icon
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line text-ink-muted'
                "
                (click)="form.controls.icon.setValue(icon)"
              >
                <i [class]="icon"></i>
              </button>
            }
          </div>
        </div>
        <label class="text-ink flex items-center gap-3 text-sm sm:col-span-2">
          <p-toggleswitch formControlName="active" /> {{ i18n.t('status.active.true') }}
        </label>
        <div class="dialog-actions flex justify-end gap-2 sm:col-span-2">
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
export class CategoriesPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(CatalogApi);
  private readonly catalog = inject(CatalogStore);
  private readonly confirm = inject(ConfirmService);
  private readonly messages = inject(MessageService);

  protected readonly icons = ICONS;
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly submitted = signal(false);
  protected readonly toggling = signal<number | null>(null);
  private readonly counts = signal<Record<number, number | null>>({});

  protected readonly stats = computed(() => {
    const categories = this.categories();
    const counts = categories.map((category) => this.countOf(category));
    const known = counts.every((count) => count !== null);
    const activeCount = categories.filter((category) => category.active).length;
    return [
      {
        labelKey: 'catalog.statTotal' as const,
        icon: 'pi pi-th-large',
        tone: 'bg-brand-soft text-brand',
        value: categories.length,
      },
      {
        labelKey: 'catalog.statActive' as const,
        icon: 'pi pi-eye',
        tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        value: activeCount,
      },
      {
        labelKey: 'catalog.statInactive' as const,
        icon: 'pi pi-eye-slash',
        tone: 'bg-card-muted text-ink-muted',
        value: categories.length - activeCount,
      },
      {
        labelKey: 'catalog.statProducts' as const,
        icon: 'pi pi-box',
        tone: 'bg-accent-soft text-accent',
        value: known ? counts.reduce<number>((total, count) => total + (count ?? 0), 0) : null,
      },
    ];
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', textField(TEXT_LIMITS.categoryName, true)],
    nameEn: ['', textField(TEXT_LIMITS.categoryName)],
    slug: [
      '',
      [
        Validators.required,
        Validators.maxLength(TEXT_LIMITS.code * 2),
        Validators.pattern(/^[a-z0-9-]+$/),
      ],
    ],
    description: ['', textField(TEXT_LIMITS.description)],
    icon: ['pi pi-star'],
    active: [true],
  });

  constructor() {
    this.load();
  }

  protected errorFor(field: 'name' | 'slug'): string | null {
    const control = this.form.controls[field];
    if (!shouldShowError(control, this.submitted())) {
      return null;
    }
    return control.hasError('pattern')
      ? this.i18n.t('catalog.slugHint')
      : validationMessage(control, this.i18n);
  }

  protected edit(category: CategoryResponse | null): void {
    this.editingId.set(category?.id ?? null);
    this.submitted.set(false);
    this.form.reset({
      name: category?.name ?? '',
      nameEn: category?.nameEn ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? 'pi pi-star',
      active: category?.active ?? true,
    });
    this.dialogOpen.set(true);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const id = this.editingId();
    const request = this.form.getRawValue();
    this.saving.set(true);
    (id ? this.api.updateCategory(id, request) : this.api.createCategory(request))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.dialogOpen.set(false);
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.afterChange();
      });
  }

  protected async remove(category: CategoryResponse): Promise<void> {
    const ok = await this.confirm.ask({
      message: this.i18n.t('catalog.confirmDelete', { name: this.i18n.name(category) }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (!ok) {
      return;
    }
    this.api.deleteCategory(category.id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('catalog.deleted', { name: this.i18n.name(category) }),
        });
        this.afterChange();
      },
      error: (error: unknown) =>
        this.messages.add({
          severity: 'error',
          summary:
            error instanceof ApiException && error.message
              ? error.message
              : this.i18n.error(error instanceof ApiException ? error.code : 'INTERNAL_ERROR'),
        }),
    });
  }

  protected countOf(category: CategoryResponse): number | null {
    return category.productCount ?? this.counts()[category.id] ?? null;
  }

  protected iconClass(icon: string | null | undefined): string {
    if (!icon) {
      return 'pi pi-tag';
    }
    return icon.includes('pi-') ? icon : `pi pi-${icon}`;
  }

  protected setActive(category: CategoryResponse, active: boolean): void {
    this.toggling.set(category.id);
    this.api
      .updateCategory(category.id, {
        name: category.name,
        nameEn: category.nameEn ?? '',
        slug: category.slug,
        description: category.description ?? '',
        icon: category.icon,
        active,
      })
      .pipe(finalize(() => this.toggling.set(null)))
      .subscribe({
        next: () => {
          this.categories.update((rows) =>
            activeFirst(rows.map((row) => (row.id === category.id ? { ...row, active } : row))),
          );
          this.messages.add({
            severity: 'success',
            summary: this.i18n.t(active ? 'catalog.nowActive' : 'catalog.nowInactive', {
              name: this.i18n.name(category),
            }),
          });
          this.catalog.refresh();
        },
        error: () => this.categories.update((rows) => rows.map((row) => ({ ...row }))),
      });
  }

  private loadCounts(categories: CategoryResponse[]): void {
    const missing = categories.filter((category) => category.productCount === undefined);
    if (!missing.length) {
      return;
    }
    forkJoin(
      missing.map((category) =>
        this.api
          .products({ page: 0, size: 1, categoryId: category.id, keyword: '', active: null })
          .pipe(
            map((page) => [category.id, page.totalItems] as const),
            catchError(() => of([category.id, null] as const)),
          ),
      ),
    ).subscribe((entries) => this.counts.set(Object.fromEntries(entries)));
  }

  protected reorder(event: TableRowReorderEvent): void {
    if (event.dragIndex === event.dropIndex) {
      return;
    }
    const items = this.categories().map((category, index) => ({
      id: category.id,
      sortOrder: index + 1,
    }));
    this.categories.set(
      activeFirst(
        this.categories().map((category, index) => ({ ...category, sortOrder: index + 1 })),
      ),
    );
    this.api.sortCategories(items).subscribe(() => {
      this.messages.add({ severity: 'success', summary: this.i18n.t('catalog.reordered') });
      this.catalog.refresh();
    });
  }

  private afterChange(): void {
    this.load();
    this.catalog.refresh();
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .categories()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((categories) => {
        this.categories.set(activeFirst(categories));
        this.loadCounts(categories);
      });
  }
}
