import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { OrderService } from '../../core/order/order.service';
import { Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-order-success-page',
  imports: [RouterLink, ButtonModule, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('crumb.success')" [crumbs]="crumbs" />

    <div class="mx-auto max-w-md px-4 py-8 md:py-12">
      @if (orders.lastOrder(); as order) {
        <div class="bg-card border-line shadow-soft animate-pop rounded-3xl border p-7 text-center">
          <span
            class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#4a7c4e] text-white shadow-lg"
          >
            <i class="pi pi-check text-2xl"></i>
          </span>
          <h2 class="text-ink mt-4 text-2xl font-bold">{{ i18n.t('success.title') }}</h2>
          <p class="text-ink-muted mt-2 text-sm">{{ i18n.t('success.subtitle') }}</p>

          <div class="bg-canvas mt-6 rounded-2xl px-4 py-5">
            <p class="text-ink-muted text-xs">{{ i18n.t('success.queue') }}</p>
            <p class="font-display text-accent my-1 text-6xl">{{ order.queue }}</p>
            <p class="text-ink-muted text-xs">
              {{ i18n.t('success.orderNo') }} #{{ order.orderNo }}
            </p>
            <p class="text-ink mt-3 text-sm font-semibold">
              <i class="pi pi-user text-brand mr-1 text-xs"></i>
              {{ i18n.t('success.recipient') }}: {{ order.recipientName }}
            </p>
          </div>

          @if (order.pointsEarned > 0) {
            <p
              class="bg-accent-soft text-accent animate-pop mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
            >
              <i class="pi pi-star-fill text-xs"></i>
              {{ i18n.t('success.pointsEarned', { n: order.pointsEarned }) }}
            </p>
          }

          <p class="text-ink-muted mt-5 text-sm">{{ i18n.t('success.eta') }}</p>

          <a
            pButton
            routerLink="/"
            fragment="menu"
            class="mt-6"
            [label]="i18n.t('success.again')"
            [rounded]="true"
            size="large"
            [fluid]="true"
          ></a>
        </div>
      }
    </div>
  `,
})
export class OrderSuccessPage {
  protected readonly i18n = inject(I18nService);
  protected readonly orders = inject(OrderService);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'crumb.menu', link: '/', fragment: 'menu' },
    { labelKey: 'crumb.checkout' },
    { labelKey: 'crumb.success' },
  ];
}
