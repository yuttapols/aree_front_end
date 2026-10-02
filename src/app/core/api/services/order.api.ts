import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';
import { PageResponse } from '../models/common.model';
import {
  AddPaymentRequest,
  AdminQuoteRequest,
  AttachSlipRequest,
  CreateOnlineOrderRequest,
  CreatePosOrderRequest,
  KitchenBoardResponse,
  OrderChannel,
  OrderQuery,
  OrderResponse,
  OrderStatus,
  PaymentMethodResponse,
  PaymentMethodUpsertRequest,
  PaymentResponse,
  PaymentStatus,
  PendingPaymentItem,
  QuoteRequest,
  QuoteResponse,
  ReceiptResponse,
  TodayResponse,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderApi {
  private readonly api = inject(ApiClient);

  paymentMethods(channel: OrderChannel): Observable<PaymentMethodResponse[]> {
    return this.api.get<PaymentMethodResponse[]>('/public/payment-methods', { channel });
  }

  quote(request: QuoteRequest): Observable<QuoteResponse> {
    return this.api.post<QuoteResponse>('/public/orders/quote', request, { background: true });
  }

  createOnline(request: CreateOnlineOrderRequest): Observable<OrderResponse> {
    return this.api.post<OrderResponse>('/public/orders', request);
  }

  track(token: string, background = false): Observable<OrderResponse> {
    return this.api.get<OrderResponse>(`/public/orders/track/${token}`, undefined, { background });
  }

  attachSlip(token: string, request: AttachSlipRequest): Observable<PaymentResponse> {
    const form = new FormData();
    form.append('methodCode', request.methodCode);
    if (request.amount != null) {
      form.append('amount', String(request.amount));
    }
    if (request.referenceNo) {
      form.append('referenceNo', request.referenceNo);
    }
    form.append('slip', request.slip);
    return this.api.post<PaymentResponse>(`/public/orders/track/${token}/payments`, form);
  }

  myOrders(page: number, size: number): Observable<PageResponse<OrderResponse>> {
    return this.api.get<PageResponse<OrderResponse>>('/me/orders', { page, size });
  }

  myOrder(orderNo: string): Observable<OrderResponse> {
    return this.api.get<OrderResponse>(`/me/orders/${orderNo}`);
  }

  createPos(request: CreatePosOrderRequest): Observable<OrderResponse> {
    return this.api.post<OrderResponse>('/admin/orders', request);
  }

  adminQuote(request: AdminQuoteRequest): Observable<QuoteResponse> {
    return this.api.post<QuoteResponse>('/admin/orders/quote', request, { background: true });
  }

  addPayment(orderId: number, request: AddPaymentRequest): Observable<OrderResponse> {
    return this.api.post<OrderResponse>(`/admin/orders/${orderId}/payments`, request);
  }

  orders(query: OrderQuery): Observable<PageResponse<OrderResponse>> {
    return this.api.get<PageResponse<OrderResponse>>('/admin/orders', { ...query });
  }

  order(id: number): Observable<OrderResponse> {
    return this.api.get<OrderResponse>(`/admin/orders/${id}`);
  }

  board(): Observable<KitchenBoardResponse> {
    return this.api.get<KitchenBoardResponse>('/admin/orders/board', undefined, {
      background: true,
    });
  }

  updateStatus(id: number, status: OrderStatus): Observable<OrderResponse> {
    return this.api.patch<OrderResponse>(`/admin/orders/${id}/status`, { status });
  }

  cancel(id: number, reason: string): Observable<OrderResponse> {
    return this.api.post<OrderResponse>(`/admin/orders/${id}/cancel`, { reason });
  }

  receipt(id: number): Observable<ReceiptResponse> {
    return this.api.get<ReceiptResponse>(`/admin/orders/${id}/receipt`);
  }

  payments(status: PaymentStatus, background = false): Observable<PendingPaymentItem[]> {
    return this.api.get<PendingPaymentItem[]>('/admin/payments', { status }, { background });
  }

  slip(paymentId: number): Observable<Blob> {
    return this.api.getBlob(`/admin/payments/${paymentId}/slip`);
  }

  verifyPayment(
    id: number,
    approve: boolean,
    rejectReason: string | null,
  ): Observable<PaymentResponse> {
    return this.api.patch<PaymentResponse>(`/admin/payments/${id}/verify`, {
      approve,
      rejectReason,
    });
  }

  today(): Observable<TodayResponse> {
    return this.api.get<TodayResponse>('/admin/dashboard/today', undefined, { background: true });
  }

  adminPaymentMethods(): Observable<PaymentMethodResponse[]> {
    return this.api.get<PaymentMethodResponse[]>('/admin/payment-methods');
  }

  createPaymentMethod(request: PaymentMethodUpsertRequest): Observable<PaymentMethodResponse> {
    return this.api.post<PaymentMethodResponse>('/admin/payment-methods', request);
  }

  updatePaymentMethod(
    id: number,
    request: PaymentMethodUpsertRequest,
  ): Observable<PaymentMethodResponse> {
    return this.api.put<PaymentMethodResponse>(`/admin/payment-methods/${id}`, request);
  }
}
