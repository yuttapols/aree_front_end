import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { readStorage, writeStorage } from '../../utils/storage';

const STATES = ['collapsed', 'expanded'] as const;

export interface SideNavItem {
  id: string;
  labelKey: TranslationKey;
  icon: string;
  link?: string;
  fragment?: string;
  exact?: boolean;
  badge?: number | null;
  action?: string;
  group?: TranslationKey;
  tone?: 'danger';
  hidden?: boolean;
}

interface SideNavSection {
  group: TranslationKey | null;
  items: SideNavItem[];
}

@Component({
  selector: 'app-side-nav',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <aside
      class="sticky top-[72px] z-20 h-[calc(100dvh-72px)] shrink-0 p-3 transition-[width] duration-300"
      [class]="collapsed() ? 'w-[5.75rem]' : 'w-[5.75rem] md:w-72'"
    >
      <div
        class="bg-card border-line shadow-soft relative flex h-full flex-col rounded-[1.75rem] border"
      >
        <button
          type="button"
          class="bg-card border-line text-ink-muted hover:text-brand hover:border-brand absolute top-8 -right-3.5 z-10 hidden h-7 w-7 place-items-center rounded-full border shadow-md transition md:grid"
          [attr.aria-label]="i18n.t(collapsed() ? 'sidenav.expand' : 'sidenav.collapse')"
          [attr.aria-expanded]="!collapsed()"
          (click)="collapsed.set(!collapsed())"
        >
          <i
            class="pi text-[0.6rem]"
            [class]="collapsed() ? 'pi-chevron-right' : 'pi-chevron-left'"
          ></i>
        </button>

        <nav
          class="flex h-full flex-col overflow-x-hidden overflow-y-auto p-3 [scrollbar-width:thin]"
          [attr.aria-label]="ariaLabel()"
        >
          <div class="mb-2 empty:hidden" [class]="collapsed() ? 'hidden' : 'hidden md:block'">
            <ng-content select="[sideNavHeader]" />
          </div>
          <div
            class="mb-2 justify-center empty:hidden"
            [class]="collapsed() ? 'flex' : 'flex md:hidden'"
          >
            <ng-content select="[sideNavHeaderCompact]" />
          </div>

          @for (section of sections(); track $index) {
            @if (section.group) {
              <p
                class="text-ink-muted/80 px-3 pt-4 pb-1.5 text-[0.68rem] font-bold tracking-[0.12em] uppercase"
                [class]="collapsed() ? 'hidden' : 'hidden md:block'"
              >
                {{ i18n.t(section.group) }}
              </p>
              <span
                class="bg-line mx-auto my-3 h-px w-8"
                [class]="collapsed() ? 'block' : 'block md:hidden'"
              ></span>
            }
            <div class="flex flex-col gap-1">
              @for (item of section.items; track item.id) {
                <ng-container *ngTemplateOutlet="entry; context: { $implicit: item }" />
              }
            </div>
          }

          <div class="border-line mt-auto flex flex-col gap-1 border-t pt-3">
            @for (item of footerItems(); track item.id) {
              <ng-container *ngTemplateOutlet="entry; context: { $implicit: item }" />
            }
          </div>
        </nav>
      </div>
    </aside>

    <ng-template #entry let-item>
      @if (item.link) {
        <a
          [routerLink]="item.link"
          [fragment]="item.fragment"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          [pTooltip]="i18n.t(item.labelKey)"
          tooltipPosition="right"
          [tooltipDisabled]="!collapsed()"
          [attr.aria-label]="i18n.t(item.labelKey)"
          [class]="itemClass()"
        >
          <ng-container *ngTemplateOutlet="body; context: { $implicit: item }" />
        </a>
      } @else {
        <button
          type="button"
          [pTooltip]="i18n.t(item.labelKey)"
          tooltipPosition="right"
          [tooltipDisabled]="!collapsed()"
          [attr.aria-label]="i18n.t(item.labelKey)"
          [class]="itemClass() + (item.tone === 'danger' ? ' danger' : '')"
          (click)="actionClick.emit(item.action ?? item.id)"
        >
          <ng-container *ngTemplateOutlet="body; context: { $implicit: item }" />
        </button>
      }
    </ng-template>

    <ng-template #body let-item>
      <span [class]="iconBoxClass">
        <i [class]="item.icon" class="text-[1.05rem]"></i>
        @if (item.badge) {
          <span
            class="bg-accent ring-card animate-pop absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.62rem] font-bold text-white ring-2"
          >
            {{ item.badge }}
          </span>
        }
      </span>
      <span [class]="labelClass()">{{ i18n.t(item.labelKey) }}</span>
      @if (!collapsed()) {
        <i
          class="pi pi-angle-right text-ink-muted ml-auto hidden text-xs opacity-0 transition group-hover/item:translate-x-0.5 group-hover/item:opacity-100 group-[.is-active]/item:opacity-100 md:inline"
        ></i>
      }
    </ng-template>
  `,
})
export class SideNav {
  protected readonly i18n = inject(I18nService);

  readonly items = input.required<SideNavItem[]>();
  readonly footerItems = input<SideNavItem[]>([]);
  readonly storageKey = input('roti.sidebar');
  readonly ariaLabel = input('');

  readonly actionClick = output<string>();

  protected readonly collapsed = signal(false);
  private restored = false;

  protected readonly sections = computed<SideNavSection[]>(() => {
    const sections: SideNavSection[] = [];
    for (const item of this.items().filter((entry) => !entry.hidden)) {
      const group = item.group ?? null;
      const last = sections.at(-1);
      if (last && last.group === group) {
        last.items.push(item);
      } else {
        sections.push({ group, items: [item] });
      }
    }
    return sections;
  });

  protected readonly labelClass = computed(() =>
    this.collapsed() ? 'hidden' : 'hidden truncate md:inline',
  );

  protected readonly itemClass = computed(
    () =>
      'group/item text-ink-muted hover:bg-canvas hover:text-ink relative flex h-11 w-full items-center gap-3 rounded-2xl text-sm font-medium transition ' +
      '[&.is-active]:bg-brand-soft [&.is-active]:text-brand [&.is-active]:font-semibold ' +
      "before:bg-brand before:absolute before:top-1/2 before:-left-3 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:opacity-0 before:transition before:content-[''] [&.is-active]:before:opacity-100 " +
      '[&.danger]:text-red-500 [&.danger]:hover:bg-red-500/10 [&.danger]:hover:text-red-500 ' +
      (this.collapsed() ? 'justify-center px-0' : 'justify-center px-0 md:justify-start md:px-2'),
  );

  protected readonly iconBoxClass =
    'bg-card-muted text-ink-muted relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ' +
    'group-hover/item:text-brand group-hover/item:scale-105 ' +
    'group-[.is-active]/item:bg-brand group-[.is-active]/item:text-on-brand group-[.is-active]/item:shadow-md ' +
    'group-[.danger]/item:bg-red-500/10 group-[.danger]/item:text-red-500 group-[.danger]/item:group-hover/item:bg-red-500 group-[.danger]/item:group-hover/item:text-white';

  constructor() {
    effect(() => {
      const key = this.storageKey();
      if (!this.restored) {
        this.restored = true;
        this.collapsed.set(readStorage(key, STATES) === 'collapsed');
        return;
      }
      writeStorage(key, this.collapsed() ? 'collapsed' : 'expanded');
    });
  }
}
