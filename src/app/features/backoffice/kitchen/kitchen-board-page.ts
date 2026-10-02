import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { BoardItem, KitchenBoardResponse, OrderStatus } from '../../../core/api/models/order.model';
import { OrderApi } from '../../../core/api/services/order.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { Crumb } from '../../../shared/components/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusTag } from '../../../shared/components/status-tag/status-tag';
import { minutesSince } from '../../../shared/utils/format';
import { orderSummaryLines } from '../../../shared/utils/order-lines';
import { readStorage, writeStorage } from '../../../shared/utils/storage';

const POLL_MS = 5_000;
const SOUND_KEY = 'roti.kitchen.sound';

interface BoardColumn {
  status: OrderStatus;
  titleKey: TranslationKey;
  next: OrderStatus;
  actionKey: TranslationKey;
  icon: string;
  tone: string;
}

const COLUMNS: BoardColumn[] = [
  {
    status: 'CONFIRMED',
    titleKey: 'kitchen.confirmed',
    next: 'PREPARING',
    actionKey: 'kitchen.start',
    icon: 'pi pi-play',
    tone: 'bg-sky-500',
  },
  {
    status: 'PREPARING',
    titleKey: 'kitchen.preparing',
    next: 'READY',
    actionKey: 'kitchen.ready',
    icon: 'pi pi-bell',
    tone: 'bg-accent',
  },
  {
    status: 'READY',
    titleKey: 'kitchen.readyColumn',
    next: 'COMPLETED',
    actionKey: 'kitchen.pickedUp',
    icon: 'pi pi-check',
    tone: 'bg-emerald-500',
  },
];

@Component({
  selector: 'app-kitchen-board-page',
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, EmptyState, PageHeader, StatusTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="i18n.t('bo.nav.kitchen')" [crumbs]="crumbs" />

    <div class="flex flex-col gap-4 px-4 py-6 md:px-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-ink-muted text-sm">
          <i class="pi pi-sync mr-1 text-xs"></i
          >{{ i18n.t('kitchen.autoRefresh', { n: pollSeconds }) }}
        </p>
        <label class="text-ink flex items-center gap-2 text-sm">
          <i class="pi pi-volume-up"></i>{{ i18n.t('kitchen.sound') }}
          <p-toggleswitch [ngModel]="sound()" (ngModelChange)="toggleSound($event)" />
        </label>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        @for (column of columns; track column.status) {
          <section class="bg-card-muted flex min-h-[60vh] flex-col rounded-3xl p-3">
            <header class="mb-3 flex items-center justify-between px-2">
              <h2 class="text-ink flex items-center gap-2 font-bold">
                <span class="h-2.5 w-2.5 rounded-full" [class]="column.tone"></span>
                {{ i18n.t(column.titleKey) }}
              </h2>
              <span class="bg-card text-ink rounded-full px-2.5 py-0.5 text-xs font-bold">
                {{ grouped().get(column.status)?.length ?? 0 }}
              </span>
            </header>
            <div class="flex flex-col gap-3">
              @for (order of grouped().get(column.status) ?? []; track order.id) {
                <article class="bg-card border-line shadow-soft animate-pop rounded-2xl border p-4">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="font-display text-accent text-4xl leading-none font-extrabold">
                        {{ order.queueNo }}
                      </p>
                      <p class="text-ink-muted mt-1 text-xs">#{{ order.orderNo }}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <app-status-tag kind="channel" [value]="order.channel" />
                      <span class="text-xs font-semibold" [class]="waitClass(order)">
                        <i class="pi pi-clock mr-1 text-[0.65rem]"></i
                        >{{ i18n.t('kitchen.minutes', { n: waited(order) }) }}
                      </span>
                    </div>
                  </div>
                  @if (order.customerName) {
                    <p class="text-ink mt-2 text-sm font-semibold">
                      <i class="pi pi-user text-brand mr-1 text-xs"></i>{{ order.customerName }}
                    </p>
                  }
                  <ul class="border-line mt-3 flex flex-col gap-1.5 border-t pt-3">
                    @for (line of lines(order); track line.key) {
                      <li class="text-sm">
                        <span class="text-ink font-bold">{{ line.qty }}×</span>
                        <span class="text-ink ml-1">{{ line.name }}</span>
                        @if (line.extras) {
                          <p class="text-ink-muted pl-6 text-xs">{{ line.extras }}</p>
                        }
                      </li>
                    }
                  </ul>
                  @if (order.note) {
                    <p
                      class="bg-accent-soft text-accent mt-3 rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <i class="pi pi-comment mr-1"></i>{{ order.note }}
                    </p>
                  }
                  <p-button
                    styleClass="mt-3"
                    [label]="i18n.t(column.actionKey)"
                    [icon]="column.icon"
                    [rounded]="true"
                    [fluid]="true"
                    [loading]="updating() === order.id"
                    (onClick)="advance(order, column.next)"
                  />
                </article>
              } @empty {
                <app-empty-state icon="pi pi-inbox" [title]="i18n.t('kitchen.empty')" />
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
})
export class KitchenBoardPage {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(OrderApi);

  protected readonly crumbs: Crumb[] = [
    { labelKey: 'bo.title', link: '/backoffice' },
    { labelKey: 'bo.nav.kitchen' },
  ];
  protected readonly columns = COLUMNS;
  protected readonly pollSeconds = POLL_MS / 1000;
  protected readonly board = signal<KitchenBoardResponse | null>(null);
  protected readonly updating = signal<number | null>(null);
  protected readonly sound = signal(readStorage(SOUND_KEY, ['on', 'off'] as const) !== 'off');
  private readonly now = signal(Date.now());
  private knownIds: Set<number> | null = null;

  protected readonly grouped = computed(() => {
    const board = this.board() ?? [];
    const map = new Map<OrderStatus, BoardItem[]>();
    for (const order of board) {
      map.set(order.status, [...(map.get(order.status) ?? []), order]);
    }
    return map;
  });

  private readonly lineCache = computed(() => {
    const map = new Map<number, ReturnType<typeof orderSummaryLines>>();
    for (const order of this.board() ?? []) {
      map.set(order.id, orderSummaryLines(order.items, this.i18n));
    }
    return map;
  });

  constructor() {
    this.load();
    const timer = setInterval(() => this.load(), POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected lines(order: BoardItem) {
    return this.lineCache().get(order.id) ?? [];
  }

  protected waited(order: BoardItem): number {
    return minutesSince(order.confirmedAt ?? order.createdAt, this.now());
  }

  protected waitClass(order: BoardItem): string {
    const minutes = this.waited(order);
    return minutes >= 15 ? 'text-red-500' : minutes >= 8 ? 'text-accent' : 'text-ink-muted';
  }

  protected toggleSound(enabled: boolean): void {
    this.sound.set(enabled);
    writeStorage(SOUND_KEY, enabled ? 'on' : 'off');
  }

  protected advance(order: BoardItem, status: OrderStatus): void {
    this.updating.set(order.id);
    this.api.updateStatus(order.id, status).subscribe({
      next: () => {
        this.updating.set(null);
        this.load();
      },
      error: () => this.updating.set(null),
    });
  }

  private load(): void {
    this.now.set(Date.now());
    this.api.board().subscribe((board) => {
      const ids = new Set(
        board.filter((order) => order.status === 'CONFIRMED').map((order) => order.id),
      );
      if (this.knownIds && [...ids].some((id) => !this.knownIds?.has(id)) && this.sound()) {
        this.beep();
      }
      this.knownIds = ids;
      this.board.set(board);
    });
  }

  private beep(): void {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.6);
    } catch {
      return;
    }
  }
}
