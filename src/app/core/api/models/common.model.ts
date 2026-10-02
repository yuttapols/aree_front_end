export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'NOT_FOUND'
  | 'PHONE_ALREADY_USED'
  | 'EMAIL_ALREADY_USED'
  | 'DUPLICATE_VALUE'
  | 'CONCURRENT_UPDATE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'ONLINE_ORDER_CLOSED'
  | 'PRODUCT_UNAVAILABLE'
  | 'OPTION_INVALID'
  | 'ORDER_INVALID_STATUS'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'PAYMENT_METHOD_UNAVAILABLE'
  | 'SLIP_REQUIRED'
  | 'REFERENCE_REQUIRED'
  | 'TOO_MANY_PENDING_PAYMENTS'
  | 'POINT_INSUFFICIENT'
  | 'POINT_BELOW_MIN'
  | 'POINT_EXCEED_LIMIT'
  | 'PROMOTION_NOT_FOUND'
  | 'PROMOTION_EXPIRED'
  | 'PROMOTION_NOT_ELIGIBLE'
  | 'PROMOTION_LIMIT_REACHED'
  | 'INVALID_OPERATION'
  | 'FILE_INVALID'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export const ERROR_CODES: readonly ErrorCode[] = [
  'VALIDATION_ERROR',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'ACCOUNT_SUSPENDED',
  'PASSWORD_CHANGE_REQUIRED',
  'NOT_FOUND',
  'PHONE_ALREADY_USED',
  'EMAIL_ALREADY_USED',
  'DUPLICATE_VALUE',
  'CONCURRENT_UPDATE',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'ACCOUNT_LOCKED',
  'RATE_LIMITED',
  'ONLINE_ORDER_CLOSED',
  'PRODUCT_UNAVAILABLE',
  'OPTION_INVALID',
  'ORDER_INVALID_STATUS',
  'PAYMENT_AMOUNT_MISMATCH',
  'PAYMENT_METHOD_UNAVAILABLE',
  'SLIP_REQUIRED',
  'REFERENCE_REQUIRED',
  'TOO_MANY_PENDING_PAYMENTS',
  'POINT_INSUFFICIENT',
  'POINT_BELOW_MIN',
  'POINT_EXCEED_LIMIT',
  'PROMOTION_NOT_FOUND',
  'PROMOTION_EXPIRED',
  'PROMOTION_NOT_ELIGIBLE',
  'PROMOTION_LIMIT_REACHED',
  'INVALID_OPERATION',
  'FILE_INVALID',
  'NETWORK_ERROR',
  'INTERNAL_ERROR',
];

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  fields: FieldError[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface PageQuery {
  page: number;
  size: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface FileUploadResponse {
  url: string;
}

export interface PlatePaletteDto {
  base: string;
  main: string;
  accent: string;
  garnish: string;
}

export class ApiException extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly fields: FieldError[] = [],
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
  }
}
