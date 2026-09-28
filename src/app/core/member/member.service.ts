import { Injectable, computed, effect, signal } from '@angular/core';

import { readJson, writeJson } from '../../shared/utils/storage';
import { DEMO_MEMBER } from '../data/member.data';
import { MemberAccount, MemberOrder } from '../models/member.model';
import { tierProgress } from './member-tier';

const SESSION_KEY = 'roti.session';
const ACCOUNTS_KEY = 'roti.accounts';
const WELCOME_POINTS = 50;
const BAHT_PER_POINT = 10;

export interface NewOrderSummary {
  orderNo: string;
  itemCount: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly accounts = signal<MemberAccount[]>(loadAccounts());
  private readonly sessionPhone = signal<string | null>(loadSessionPhone());

  readonly profile = computed(
    () => this.accounts().find((account) => account.phone === this.sessionPhone()) ?? null,
  );
  readonly isMember = computed(() => this.profile() !== null);
  readonly tier = computed(() => tierProgress(this.profile()?.points ?? 0));

  constructor() {
    effect(() => writeJson(SESSION_KEY, this.sessionPhone()));
    effect(() => writeJson(ACCOUNTS_KEY, this.accounts()));
  }

  hasAccount(phone: string): boolean {
    return this.accounts().some((account) => account.phone === phone);
  }

  register(name: string, phone: string): MemberAccount {
    const account: MemberAccount = {
      name,
      phone,
      points: WELCOME_POINTS,
      joinedAt: new Date().toISOString(),
      orders: [],
    };
    this.accounts.update((accounts) => [
      ...accounts.filter((item) => item.phone !== phone),
      account,
    ]);
    this.sessionPhone.set(phone);
    return account;
  }

  login(phone: string): MemberAccount | null {
    const account = this.accounts().find((item) => item.phone === phone) ?? null;
    if (account) {
      this.sessionPhone.set(phone);
    }
    return account;
  }

  signOut(): void {
    this.sessionPhone.set(null);
  }

  recordOrder(summary: NewOrderSummary): number {
    const phone = this.sessionPhone();
    if (!phone || !this.profile()) {
      return 0;
    }
    const order: MemberOrder = {
      ...summary,
      placedAt: new Date().toISOString(),
      pointsEarned: Math.floor(summary.total / BAHT_PER_POINT),
    };
    this.accounts.update((accounts) =>
      accounts.map((account) =>
        account.phone === phone
          ? {
              ...account,
              points: account.points + order.pointsEarned,
              orders: [order, ...account.orders],
            }
          : account,
      ),
    );
    return order.pointsEarned;
  }
}

function loadSessionPhone(): string | null {
  const stored = readJson(SESSION_KEY);
  return typeof stored === 'string' ? stored : null;
}

function loadAccounts(): MemberAccount[] {
  const stored = readJson(ACCOUNTS_KEY);
  const accounts = (Array.isArray(stored) ? stored : [])
    .map(toMemberAccount)
    .filter((account): account is MemberAccount => account !== null);
  return accounts.some((account) => account.phone === DEMO_MEMBER.phone)
    ? accounts
    : [DEMO_MEMBER, ...accounts];
}

function toMemberAccount(value: unknown): MemberAccount | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record['name'] !== 'string' || typeof record['phone'] !== 'string') {
    return null;
  }
  return {
    name: record['name'],
    phone: record['phone'],
    points: typeof record['points'] === 'number' ? record['points'] : 0,
    joinedAt:
      typeof record['joinedAt'] === 'string' ? record['joinedAt'] : new Date().toISOString(),
    orders: Array.isArray(record['orders']) ? (record['orders'] as MemberOrder[]) : [],
  };
}
