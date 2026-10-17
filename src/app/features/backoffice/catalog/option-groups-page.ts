import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { looksSelectedByDefault } from '../../../core/catalog/catalog.mapper';
import { finalize } from 'rxjs';

import {
  OptionGroupResponse,
  OptionGroupUpsertRequest,
} from '../../../core/api/models/catalog.model';
import { CatalogApi } from '../../../core/api/services/catalog.api';
import { CatalogStore } from '../../../core/catalog/catalog.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { Panel } from '../../../shared/components/panel/panel';
import { SectionHero } from '../../../shared/components/section-hero/section-hero';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { formatMoney } from '../../../shared/utils/format';
import { cleanText, TEXT_LIMITS } from '../../../shared/utils/sanitize';

interface GroupDraft extends OptionGroupUpsertRequest {
  id: number | null;
  key: string;
}

function toDraft(group: OptionGroupResponse): GroupDraft {
  return {
    id: group.id,
    key: `group-${group.id}`,
    name: group.name,
    nameEn: group.nameEn,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    defaultSelected: !!group.defaultSelected || looksSelectedByDefault(group),
    active: group.active,
    sortOrder: group.sortOrder,
    items: group.items.map((item) => ({
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      extraPrice: item.extraPrice,
      available: item.available,
      sortOrder: item.sortOrder,
    })),
  };
}

