import { ErrorCode, FieldError, PageResponse } from '../api/models/common.model';
import type { MockState } from './mock-db';

export class MockHttpError {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly message: string,
    readonly fields: FieldError[] = [],
  ) {}
}

export function badRequest(message: string, fields: FieldError[] = []): MockHttpError {
  return new MockHttpError(400, 'VALIDATION_ERROR', message, fields);
}

export function notFound(message = 'Not found'): MockHttpError {
  return new MockHttpError(404, 'NOT_FOUND', message);
}

export function unprocessable(code: ErrorCode, message: string): MockHttpError {
  return new MockHttpError(422, code, message);
}

export interface MockBlobResult {
  __mockBlob: true;
  dataUrl: string;
}

export function blobResult(dataUrl: string): MockBlobResult {
  return { __mockBlob: true, dataUrl };
}

export function isMockBlobResult(value: unknown): value is MockBlobResult {
  return typeof value === 'object' && value !== null && '__mockBlob' in value;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function nextId(state: MockState, table: string): number {
  const next = (state.sequences[table] ?? 0) + 1;
  state.sequences[table] = next;
  return next;
}

export function nextDailyCounter(state: MockState, key: string): number {
  const next = (state.counters[key] ?? 0) + 1;
  state.counters[key] = next;
  return next;
}

export function hashPassword(password: string): string {
  let hash = 5381;
  const salted = `roti5dao:${password}`;
  for (let index = 0; index < salted.length; index++) {
    hash = ((hash << 5) + hash + salted.charCodeAt(index)) | 0;
  }
  return `mock$${(hash >>> 0).toString(16)}`;
}

export function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const hex = randomToken();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function temporaryPassword(): string {
  return `R5D${Math.floor(100000 + Math.random() * 900000)}`;
}

export function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function orderNoDate(date: Date): string {
  return `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function isoDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function paginate<T>(items: T[], page: number, size: number): PageResponse<T> {
  const safeSize = Math.max(1, size || 10);
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(0, page || 0), totalPages - 1);
  return {
    items: items.slice(safePage * safeSize, safePage * safeSize + safeSize),
    page: safePage,
    size: safeSize,
    totalItems: items.length,
    totalPages,
  };
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isThaiPhone(phone: string): boolean {
  return /^0\d{9}$/.test(normalizePhone(phone));
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function required(value: unknown, field: string, fields: FieldError[]): void {
  if (value === null || value === undefined || String(value).trim() === '') {
    fields.push({ field, message: `${field} is required` });
  }
}
