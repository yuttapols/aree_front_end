import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, TableRowReorderEvent } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { finalize } from 'rxjs';

import { CategoryResponse } from '../../../core/api/models/catalog.model';
import { CatalogApi } from '../../../core/api/services/catalog.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FormField } from '../../../shared/components/form-field/form-field';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { ConfirmService } from '../../../shared/services/confirm.service';
import {
  requiredText,
  shouldShowError,
  textField,
  validationMessage,
} from '../../../shared/utils/validators';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';

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
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TableModule,
    ToggleSwitchModule,
    FormField,
    Panel,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-panel [heading]="i18n.t('catalog.categories')" [subtitle]="i18n.t('catalog.dragHint')">
      <p-button
        panelActions
        [label]="i18n.t('common.add')"
        icon="pi pi-plus"
        [rounded]="true"
        (onClick)="edit(null)"
      />
      <div class="border-line overflow-hidden rounded-2xl border">
        <p-table
          [value]="categories()"
          [loading]="loading()"
          (onRowReorder)="reorder($event)"
          [tableStyle]="{ 'min-width': '40rem' }"
        >
          <ng-template #header>
            <tr>
              <th class="w-12"></th>
              <th>{{ i18n.t('catalog.name') }}</th>
              <th>{{ i18n.t('catalog.slug') }}</th>
              <th class="text-right">{{ i18n.t('catalog.productCount') }}</th>
              <th>{{ i18n.t('common.status') }}</th>
              <th class="w-32"></th>
            </tr>
          </ng-template>
          <ng-template #body let-row let-index="rowIndex">
            <tr [pReorderableRow]="index">
              <td><i class="pi pi-bars text-ink-muted cursor-move" pReorderableRowHandle></i></td>
              <td>
                <span class="flex items-center gap-2">
                  <i [class]="row.icon" class="text-brand"></i>
                  <span class="text-ink font-semibold">{{ i18n.name(row) }}</span>
                </span>
              </td>
              <td class="text-ink-muted">{{ row.slug }}</td>
              <td class="text-right">{{ row.productCount }}</td>
              <td><app-status-tag kind="active" [value]="row.active" /></td>
              <td class="text-right">
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
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </app-panel>

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
      message: this.i18n.t('catalog.confirmDeactivate', { name: this.i18n.name(category) }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.deleteCategory(category.id).subscribe(() => this.afterChange());
    }
  }

  protected reorder(event: TableRowReorderEvent): void {
    if (event.dragIndex === event.dropIndex) {
      return;
    }
    const items = this.categories().map((category, index) => ({
      id: category.id,
      sortOrder: index + 1,
    }));
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
      .subscribe((categories) => this.categories.set(categories));
  }
}
