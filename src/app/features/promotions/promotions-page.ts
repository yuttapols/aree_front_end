import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { PromotionResponse } from '../../core/api/models/loyalty.model';
import { PromotionApi } from '../../core/api/services/promotion.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../shared/components/loading-skeleton/loading-skeleton';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PromoCard } from '../../shared/components/promo-card/promo-card';

@Component({
  selector: 'app-promotions-page',
  imports: [EmptyState, LoadingSkeleton, PageHeader, PromoCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('promo.title')" [crumbs]="crumbs" />

    <div class="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      @if (promotions(); as list) {
        @if (list.length) {
          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (promotion of list; track promotion.id) {
              <app-promo-card [promotion]="promotion" />
            }
          </div>
        } @else {
          <app-empty-state icon="pi pi-percentage" [title]="i18n.t('promo.empty')" />
        }
      } @else {
        <app-loading-skeleton variant="card" [count]="3" />
      }
    </div>
  `,
})
export class PromotionsPage {
  protected readonly i18n = inject(I18nService);

  protected readonly crumbs: Crumb[] = [{ labelKey: 'promo.title' }];

  protected readonly promotions = toSignal(
    inject(PromotionApi)
      .publicList()
      .pipe(catchError(() => of([] as PromotionResponse[]))),
  );
}
