export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface MeResponse {
  id: number;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  nickname: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: Gender | null;
  avatarUrl: string | null;
  memberCode: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: MeResponse;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  nickname: string;
  email?: string | null;
}

export interface ProfileUpdateRequest {
  nickname: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  birthDate: string | null;
  gender: Gender | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CustomerResponse {
  id: number;
  memberCode: string;
  phone: string;
  email: string | null;
  nickname: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  status: UserStatus;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface QuickRegisterRequest {
  nickname: string;
  phone: string;
}

export interface TemporaryPasswordResponse {
  temporaryPassword: string;
}

export interface QuickRegisterResponse extends TemporaryPasswordResponse {
  customer: CustomerResponse;
}

export interface StaffResponse {
  id: number;
  phone: string;
  email: string | null;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffUpsertRequest {
  phone: string;
  email: string | null;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  password?: string | null;
}

export interface ShopInfoResponse {
  name: string;
  phone: string;
  address: string;
  openTime: string;
  closeTime: string;
  acceptOnlineOrder: boolean;
  isOpenNow: boolean;
}

export interface ShopSettings {
  shopName: string;
  shopPhone: string;
  address: string;
  openTime: string;
  closeTime: string;
  acceptOnlineOrder: boolean;
  promptpayId: string;
  bankAccount: string;
  earnBahtPerPoint: number;
  redeemPointsPerBaht: number;
  redeemMinPoints: number;
  redeemMaxPercent: number;
  expireDays: number;
}
