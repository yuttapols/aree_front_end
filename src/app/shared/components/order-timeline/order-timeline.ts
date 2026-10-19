import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TimelineModule } from 'primeng/timeline';

import { OrderResponse } from '../../../core/api/models/order.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { ThaiDatePipe } from '../../pipes/thai-date.pipe';

interface TimelineStep {
  key: TranslationKey;
  icon: string;
  at: string | null;
  done: boolean;
  danger?: boolean;
  current?: boolean;
  success?: boolean;
}

@Component({
  selector: 'app-order-timeline',
  imports: [TimelineModule, ThaiDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p-timeline [value]="steps()" [align]="'left'">
      <ng-template #marker let-step>
        <span class="relative grid h-8 w-8 place-items-center">
          @if (step.current) {
            <span class="bg-brand absolute inset-0 animate-ping rounded-full opacity-40"></span>
          }
          <span
            class="relative grid h-8 w-8 place-items-center rounded-full transition-colors"
            [class]="
              step.danger
                ? 'bg-red-500 text-white'
                : step.success
                  ? 'animate-pop bg-emerald-500 text-white'
                  : step.done
                    ? 'bg-brand text-on-brand'
                    : 'bg-card-muted text-ink-muted'
            "
            [class.ring-4]="step.current"
            [class.ring-brand-soft]="step.current"
          >
            <i [class]="step.success ? 'pi pi-check' : step.icon" class="text-xs"></i>
          </span>
        </span>
      </ng-template>
      <ng-template #content let-step>
        <div class="pb-4">
          <p
            class="text-sm font-semibold"
            [class]="
              step.success
                ? 'text-emerald-600 dark:text-emerald-400'
                : step.current
                  ? 'text-brand'
                  : step.done
                    ? 'text-ink'
                    : 'text-ink-muted'
            "
          >
            {{ i18n.t(step.key) }}
          </p>
          @if (step.at) {
            <p class="text-ink-muted text-xs">{{ step.at | thaiDate: i18n.lang() : 'time' }}</p>
          }
        </div>
      </ng-template>
    </p-timeline>
  `,
})
export class OrderTimeline {
  protected readonly i18n = inject(I18nService);

  readonly order = input.required<OrderResponse>();

  protected readonly steps = computed<TimelineStep[]>(() => {
    const steps = this.baseSteps();
    if (this.order().status === 'COMPLETED') {
      return steps.map((step, index) =>
        index === steps.length - 1 ? { ...step, success: true } : step,
      );
    }
    const currentIndex = steps.map((step) => step.done).lastIndexOf(true);
    return steps.map((step, index) =>
      index === currentIndex && !step.danger ? { ...step, current: true } : step,
    );
  });

  private readonly baseSteps = computed<TimelineStep[]>(() => {
    const order = this.order();
    const created: TimelineStep = {
      key: 'timeline.created',
      icon: 'pi pi-receipt',
      at: order.createdAt,
      done: true,
    };
    if (order.status === 'CANCELLED') {
      return [
        created,
        {
          key: 'timeline.cancelled',
          icon: 'pi pi-times',
          at: order.cancelledAt,
          done: true,
          danger: true,
        },
      ];
    }
    const paid = order.totalAmount > 0 ? order.remainingAmount <= 0 : !!order.completedAt;
    const paidAt =
      order.payments
        .filter((payment) => payment.status === 'PAID' && payment.paidAt)
        .map((payment) => payment.paidAt as string)
        .sort()
        .at(-1) ?? null;
    return [
      created,
      {
        key: 'timeline.preparing',
        icon: 'pi pi-hourglass',
        at: order.preparingAt,
        done: !!order.preparingAt,
      },
      { key: 'timeline.ready', icon: 'pi pi-bell', at: order.readyAt, done: !!order.readyAt },
      {
        key: 'timeline.confirmed',
        icon: 'pi pi-wallet',
        at: paid ? paidAt : null,
        done: paid,
      },
      {
        key: 'timeline.completed',
        icon: 'pi pi-check',
        at: order.completedAt,
        done: !!order.completedAt,
      },
    ];
  });
}
