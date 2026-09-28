import {
  CategoryResponse,
  OptionGroupResponse,
  ProductResponse,
} from '../api/models/catalog.model';
import { PromotionResponse, PointTransactionType } from '../api/models/loyalty.model';
import {
  OrderChannel,
  OrderItemResponse,
  OrderStatus,
  PaymentMethodResponse,
  PaymentStatus,
  AppliedPromotion,
} from '../api/models/order.model';
import { Gender, ShopSettings, UserRole, UserStatus } from '../api/models/user.model';
import { seedDatabase } from './mock-seed';

const STORAGE_KEY = 'roti.mock.db';
const SCHEMA_VERSION = 3;

export interface MockProfile {
  memberCode: string;
  nickname: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  gender: Gender | null;
  avatarUrl: string | null;
  pointsBalance: number;
  lifetimePoints: number;
}

export interface MockUser {
  id: number;
  phone: string;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  nickname: string;
  profile: MockProfile | null;
}

export type MockCategory = Omit<CategoryResponse, 'productCount'>;
export type MockProduct = Omit<ProductResponse, 'categoryName'>;
export type MockOptionGroup = OptionGroupResponse;
export type MockPaymentMethod = Omit<PaymentMethodResponse, 'promptpayId'>;

export interface MockOrder {
  id: number;
  orderNo: string;
  trackingToken: string;
  channel: OrderChannel;
  status: OrderStatus;
  customerId: number | null;
  guestName: string | null;
  guestPhone: string | null;
  items: OrderItemResponse[];
  subtotal: number;
  promotionDiscount: number;
  pointDiscount: number;
  totalAmount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  pointsToEarn: number;
  pointMultiplier: number;
  note: string | null;
  queueNo: number;
  cashierId: number | null;
  paymentMethodCode: string | null;
  appliedPromotions: AppliedPromotion[];
  createdAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface MockPayment {
  id: number;
  orderId: number;
  methodCode: string;
  amount: number;
  cashReceived: number | null;
  changeAmount: number | null;
  referenceNo: string | null;
  slipUrl: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  verifiedBy: number | null;
  rejectReason: string | null;
  createdAt: string;
}

export interface MockPointTransaction {
  id: number;
  customerId: number;
  orderId: number | null;
  type: PointTransactionType;
  points: number;
  balanceAfter: number;
  remaining: number | null;
  expiresAt: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: string | null;
}

export type MockPromotion = PromotionResponse;

export interface MockPromotionUsage {
  id: number;
  promotionId: number;
  orderId: number;
  customerId: number | null;
  discountAmount: number;
  createdAt: string;
}

export interface MockRefreshSession {
  userId: number;
  expiresAt: number;
}

export interface MockState {
  version: number;
  settings: ShopSettings;
  users: MockUser[];
  categories: MockCategory[];
  products: MockProduct[];
  optionGroups: MockOptionGroup[];
  paymentMethods: MockPaymentMethod[];
  orders: MockOrder[];
  payments: MockPayment[];
  pointTransactions: MockPointTransaction[];
  promotions: MockPromotion[];
  promotionUsages: MockPromotionUsage[];
  refreshSession: MockRefreshSession | null;
  counters: Record<string, number>;
  sequences: Record<string, number>;
}

export class MockDatabase {
  state: MockState = this.load();

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      return;
    }
  }

  reset(): void {
    this.state = seedDatabase(SCHEMA_VERSION);
    this.save();
  }

  private load(): MockState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as MockState) : null;
      if (parsed && parsed.version === SCHEMA_VERSION) {
        return parsed;
      }
    } catch {
      return seedDatabase(SCHEMA_VERSION);
    }
    const seeded = seedDatabase(SCHEMA_VERSION);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch {
      return seeded;
    }
    return seeded;
  }
}
