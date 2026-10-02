import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';
import {
  CategoryResponse,
  CategoryUpsertRequest,
  MenuResponse,
  OptionGroupResponse,
  OptionGroupUpsertRequest,
  ProductQuery,
  ProductResponse,
  ProductOptionGroupBinding,
  ProductUpsertRequest,
  ProductDetailResponse,
  SortOrderItem,
} from '../models/catalog.model';
import { PageResponse } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly api = inject(ApiClient);

  menu(): Observable<MenuResponse> {
    return this.api.get<MenuResponse>('/public/menu');
  }

  publicProduct(id: number): Observable<ProductDetailResponse> {
    return this.api.get<ProductDetailResponse>(`/public/products/${id}`);
  }

  categories(): Observable<CategoryResponse[]> {
    return this.api.get<CategoryResponse[]>('/admin/categories');
  }

  createCategory(request: CategoryUpsertRequest): Observable<CategoryResponse> {
    return this.api.post<CategoryResponse>('/admin/categories', request);
  }

  updateCategory(id: number, request: CategoryUpsertRequest): Observable<CategoryResponse> {
    return this.api.put<CategoryResponse>(`/admin/categories/${id}`, request);
  }

  deleteCategory(id: number): Observable<void> {
    return this.api.delete<void>(`/admin/categories/${id}`);
  }

  sortCategories(items: SortOrderItem[]): Observable<void> {
    return this.api.patch<void>('/admin/categories/sort', items);
  }

  products(query: ProductQuery): Observable<PageResponse<ProductResponse>> {
    return this.api.get<PageResponse<ProductResponse>>('/admin/products', { ...query });
  }

  createProduct(request: ProductUpsertRequest): Observable<ProductResponse> {
    return this.api.post<ProductResponse>('/admin/products', request);
  }

  updateProduct(id: number, request: ProductUpsertRequest): Observable<ProductResponse> {
    return this.api.put<ProductResponse>(`/admin/products/${id}`, request);
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(`/admin/products/${id}`);
  }

  setAvailability(id: number, available: boolean): Observable<ProductResponse> {
    return this.api.patch<ProductResponse>(`/admin/products/${id}/availability`, { available });
  }

  setProductOptionGroups(
    id: number,
    bindings: ProductOptionGroupBinding[],
  ): Observable<ProductResponse> {
    return this.api.put<ProductResponse>(`/admin/products/${id}/option-groups`, bindings);
  }

  optionGroups(): Observable<OptionGroupResponse[]> {
    return this.api.get<OptionGroupResponse[]>('/admin/option-groups');
  }

  createOptionGroup(request: OptionGroupUpsertRequest): Observable<OptionGroupResponse> {
    return this.api.post<OptionGroupResponse>('/admin/option-groups', request);
  }

  updateOptionGroup(
    id: number,
    request: OptionGroupUpsertRequest,
  ): Observable<OptionGroupResponse> {
    return this.api.put<OptionGroupResponse>(`/admin/option-groups/${id}`, request);
  }

  deleteOptionGroup(id: number): Observable<void> {
    return this.api.delete<void>(`/admin/option-groups/${id}`);
  }
}
