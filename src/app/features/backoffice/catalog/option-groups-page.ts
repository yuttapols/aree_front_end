import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
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
import { ConfirmService } from '../../../shared/services/confirm.service';

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
    isActive: group.isActive,
    items: group.items.map((item) => ({ ...item })),
  };
}

@Component({
  selector: 'app-option-groups-page',
  imports: [
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    ToggleSwitchModule,
    EmptyState,
    LoadingSkeleton,
    Panel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-ink-muted text-sm">{{ i18n.t('catalog.optionGroupsHint') }}</p>
      <p-button
        [label]="i18n.t('catalog.newGroup')"
        icon="pi pi-plus"
        [rounded]="true"
        (onClick)="addGroup()"
      />
    </div>

    @if (loading()) {
      <app-loading-skeleton variant="list" [count]="3" />
    } @else {
      <div class="grid gap-5 xl:grid-cols-2">
        @for (group of drafts(); track group.key) {
          <app-panel>
            <div class="grid gap-3 sm:grid-cols-2">
              <input
                pInputText
                class="rounded-xl"
                [placeholder]="i18n.t('catalog.nameTh')"
                [(ngModel)]="group.name"
              />
              <input
                pInputText
                class="rounded-xl"
                [placeholder]="i18n.t('catalog.nameEn')"
                [(ngModel)]="group.nameEn"
              />
              <label class="text-ink-muted text-xs">
                {{ i18n.t('catalog.minSelect') }}
                <p-inputnumber
                  [(ngModel)]="group.minSelect"
                  [min]="0"
                  [showButtons]="true"
                  [fluid]="true"
                />
              </label>
              <label class="text-ink-muted text-xs">
                {{ i18n.t('catalog.maxSelect') }}
                <p-inputnumber
                  [(ngModel)]="group.maxSelect"
                  [min]="1"
                  [showButtons]="true"
                  [fluid]="true"
                />
              </label>
            </div>

            <div class="border-line mt-4 overflow-x-auto rounded-2xl border">
              <table class="w-full min-w-[34rem] text-sm">
                <thead class="bg-card-muted text-ink-muted text-xs">
                  <tr>
                    <th class="px-3 py-2 text-left">{{ i18n.t('catalog.nameTh') }}</th>
                    <th class="px-3 py-2 text-left">{{ i18n.t('catalog.nameEn') }}</th>
                    <th class="px-3 py-2 text-right">{{ i18n.t('catalog.extraPrice') }}</th>
                    <th class="px-3 py-2 text-center">{{ i18n.t('catalog.available') }}</th>
                    <th class="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of group.items; track $index) {
                    <tr class="border-line border-t">
                      <td class="px-2 py-1.5">
                        <input
                          pInputText
                          class="w-full rounded-lg"
                          pSize="small"
                          [(ngModel)]="item.name"
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <input
                          pInputText
                          class="w-full rounded-lg"
                          pSize="small"
                          [(ngModel)]="item.nameEn"
                        />
                      </td>
                      <td class="px-2 py-1.5">
                        <p-inputnumber
                          inputStyleClass="w-20 text-right"
                          [min]="0"
                          size="small"
                          [(ngModel)]="item.extraPrice"
                        />
                      </td>
                      <td class="px-2 py-1.5 text-center">
                        <p-toggleswitch [(ngModel)]="item.isAvailable" />
                      </td>
                      <td class="px-2 py-1.5">
                        <p-button
                          icon="pi pi-times"
                          severity="danger"
                          [text]="true"
                          [rounded]="true"
                          size="small"
                          [ariaLabel]="i18n.t('common.remove')"
                          (onClick)="removeItem(group, $index)"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <p-button
                  [label]="i18n.t('catalog.addItem')"
                  icon="pi pi-plus"
                  size="small"
                  [text]="true"
                  (onClick)="addItem(group)"
                />
                <label class="text-ink flex items-center gap-2 text-sm"
                  ><p-toggleswitch [(ngModel)]="group.isActive" />{{
                    i18n.t('status.active.true')
                  }}</label
                >
              </div>
              <div class="flex gap-2">
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [ariaLabel]="i18n.t('common.delete')"
                  (onClick)="remove(group)"
                />
                <p-button
                  [label]="i18n.t('common.save')"
                  icon="pi pi-check"
                  size="small"
                  [rounded]="true"
                  [loading]="saving() === group.key"
                  (onClick)="save(group)"
                />
              </div>
            </div>
          </app-panel>
        } @empty {
          <app-empty-state
            class="col-span-full"
            icon="pi pi-list-check"
            [title]="i18n.t('catalog.noGroups')"
          />
        }
      </div>
    }
  `,
})
export class OptionGroupsPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(CatalogApi);
  private readonly catalog = inject(CatalogStore);
  private readonly confirm = inject(ConfirmService);
  private readonly messages = inject(MessageService);

  protected readonly drafts = signal<GroupDraft[]>([]);
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
        isActive: true,
        items: [{ id: null, name: '', nameEn: '', extraPrice: 0, isAvailable: true }],
      },
      ...drafts,
    ]);
  }

  protected addItem(group: GroupDraft): void {
    group.items.push({ id: null, name: '', nameEn: '', extraPrice: 0, isAvailable: true });
    this.drafts.update((drafts) => [...drafts]);
  }

  protected removeItem(group: GroupDraft, index: number): void {
    group.items.splice(index, 1);
    this.drafts.update((drafts) => [...drafts]);
  }

  protected save(group: GroupDraft): void {
    const request: OptionGroupUpsertRequest = {
      name: group.name,
      nameEn: group.nameEn,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      isActive: group.isActive,
      items: group.items.filter((item) => item.name.trim()),
    };
    this.saving.set(group.key);
    (group.id ? this.api.updateOptionGroup(group.id, request) : this.api.createOptionGroup(request))
      .pipe(finalize(() => this.saving.set(null)))
      .subscribe(() => {
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.load();
        this.catalog.refresh();
      });
  }

  protected async remove(group: GroupDraft): Promise<void> {
    if (!group.id) {
      this.drafts.update((drafts) => drafts.filter((draft) => draft.key !== group.key));
      return;
    }
    const ok = await this.confirm.ask({
      message: this.i18n.t('catalog.confirmDeleteGroup', { name: group.name }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.deleteOptionGroup(group.id).subscribe(() => {
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
