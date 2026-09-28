import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';
import { PageResponse } from '../models/common.model';
import { OrderResponse } from '../models/order.model';
import {
  AdjustPointsRequest,
  PointSummaryResponse,
  PointTransactionResponse,
} from '../models/loyalty.model';
import {
  ChangePasswordRequest,
  CustomerResponse,
  MeResponse,
  ProfileUpdateRequest,
  QuickRegisterRequest,
  QuickRegisterResponse,
  ShopInfoResponse,
  ShopSettings,
  StaffResponse,
  StaffUpsertRequest,
  TemporaryPasswordResponse,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly api = inject(ApiClient);

  shopInfo(): Observable<ShopInfoResponse> {
    return this.api.get<ShopInfoResponse>('/public/shop-info', undefined, { background: true });
  }

  updateProfile(request: ProfileUpdateRequest): Observable<MeResponse> {
    return this.api.put<MeResponse>('/me/profile', request);
  }

  uploadAvatar(file: File): Observable<MeResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<MeResponse>('/me/profile/avatar', form);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.put<void>('/me/password', request, { silent: true });
  }

  myPoints(): Observable<PointSummaryResponse> {
    return this.api.get<PointSummaryResponse>('/me/points');
  }

  myPointTransactions(
    page: number,
    size: number,
  ): Observable<PageResponse<PointTransactionResponse>> {
    return this.api.get<PageResponse<PointTransactionResponse>>('/me/points/transactions', {
      page,
      size,
    });
  }

  customers(
    page: number,
    size: number,
    keyword: string,
  ): Observable<PageResponse<CustomerResponse>> {
    return this.api.get<PageResponse<CustomerResponse>>('/admin/customers', {
      page,
      size,
      keyword,
    });
  }

  customer(id: number): Observable<CustomerResponse> {
    return this.api.get<CustomerResponse>(`/admin/customers/${id}`);
  }

  lookupCustomer(phoneOrCode: string): Observable<CustomerResponse> {
    return this.api.get<CustomerResponse>(
      '/admin/customers/lookup',
      { phone: phoneOrCode },
      { silent: true },
    );
  }

  quickRegister(request: QuickRegisterRequest): Observable<QuickRegisterResponse> {
    return this.api.post<QuickRegisterResponse>('/admin/customers/quick-register', request);
  }

  customerOrders(id: number, page: number, size: number): Observable<PageResponse<OrderResponse>> {
    return this.api.get<PageResponse<OrderResponse>>(`/admin/customers/${id}/orders`, {
      page,
      size,
    });
  }

  customerPoints(
    id: number,
    page: number,
    size: number,
  ): Observable<PageResponse<PointTransactionResponse>> {
    return this.api.get<PageResponse<PointTransactionResponse>>(
      `/admin/customers/${id}/points/transactions`,
      { page, size },
    );
  }

  adjustPoints(id: number, request: AdjustPointsRequest): Observable<PointTransactionResponse> {
    return this.api.post<PointTransactionResponse>(`/admin/customers/${id}/points/adjust`, request);
  }

  staff(): Observable<StaffResponse[]> {
    return this.api.get<StaffResponse[]>('/admin/staff');
  }

  createStaff(request: StaffUpsertRequest): Observable<StaffResponse> {
    return this.api.post<StaffResponse>('/admin/staff', request);
  }

  updateStaff(id: number, request: StaffUpsertRequest): Observable<StaffResponse> {
    return this.api.put<StaffResponse>(`/admin/staff/${id}`, request);
  }

  resetStaffPassword(id: number): Observable<TemporaryPasswordResponse> {
    return this.api.post<TemporaryPasswordResponse>(`/admin/staff/${id}/reset-password`);
  }

  settings(): Observable<ShopSettings> {
    return this.api.get<ShopSettings>('/admin/settings');
  }

  updateSettings(request: ShopSettings): Observable<ShopSettings> {
    return this.api.put<ShopSettings>('/admin/settings', request);
  }
}