@Component({
  selector: 'app-option-groups-page',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    ToggleSwitchModule,
    EmptyState,
    LoadingSkeleton,
    Panel,
    SectionHero,
    StatusTag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section-hero
      class="mb-6"
      icon="pi pi-list-check"
      [heading]="i18n.t('catalog.optionGroups')"
      [subtitle]="i18n.t('catalog.optionGroupsHint')"
      [badge]="loading() ? null : i18n.t('catalog.groupCount', { n: savedGroups().length })"
    >
      <p-button
        [label]="i18n.t('catalog.newGroup')"
        icon="pi pi-plus"
        [rounded]="true"
        (onClick)="addGroup()"
      />
    </app-section-hero>

    @if (loading() && !drafts().length) {
      <app-loading-skeleton variant="table" [count]="5" />
    } @else if (!savedGroups().length) {
      <app-panel>
        <app-empty-state icon="pi pi-list-check" [title]="i18n.t('catalog.noGroups')">
          <p-button
            [label]="i18n.t('catalog.newGroup')"
            icon="pi pi-plus"
            [rounded]="true"
            (onClick)="addGroup()"
          />
        </app-empty-state>
      </app-panel>
    } @else {
      <div class="bg-card border-line shadow-soft overflow-hidden rounded-3xl border">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[52rem] text-sm">
            <thead class="bg-card-muted text-ink-muted text-xs">
              <tr>
                <th class="px-5 py-3 text-left font-semibold">{{ i18n.t('catalog.name') }}</th>
                <th class="px-3 py-3 text-left font-semibold">{{ i18n.t('catalog.rules') }}</th>
                <th class="px-3 py-3 text-right font-semibold">
                  {{ i18n.t('catalog.itemsLabel') }}
                </th>
                <th class="px-3 py-3 text-right font-semibold">
                  {{ i18n.t('catalog.available') }}
                </th>
                <th class="px-3 py-3 text-right font-semibold">
                  {{ i18n.t('catalog.priceRange') }}
                </th>
                <th class="px-3 py-3 text-left font-semibold">{{ i18n.t('common.status') }}</th>
                <th class="w-44 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (group of savedGroups(); track group.key) {
                <tr
                  class="border-line hover:bg-brand-soft/40 cursor-pointer border-t transition"
                  [class.opacity-70]="!group.active"
                  (click)="open(group)"
                >
                  <td class="px-5 py-3">
                    <span class="flex items-center gap-3">
                      <span
                        class="bg-brand-soft text-brand grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                      >
                        <i class="pi pi-list-check"></i>
                      </span>
                      <span class="min-w-0">
                        <span class="text-ink block truncate font-semibold">{{ group.name }}</span>
                        @if (group.nameEn) {
                          <span class="text-ink-muted block truncate text-xs">{{
                            group.nameEn
                          }}</span>
                        }
                      </span>
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <span class="flex flex-wrap gap-1.5">
                      <span
                        class="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
                        [class]="
                          group.minSelect > 0
                            ? 'bg-accent-soft text-accent'
                            : 'bg-card-muted text-ink-muted'
                        "
                        >{{
                          i18n.t(group.minSelect > 0 ? 'catalog.required' : 'catalog.optional')
                        }}</span
                      >
                      <span
                        class="bg-brand-soft text-brand rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
                        >{{
                          i18n.t('catalog.selectRange', {
                            min: group.minSelect,
                            max: group.maxSelect,
                          })
                        }}</span
                      >
                    </span>
                  </td>
                  <td class="text-ink px-3 py-3 text-right font-semibold tabular-nums">
                    {{ group.items.length }}
                  </td>
                  <td
                    class="px-3 py-3 text-right font-semibold text-emerald-600 tabular-nums dark:text-emerald-400"
                  >
                    {{ availableCount(group) }}
                  </td>
                  <td class="text-accent px-3 py-3 text-right font-semibold tabular-nums">
                    {{ priceRange(group) }}
                  </td>
                  <td class="px-3 py-3"><app-status-tag kind="active" [value]="group.active" /></td>
                  <td class="px-5 py-3 text-right" (click)="$event.stopPropagation()">
                    <span class="inline-flex items-center gap-1">
                      <p-button
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        [text]="true"
                        [rounded]="true"
                        [ariaLabel]="i18n.t('common.delete')"
                        (onClick)="remove(group)"
                      />
                      <p-button
                        [label]="i18n.t('catalog.viewDetail')"
                        icon="pi pi-angle-right"
                        iconPos="right"
                        size="small"
                        [rounded]="true"
                        [outlined]="true"
                        (onClick)="open(group)"
                      />
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <p-dialog
      [visible]="selected() !== null"
      (visibleChange)="!$event && close()"
      [modal]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      [showHeader]="false"
      [style]="{ width: '46rem' }"
      [breakpoints]="{ '768px': '96vw' }"
      contentStyleClass="!p-0"
    >
      @if (selected(); as group) {
        <article
          class="bg-card flex flex-col overflow-hidden rounded-3xl"
          [class.opacity-80]="!group.active"
        >
          <header class="bg-royal relative overflow-hidden px-5 pt-5 pb-6 text-white md:px-6">
            <span
              class="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/10"
              aria-hidden="true"
            ></span>
            <span
              class="bg-accent/30 pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full blur-2xl"
              aria-hidden="true"
            ></span>
            <div class="relative flex items-start justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2">
                @if (!group.id) {
                  <span
                    class="bg-accent rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase"
                    >{{ i18n.t('catalog.newBadge') }}</span
                  >
                }
                <span
                  class="rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold"
                  [class]="group.minSelect > 0 ? 'bg-accent text-white' : 'bg-white/15 text-white'"
                >
                  <i
                    class="pi text-[0.6rem]"
                    [class]="group.minSelect > 0 ? 'pi-asterisk' : 'pi-circle'"
                  ></i>
                  {{ i18n.t(group.minSelect > 0 ? 'catalog.required' : 'catalog.optional') }}
                </span>
                <span class="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.7rem] font-semibold">
                  {{
                    i18n.t('catalog.selectRange', { min: group.minSelect, max: group.maxSelect })
                  }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <label
                  class="flex shrink-0 items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-1 text-xs font-semibold backdrop-blur"
                >
                  <p-toggleswitch [(ngModel)]="group.active" />
                  {{ i18n.t(group.active ? 'status.active.true' : 'status.active.false') }}
                </label>
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
                  [attr.aria-label]="i18n.t('common.close')"
                  (click)="close()"
                >
                  <i class="pi pi-times text-xs"></i>
                </button>
              </div>
            </div>
            <input
              class="font-display relative mt-3 w-full border-0 border-b-2 border-transparent bg-transparent text-2xl font-extrabold text-white outline-none placeholder:text-white/50 focus:border-white/60"
              [placeholder]="i18n.t('catalog.nameTh')"
              [attr.aria-label]="i18n.t('catalog.nameTh')"
              [maxLength]="nameLimit"
              [(ngModel)]="group.name"
            />
            <input
              class="relative mt-1 w-full border-0 border-b border-transparent bg-transparent text-sm text-white/80 outline-none placeholder:text-white/40 focus:border-white/50"
              [placeholder]="i18n.t('catalog.nameEn')"
              [attr.aria-label]="i18n.t('catalog.nameEn')"
              [maxLength]="nameLimit"
              [(ngModel)]="group.nameEn"
            />
          </header>

          <div class="-mt-4 grid grid-cols-3 gap-3 px-5 md:px-6">
            <div class="bg-card border-line shadow-soft relative rounded-2xl border px-3 py-2.5">
              <p class="text-ink-muted text-[0.7rem]">{{ i18n.t('catalog.itemsLabel') }}</p>
              <p class="font-display text-ink text-xl font-bold tabular-nums">
                {{ group.items.length }}
              </p>
            </div>
            <div class="bg-card border-line shadow-soft relative rounded-2xl border px-3 py-2.5">
              <p class="text-ink-muted text-[0.7rem]">{{ i18n.t('catalog.available') }}</p>
              <p
                class="font-display text-xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400"
              >
                {{ availableCount(group) }}
              </p>
            </div>
            <div class="bg-card border-line shadow-soft relative rounded-2xl border px-3 py-2.5">
              <p class="text-ink-muted text-[0.7rem]">{{ i18n.t('catalog.priceRange') }}</p>
              <p class="font-display text-accent truncate text-xl font-bold tabular-nums">
                {{ priceRange(group) }}
              </p>
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-5 p-5 md:p-6">
            <section>
              <h3 class="text-ink mb-2 flex items-center gap-2 text-sm font-semibold">
                <i class="pi pi-sliders-h text-brand"></i>{{ i18n.t('catalog.rules') }}
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <label class="bg-card-muted rounded-2xl px-3 pt-2 pb-3">
                  <span class="text-ink-muted mb-1 block text-xs">{{
                    i18n.t('catalog.minSelect')
                  }}</span>
                  <p-inputnumber
                    [(ngModel)]="group.minSelect"
                    [min]="0"
                    [max]="group.maxSelect"
                    [showButtons]="true"
                    buttonLayout="horizontal"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                    inputStyleClass="text-center font-bold"
                    size="small"
                    [fluid]="true"
                  />
                </label>
                <label class="bg-card-muted rounded-2xl px-3 pt-2 pb-3">
                  <span class="text-ink-muted mb-1 block text-xs">{{
                    i18n.t('catalog.maxSelect')
                  }}</span>
                  <p-inputnumber
                    [(ngModel)]="group.maxSelect"
                    [min]="1"
                    [showButtons]="true"
                    buttonLayout="horizontal"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                    inputStyleClass="text-center font-bold"
                    size="small"
                    [fluid]="true"
                  />
                </label>
              </div>
              <label
                class="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition"
                [class]="
                  group.defaultSelected
                    ? 'border-brand bg-brand-soft'
                    : 'border-line bg-card-muted hover:border-brand/40'
                "
              >
                <p-toggleswitch [(ngModel)]="group.defaultSelected" />
                <span class="min-w-0">
                  <span class="text-ink block text-sm font-bold">{{
                    i18n.t('catalog.defaultSelected')
                  }}</span>
                  <span class="text-ink-muted block text-xs">{{
                    i18n.t('catalog.defaultSelectedHint')
                  }}</span>
                </span>
              </label>
            </section>

            <section>
              <h3
                class="text-ink mb-2 flex items-center justify-between gap-2 text-sm font-semibold"
              >
                <span class="flex items-center gap-2">
                  <i class="pi pi-list text-brand"></i>{{ i18n.t('catalog.itemsHeading') }}
                </span>
                <span class="text-ink-muted text-xs font-normal">
                  {{ i18n.t('catalog.extraPrice') }} · {{ i18n.t('catalog.available') }}
                </span>
              </h3>
              <ul class="flex flex-col gap-2">
                @for (item of group.items; track $index; let index = $index) {
                  <li
                    class="border-line hover:border-brand/40 group/item flex items-center gap-3 rounded-2xl border px-3 py-2 transition"
                    [class.bg-card-muted]="!item.available"
                  >
                    <span
                      class="bg-brand-soft text-brand grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                      >{{ index + 1 }}</span
                    >
                    <div class="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-2">
                      <input
                        pInputText
                        pSize="small"
                        class="w-full rounded-lg font-semibold"
                        [class.line-through]="!item.available"
                        [placeholder]="i18n.t('catalog.nameTh')"
                        [attr.aria-label]="i18n.t('catalog.nameTh')"
                        [maxLength]="nameLimit"
                        [(ngModel)]="item.name"
                      />
                      <input
                        pInputText
                        pSize="small"
                        class="w-full rounded-lg"
                        [placeholder]="i18n.t('catalog.nameEn')"
                        [attr.aria-label]="i18n.t('catalog.nameEn')"
                        [maxLength]="nameLimit"
                        [(ngModel)]="item.nameEn"
                      />
                    </div>
                    <p-inputnumber
                      prefix="+฿"
                      inputStyleClass="w-20 text-right font-semibold"
                      [min]="0"
                      size="small"
                      [ariaLabel]="i18n.t('catalog.extraPrice')"
                      [(ngModel)]="item.extraPrice"
                    />
                    <p-toggleswitch
                      [ariaLabel]="i18n.t('catalog.available')"
                      [(ngModel)]="item.available"
                    />
                    <p-button
                      icon="pi pi-times"
                      severity="danger"
                      [text]="true"
                      [rounded]="true"
                      size="small"
                      styleClass="opacity-60 group-hover/item:opacity-100"
                      [ariaLabel]="i18n.t('common.remove')"
                      (onClick)="removeItem(group, index)"
                    />
                  </li>
                } @empty {
                  <li class="text-ink-muted rounded-2xl py-4 text-center text-sm">
                    {{ i18n.t('catalog.noItems') }}
                  </li>
                }
              </ul>
              <button
                type="button"
                class="border-line text-brand hover:border-brand hover:bg-brand-soft mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-2.5 text-sm font-semibold transition"
                (click)="addItem(group)"
              >
                <i class="pi pi-plus text-xs"></i>{{ i18n.t('catalog.addItem') }}
              </button>
            </section>
          </div>

          <footer
            class="border-line bg-card-muted flex items-center justify-between gap-2 border-t px-5 py-3 md:px-6"
          >
            <p-button
              [label]="i18n.t('common.delete')"
              icon="pi pi-trash"
              severity="danger"
              size="small"
              [text]="true"
              [rounded]="true"
              (onClick)="remove(group)"
            />
            <p-button
              [label]="i18n.t('common.save')"
              icon="pi pi-check"
              [rounded]="true"
              [loading]="saving() === group.key"
              (onClick)="save(group)"
            />
          </footer>
        </article>
      }
    </p-dialog>
  `,
})
export class OptionGroupsPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(CatalogApi);
  private readonly catalog = inject(CatalogStore);
  private readonly confirm = inject(ConfirmService);
  private readonly messages = inject(MessageService);

  protected readonly drafts = signal<GroupDraft[]>([]);
  protected readonly openKey = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.drafts().find((draft) => draft.key === this.openKey()) ?? null,
  );
  protected readonly savedGroups = computed(() =>
    this.drafts().filter((draft) => draft.id !== null),
  );
  protected readonly nameLimit = TEXT_LIMITS.categoryName;
  protected readonly loading = signal(false);
  protected readonly saving = signal<string | null>(null);
  private newCounter = 0;

  constructor() {
    this.load();
  }

  protected addGroup(): void {
    this.newCounter += 1;
    this.drafts.update((drafts) => [
      {
        id: null,
        key: `new-${this.newCounter}`,
        name: '',
        nameEn: '',
        minSelect: 0,
        maxSelect: 1,
        defaultSelected: false,
        active: true,
        sortOrder: this.nextGroupSortOrder(),
        items: [{ id: null, name: '', nameEn: '', extraPrice: 0, available: true, sortOrder: 1 }],
      },
      ...drafts,
    ]);
    this.openKey.set(`new-${this.newCounter}`);
  }

  private nextGroupSortOrder(): number {
    return Math.max(0, ...this.drafts().map((draft) => draft.sortOrder)) + 1;
  }

  protected open(group: GroupDraft): void {
    this.openKey.set(group.key);
  }

  protected close(): void {
    this.openKey.set(null);
    this.load();
  }

  protected availableCount(group: GroupDraft): number {
    return group.items.filter((item) => item.available).length;
  }

  protected priceRange(group: GroupDraft): string {
    const prices = group.items.map((item) => item.extraPrice ?? 0);
    if (!prices.length) {
      return '-';
    }
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const money = (value: number) => formatMoney(value, false);
    return low === high ? money(low) : `${money(low)}–${money(high)}`;
  }

  protected addItem(group: GroupDraft): void {
    group.items.push({
      id: null,
      name: '',
      nameEn: '',
      extraPrice: 0,
      available: true,
      sortOrder: group.items.length + 1,
    });
    this.drafts.update((drafts) => [...drafts]);
  }

  protected removeItem(group: GroupDraft, index: number): void {
    group.items.splice(index, 1);
    this.drafts.update((drafts) => [...drafts]);
  }

  protected save(group: GroupDraft): void {
    const request: OptionGroupUpsertRequest = {
      name: cleanText(group.name, this.nameLimit),
      nameEn: cleanText(group.nameEn, this.nameLimit),
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      defaultSelected: group.defaultSelected,
      active: group.active,
      sortOrder: group.sortOrder,
      items: group.items
        .map((item) => ({
          id: item.id,
          name: cleanText(item.name, this.nameLimit),
          nameEn: cleanText(item.nameEn, this.nameLimit),
          extraPrice: Number(item.extraPrice) || 0,
          available: item.available,
        }))
        .filter((item) => item.name)
        .map((item, index) => ({ ...item, sortOrder: index + 1 })),
    };
    this.saving.set(group.key);
    (group.id ? this.api.updateOptionGroup(group.id, request) : this.api.createOptionGroup(request))
      .pipe(finalize(() => this.saving.set(null)))
      .subscribe(() => {
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.openKey.set(null);
        this.load();
        this.catalog.refresh();
      });
  }

  protected async remove(group: GroupDraft): Promise<void> {
    if (!group.id) {
      this.drafts.update((drafts) => drafts.filter((draft) => draft.key !== group.key));
      this.openKey.set(null);
      return;
    }
    const ok = await this.confirm.ask({
      message: this.i18n.t('catalog.confirmDeleteGroup', { name: group.name }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.deleteOptionGroup(group.id).subscribe(() => {
        this.messages.add({
          severity: 'success',
          summary: this.i18n.t('catalog.deleted', { name: group.name }),
        });
        this.openKey.set(null);
        this.load();
        this.catalog.refresh();
      });
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .optionGroups()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((groups) => this.drafts.set(groups.map(toDraft)));
  }
}
