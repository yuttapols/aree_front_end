import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, TableRowReorderEvent } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { finalize, forkJoin, startWith } from 'rxjs';

import {
  AdminBannerResponse,
  BannerPlacement,
  BannerUpsertRequest,
} from '../../../core/api/models/banner.model';
import { PromotionResponse } from '../../../core/api/models/loyalty.model';
import { BANNER_IMAGE_ENDPOINT, BannerApi } from '../../../core/api/services/banner.api';
import { PromotionApi } from '../../../core/api/services/promotion.api';
import { BannerStore } from '../../../core/banner/banner.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { BannerBackdrop } from '../../../shared/components/banner-backdrop/banner-backdrop';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { FormField } from '../../../shared/components/form-field/form-field';
import { ImageUpload } from '../../../shared/components/image-upload/image-upload';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Panel } from '../../../shared/components/panel/panel';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { ThaiDatePipe } from '../../../shared/pipes/thai-date.pipe';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { BANNER_LINK_PATTERN, bannerState } from '../../../shared/utils/banner';
import { BANNER_IMAGE_MAX_BYTES, BANNER_IMAGE_MAX_DIMENSION } from '../../../shared/utils/image';
import { TEXT_LIMITS } from '../../../shared/utils/sanitize';
import { shouldShowError, textField, validationMessage } from '../../../shared/utils/validators';

const PROMOTION_LOOKUP_SIZE = 100;

type TextControl = 'title' | 'titleEn' | 'subtitle' | 'subtitleEn' | 'ctaLabel' | 'ctaLabelEn';

interface PlacementSection {
  placement: BannerPlacement;
  headingKey: TranslationKey;
  hintKey: TranslationKey;
  icon: string;
}

const SECTIONS: PlacementSection[] = [
  {
    placement: 'HOME_HERO',
    headingKey: 'bo.banners.hero',
    hintKey: 'bo.banners.heroHint',
    icon: 'pi pi-images',
  },
  {
    placement: 'HOME_OFFER',
    headingKey: 'bo.banners.offer',
    hintKey: 'bo.banners.offerHint',
    icon: 'pi pi-gift',
  },
];

function emptyToNull(value: string): string | null {
  return value.trim() || null;
}

