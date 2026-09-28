import { Injectable, computed, signal } from '@angular/core';

import { MeResponse, UserRole } from '../api/models/user.model';
import { accessTokenExpiry } from './token-expiry';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly token = signal<string | null>(null);
  private readonly currentUser = signal<MeResponse | null>(null);

  readonly accessToken = this.token.asReadonly();
  readonly user = this.currentUser.asReadonly();
  readonly tokenExpiresAt = computed(() => {
    const token = this.token();
    return token ? accessTokenExpiry(token) : null;
  });
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  readonly isCustomer = computed(() => this.role() === 'CUSTOMER');
  readonly isStaff = computed(() => this.role() === 'STAFF' || this.role() === 'ADMIN');
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly pointsBalance = computed(() => this.currentUser()?.pointsBalance ?? 0);

  setSession(accessToken: string, user: MeResponse): void {
    this.token.set(accessToken);
    this.currentUser.set(user);
  }

  setAccessToken(accessToken: string): void {
    this.token.set(accessToken);
  }

  setUser(user: MeResponse): void {
    this.currentUser.set(user);
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  clear(): void {
    this.token.set(null);
    this.currentUser.set(null);
  }
}
