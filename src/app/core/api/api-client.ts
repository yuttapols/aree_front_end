import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RequestOptions, toHttpContext } from '../http/http-context';
import { ApiResponse, FileUploadResponse } from './models/common.model';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, params?: QueryParams, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.get<ApiResponse<T>>(this.url(path), {
        params: toHttpParams(params),
        context: toHttpContext(options),
        withCredentials: true,
      }),
    );
  }

  post<T>(path: string, body: unknown = {}, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.post<ApiResponse<T>>(this.url(path), body, {
        context: toHttpContext(options),
        withCredentials: true,
      }),
    );
  }

  put<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.put<ApiResponse<T>>(this.url(path), body, {
        context: toHttpContext(options),
        withCredentials: true,
      }),
    );
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.patch<ApiResponse<T>>(this.url(path), body, {
        context: toHttpContext(options),
        withCredentials: true,
      }),
    );
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.delete<ApiResponse<T>>(this.url(path), {
        context: toHttpContext(options),
        withCredentials: true,
      }),
    );
  }

  upload(path: string, file: File, options?: RequestOptions): Observable<FileUploadResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.post<FileUploadResponse>(path, form, options);
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private unwrap<T>(source: Observable<ApiResponse<T>>): Observable<T> {
    return source.pipe(map((response) => response.data as T));
  }
}

function toHttpParams(params?: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}