@Component({
  selector: 'app-banners-page',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TabsModule,
    ToggleSwitchModule,
    BannerBackdrop,
    FormField,
    ImageUpload,
    PageHeader,
    Panel,
    StatusTag,
    ThaiDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.banners')" [crumbs]="crumbs" />

    <div class="px-4 py-6 md:px-8">
      <p-tabs [value]="activePlacement()" (valueChange)="activePlacement.set($any($event))">
        <p-tablist>
          @for (section of sections; track section.placement) {
            <p-tab [value]="section.placement">
              <i [class]="section.icon" class="mr-2"></i>{{ i18n.t(section.headingKey) }}
            </p-tab>
          }
        </p-tablist>
        <p-tabpanels class="!bg-transparent !px-0">
          @for (section of sections; track section.placement) {
            <p-tabpanel [value]="section.placement">
              <app-panel
                [heading]="i18n.t(section.headingKey)"
                [subtitle]="i18n.t(section.hintKey)"
              >
                <p-button
                  panelActions
                  [label]="i18n.t('common.add')"
                  icon="pi pi-plus"
                  [rounded]="true"
                  (onClick)="edit(null, section.placement)"
                />
                <div class="border-line overflow-hidden rounded-2xl border">
                  <p-table
                    [value]="banners()[section.placement]"
                    [loading]="loading()"
                    (onRowReorder)="reorder(section.placement, $event)"
                    [tableStyle]="{ 'min-width': '48rem' }"
                  >
                    <ng-template #header>
                      <tr>
                        <th class="w-12"></th>
                        <th class="w-48">{{ i18n.t('bo.banners.image') }}</th>
                        <th>{{ i18n.t('bo.banners.titleCol') }}</th>
                        <th>{{ i18n.t('bo.banners.period') }}</th>
                        <th>{{ i18n.t('common.status') }}</th>
                        <th class="w-32"></th>
                      </tr>
                    </ng-template>
                    <ng-template #body let-row let-index="rowIndex">
                      <tr [pReorderableRow]="index">
                        <td>
                          <i
                            class="pi pi-bars text-ink-muted cursor-move"
                            pReorderableRowHandle
                          ></i>
                        </td>
                        <td>
                          <div
                            class="bg-royal relative aspect-[12/5] w-40 overflow-hidden rounded-xl"
                          >
                            <app-banner-backdrop [url]="row.imageUrl" variant="vivid" />
                          </div>
                        </td>
                        <td>
                          @if (row.title) {
                            <span class="text-ink block font-semibold">
                              {{ i18n.pick(row.title, row.titleEn) }}
                            </span>
                          } @else {
                            <span class="text-ink-muted block">
                              {{ i18n.t('bo.banners.untitled') }}
                            </span>
                          }
                          @if (row.subtitle) {
                            <span class="text-ink-muted block text-xs">
                              {{ i18n.pick(row.subtitle, row.subtitleEn) }}
                            </span>
                          }
                        </td>
                        <td class="text-ink-muted text-sm">
                          @if (row.startAt || row.endAt) {
                            {{ row.startAt ? (row.startAt | thaiDate: i18n.lang() : 'date') : '…' }}
                            –
                            {{ row.endAt ? (row.endAt | thaiDate: i18n.lang() : 'date') : '…' }}
                          } @else {
                            {{ i18n.t('bo.banners.always') }}
                          }
                        </td>
                        <td><app-status-tag kind="promotion" [value]="state(row)" /></td>
                        <td class="text-right">
                          <p-button
                            icon="pi pi-pencil"
                            [text]="true"
                            [rounded]="true"
                            [ariaLabel]="i18n.t('common.edit')"
                            (onClick)="edit(row, row.placement)"
                          />
                          <p-button
                            icon="pi pi-trash"
                            severity="danger"
                            [text]="true"
                            [rounded]="true"
                            [ariaLabel]="i18n.t('common.delete')"
                            (onClick)="remove(row)"
                          />
                        </td>
                      </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                      <tr>
                        <td colspan="6" class="text-ink-muted py-8 text-center text-sm">
                          {{ i18n.t('bo.banners.empty') }}
                        </td>
                      </tr>
                    </ng-template>
                  </p-table>
                </div>
              </app-panel>
            </p-tabpanel>
          }
        </p-tabpanels>
      </p-tabs>
    </div>

    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="dialogOpen.set($event)"
      [modal]="true"
      [draggable]="false"
      [header]="i18n.t(editingId() ? 'bo.banners.edit' : 'bo.banners.new')"
      [style]="{ width: '52rem' }"
      [breakpoints]="{ '768px': '96vw' }"
    >
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="sm:col-span-2">
          <p class="text-ink mb-2 text-sm font-semibold">{{ i18n.t('bo.banners.preview') }}</p>
          <div class="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <figure>
              <div
                class="bg-royal relative aspect-[12/5] overflow-hidden rounded-2xl p-5 text-white"
              >
                <app-banner-backdrop
                  [url]="formValue().imageUrl ?? null"
                  [variant]="previewVariant()"
                />
                <div class="relative max-w-[60%]">
                  <ng-container [ngTemplateOutlet]="previewText" />
                </div>
              </div>
              <figcaption class="text-ink-muted mt-1 text-xs">
                {{ i18n.t('bo.banners.previewDesktop') }}
              </figcaption>
            </figure>
            <figure>
              <div
                class="bg-royal relative aspect-[9/16] overflow-hidden rounded-2xl p-3 text-white"
              >
                <app-banner-backdrop
                  [url]="formValue().imageUrlMobile || formValue().imageUrl || null"
                  [variant]="previewVariant()"
                />
                <div class="relative">
                  <ng-container [ngTemplateOutlet]="previewText" />
                </div>
              </div>
              <figcaption class="text-ink-muted mt-1 text-xs">
                {{ i18n.t('bo.banners.previewMobile') }}
              </figcaption>
            </figure>
          </div>
          <ng-template #previewText>
            @if (formValue().title) {
              <p class="font-display text-sm leading-tight font-extrabold uppercase md:text-xl">
                {{ formValue().title }}
              </p>
            }
            @if (formValue().subtitle) {
              <p class="mt-1 text-[0.65rem] text-white/80 md:text-xs">
                {{ formValue().subtitle }}
              </p>
            }
            @if (hasLink() && formValue().ctaLabel) {
              <span
                class="bg-accent mt-2 inline-block rounded-full px-3 py-1 text-[0.65rem] font-bold"
              >
                {{ formValue().ctaLabel }}
              </span>
            }
          </ng-template>
        </div>
        <div>
          <p class="text-ink mb-2 text-sm font-semibold">{{ i18n.t('bo.banners.image') }} *</p>
          <app-image-upload
            shape="wide"
            [endpoint]="imageEndpoint"
            [maxBytes]="imageMaxBytes"
            [maxDimension]="imageMaxDimension"
            [removable]="false"
            [url]="form.controls.imageUrl.value"
            (urlChange)="form.controls.imageUrl.setValue($event)"
          />
          @if (submitted() && !form.controls.imageUrl.value) {
            <small class="text-danger mt-1 block text-xs">
              {{ i18n.t('bo.banners.imageRequired') }}
            </small>
          }
        </div>
        <div>
          <p class="text-ink mb-2 text-sm font-semibold">{{ i18n.t('bo.banners.imageMobile') }}</p>
          <app-image-upload
            [endpoint]="imageEndpoint"
            [maxBytes]="imageMaxBytes"
            [maxDimension]="imageMaxDimension"
            [url]="form.controls.imageUrlMobile.value"
            (urlChange)="form.controls.imageUrlMobile.setValue($event)"
          />
        </div>
        <small class="text-ink-muted -mt-2 text-xs sm:col-span-2">
          {{ i18n.t('bo.banners.imageHint') }}
        </small>
        <app-form-field
          inputId="bn-title"
          [label]="i18n.t('bo.banners.titleTh')"
          [error]="errorFor('title')"
        >
          <input
            pInputText
            id="bn-title"
            formControlName="title"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-title-en"
          [label]="i18n.t('bo.banners.titleEn')"
          [error]="errorFor('titleEn')"
        >
          <input
            pInputText
            id="bn-title-en"
            formControlName="titleEn"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-sub"
          [label]="i18n.t('bo.banners.subtitleTh')"
          [error]="errorFor('subtitle')"
        >
          <input
            pInputText
            id="bn-sub"
            formControlName="subtitle"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-sub-en"
          [label]="i18n.t('bo.banners.subtitleEn')"
          [error]="errorFor('subtitleEn')"
        >
          <input
            pInputText
            id="bn-sub-en"
            formControlName="subtitleEn"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-cta"
          [label]="i18n.t('bo.banners.ctaTh')"
          [error]="errorFor('ctaLabel')"
        >
          <input
            pInputText
            id="bn-cta"
            formControlName="ctaLabel"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-cta-en"
          [label]="i18n.t('bo.banners.ctaEn')"
          [error]="errorFor('ctaLabelEn')"
        >
          <input
            pInputText
            id="bn-cta-en"
            formControlName="ctaLabelEn"
            class="rounded-xl"
            [fluid]="true"
          />
        </app-form-field>
        <app-form-field inputId="bn-promo" [label]="i18n.t('bo.banners.promotion')">
          <p-select
            inputId="bn-promo"
            formControlName="promotionId"
            [options]="promotionOptions()"
            optionLabel="label"
            optionValue="value"
            [fluid]="true"
            appendTo="body"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-link"
          [label]="i18n.t('bo.banners.link')"
          [hint]="i18n.t('bo.banners.linkHint')"
          [error]="linkError()"
        >
          <input
            pInputText
            id="bn-link"
            formControlName="linkUrl"
            class="rounded-xl"
            [fluid]="true"
            [attr.disabled]="formValue().promotionId ? true : null"
          />
        </app-form-field>
        <app-form-field inputId="bn-start" [label]="i18n.t('bo.banners.startAt')">
          <p-datepicker
            inputId="bn-start"
            formControlName="startAt"
            [showTime]="true"
            hourFormat="24"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            [showClear]="true"
            [fluid]="true"
            appendTo="body"
          />
        </app-form-field>
        <app-form-field
          inputId="bn-end"
          [label]="i18n.t('bo.banners.endAt')"
          [error]="periodError()"
        >
          <p-datepicker
            inputId="bn-end"
            formControlName="endAt"
            [showTime]="true"
            hourFormat="24"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            [showClear]="true"
            [fluid]="true"
            appendTo="body"
          />
        </app-form-field>
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
export class BannersPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(BannerApi);
  private readonly promotionApi = inject(PromotionApi);
  private readonly bannerStore = inject(BannerStore);
  private readonly confirm = inject(ConfirmService);
  private readonly messages = inject(MessageService);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.banners' },
  ];
  protected readonly sections = SECTIONS;
  protected readonly imageEndpoint = BANNER_IMAGE_ENDPOINT;
  protected readonly imageMaxBytes = BANNER_IMAGE_MAX_BYTES;
  protected readonly imageMaxDimension = BANNER_IMAGE_MAX_DIMENSION;
  protected readonly activePlacement = signal<BannerPlacement>('HOME_HERO');
  protected readonly banners = signal<Record<BannerPlacement, AdminBannerResponse[]>>({
    HOME_HERO: [],
    HOME_OFFER: [],
  });
  protected readonly promotions = signal<PromotionResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly placement = signal<BannerPlacement>('HOME_HERO');
  protected readonly submitted = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    imageUrl: [null as string | null],
    imageUrlMobile: [null as string | null],
    title: ['', textField(TEXT_LIMITS.bannerTitle)],
    titleEn: ['', textField(TEXT_LIMITS.bannerTitle)],
    subtitle: ['', textField(TEXT_LIMITS.bannerSubtitle)],
    subtitleEn: ['', textField(TEXT_LIMITS.bannerSubtitle)],
    ctaLabel: ['', textField(TEXT_LIMITS.bannerCta)],
    ctaLabelEn: ['', textField(TEXT_LIMITS.bannerCta)],
    linkUrl: ['', textField(TEXT_LIMITS.shortText)],
    promotionId: [null as number | null],
    startAt: [null as Date | null],
    endAt: [null as Date | null],
    active: [true],
  });

  protected readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly previewVariant = computed(() =>
    this.placement() === 'HOME_HERO' ? 'vivid' : 'soft',
  );

  protected readonly hasLink = computed(
    () => !!this.formValue().promotionId || !!this.formValue().linkUrl?.trim(),
  );

  protected readonly promotionOptions = computed(() => [
    { label: this.i18n.t('bo.banners.noPromotion'), value: null },
    ...this.promotions().map((promotion) => ({
      label: this.i18n.name(promotion),
      value: promotion.id,
    })),
  ]);

  constructor() {
    this.load();
    this.promotionApi
      .list(0, PROMOTION_LOOKUP_SIZE)
      .subscribe((page) => this.promotions.set(page.items));
  }

  protected state(banner: AdminBannerResponse): string {
    return bannerState(banner);
  }

  protected errorFor(field: TextControl): string | null {
    const control = this.form.controls[field];
    return shouldShowError(control, this.submitted())
      ? validationMessage(control, this.i18n)
      : null;
  }

  protected linkError(): string | null {
    return this.submitted() && !this.linkValid() ? this.i18n.t('bo.banners.linkHint') : null;
  }

  protected periodError(): string | null {
    const { startAt, endAt } = this.formValue();
    return startAt && endAt && startAt > endAt ? this.i18n.t('bo.banners.periodError') : null;
  }

  protected edit(banner: AdminBannerResponse | null, placement: BannerPlacement): void {
    this.editingId.set(banner?.id ?? null);
    this.placement.set(placement);
    this.submitted.set(false);
    this.form.reset({
      imageUrl: banner?.imageUrl ?? null,
      imageUrlMobile: banner?.imageUrlMobile ?? null,
      title: banner?.title ?? '',
      titleEn: banner?.titleEn ?? '',
      subtitle: banner?.subtitle ?? '',
      subtitleEn: banner?.subtitleEn ?? '',
      ctaLabel: banner?.ctaLabel ?? '',
      ctaLabelEn: banner?.ctaLabelEn ?? '',
      linkUrl: banner?.linkUrl ?? '',
      promotionId: banner?.promotionId ?? null,
      startAt: banner?.startAt ? new Date(banner.startAt) : null,
      endAt: banner?.endAt ? new Date(banner.endAt) : null,
      active: banner?.active ?? true,
    });
    this.dialogOpen.set(true);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (this.form.invalid || !value.imageUrl || !this.linkValid() || this.periodError()) {
      return;
    }
    const request: BannerUpsertRequest = {
      placement: this.placement(),
      imageUrl: value.imageUrl,
      imageUrlMobile: value.imageUrlMobile,
      title: emptyToNull(value.title),
      titleEn: emptyToNull(value.titleEn),
      subtitle: emptyToNull(value.subtitle),
      subtitleEn: emptyToNull(value.subtitleEn),
      ctaLabel: emptyToNull(value.ctaLabel),
      ctaLabelEn: emptyToNull(value.ctaLabelEn),
      linkUrl: value.promotionId ? null : emptyToNull(value.linkUrl),
      promotionId: value.promotionId,
      active: value.active,
      startAt: value.startAt?.toISOString() ?? null,
      endAt: value.endAt?.toISOString() ?? null,
    };
    const id = this.editingId();
    this.saving.set(true);
    (id ? this.api.update(id, request) : this.api.create(request))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.dialogOpen.set(false);
        this.messages.add({ severity: 'success', summary: this.i18n.t('common.saved') });
        this.afterChange();
      });
  }

  protected async remove(banner: AdminBannerResponse): Promise<void> {
    const ok = await this.confirm.ask({
      message: this.i18n.t('bo.banners.confirmDelete', {
        name: banner.title
          ? this.i18n.pick(banner.title, banner.titleEn)
          : this.i18n.t('bo.banners.untitled'),
      }),
      danger: true,
      acceptLabel: this.i18n.t('common.delete'),
    });
    if (ok) {
      this.api.remove(banner.id).subscribe(() => this.afterChange());
    }
  }

  protected reorder(placement: BannerPlacement, event: TableRowReorderEvent): void {
    if (event.dragIndex === event.dropIndex) {
      return;
    }
    const ids = this.banners()[placement].map((banner) => banner.id);
    this.api.reorder({ placement, ids }).subscribe((banners) => {
      this.banners.update((current) => ({ ...current, [placement]: banners }));
      this.messages.add({ severity: 'success', summary: this.i18n.t('bo.banners.reordered') });
      this.bannerStore.load(true);
    });
  }

  private linkValid(): boolean {
    const { promotionId, linkUrl } = this.form.getRawValue();
    const link = linkUrl.trim();
    return !!promotionId || !link || BANNER_LINK_PATTERN.test(link);
  }

  private afterChange(): void {
    this.load();
    this.bannerStore.load(true);
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      HOME_HERO: this.api.list('HOME_HERO'),
      HOME_OFFER: this.api.list('HOME_OFFER'),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((banners) => this.banners.set(banners));
  }
}
