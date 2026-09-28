import { CartItemRequest, OrderChannel } from '../api/models/order.model';
import { DEMO_ACCOUNTS, DemoAccount } from '../data/demo-accounts';
import type { MockPromotion, MockState, MockUser } from './mock-db';
import {
  addPayment,
  attachSlip,
  cancelOrder,
  createOrder,
  priceCart,
  transitionOrder,
  verifyPayment,
} from './mock-domain';
import { SEED_CATEGORIES, SEED_OPTION_GROUPS, SEED_PRODUCTS } from './seed/catalog.seed';
import { addDays, hashPassword, nextId, pad, startOfDay } from './mock-utils';

const DEMO = {
  customer: DEMO_ACCOUNTS.find((account) => account.role === 'CUSTOMER') as DemoAccount,
  staff: DEMO_ACCOUNTS.find((account) => account.role === 'STAFF') as DemoAccount,
  admin: DEMO_ACCOUNTS.find((account) => account.role === 'ADMIN') as DemoAccount,
};

function random(seed: number): () => number {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function createUser(
  state: MockState,
  input: {
    phone: string;
    password: string;
    nickname: string;
    role: MockUser['role'];
    email?: string;
    firstName?: string;
    lastName?: string;
    createdAt: Date;
    withProfile: boolean;
  },
): MockUser {
  const id = nextId(state, 'app_user');
  const user: MockUser = {
    id,
    phone: input.phone,
    email: input.email ?? null,
    passwordHash: hashPassword(input.password),
    role: input.role,
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: input.createdAt.toISOString(),
    nickname: input.nickname,
    profile: input.withProfile
      ? {
          memberCode: `R5D-${pad(nextId(state, 'member_code'), 6)}`,
          nickname: input.nickname,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          birthDate: null,
          gender: null,
          avatarUrl: null,
          pointsBalance: 0,
          lifetimePoints: 0,
        }
      : null,
  };
  state.users.push(user);
  return user;
}

function seedPromotions(now: Date): MockPromotion[] {
  const startAt = addDays(startOfDay(now), -45).toISOString();
  const endAt = addDays(startOfDay(now), 90).toISOString();
  const base = {
    bannerUrl: null,
    maxDiscount: null,
    buyQty: null,
    getQty: null,
    minOrderAmount: 0,
    memberOnly: false,
    channel: 'ALL' as const,
    daysOfWeek: null,
    startAt,
    endAt,
    usageLimit: null,
    usagePerCustomer: null,
    usedCount: 0,
    showOnLanding: true,
    priority: 1,
    isActive: true,
    productIds: [] as number[],
    categoryIds: [] as number[],
  };
  return [
    {
      ...base,
      id: 1,
      code: null,
      name: 'ลด 10% เมื่อซื้อครบ 200 บาท',
      nameEn: '10% off orders over ฿200',
      description: 'ลดสูงสุด 50 บาท ใช้ได้ทุกช่องทาง',
      descriptionEn: 'Up to ฿50 off, every channel',
      type: 'PERCENT',
      discountValue: 10,
      maxDiscount: 50,
      minOrderAmount: 200,
      scope: 'ORDER',
    },
    {
      ...base,
      id: 2,
      code: 'WELCOME20',
      name: 'สมาชิกใหม่ลด 20 บาท',
      nameEn: 'New member ฿20 off',
      description: 'ใส่โค้ด WELCOME20 เมื่อซื้อครบ 100 บาท (1 ครั้งต่อคน)',
      descriptionEn: 'Use code WELCOME20 on orders over ฿100 (once per member)',
      type: 'FIXED_AMOUNT',
      discountValue: 20,
      minOrderAmount: 100,
      scope: 'ORDER',
      memberOnly: true,
      usagePerCustomer: 1,
      priority: 2,
    },
    {
      ...base,
      id: 3,
      code: null,
      name: 'โรตีกล้วยหอม ซื้อ 2 แถม 1',
      nameEn: 'Banana roti buy 2 get 1',
      description: 'สั่งโรตีกล้วยหอมนมสด 3 ชิ้น จ่ายแค่ 2',
      descriptionEn: 'Order 3 Banana & Fresh Milk Roti, pay for 2',
      type: 'BUY_X_GET_Y',
      discountValue: 0,
      buyQty: 2,
      getQty: 1,
      scope: 'PRODUCT',
      productIds: [1],
      priority: 3,
    },
    {
      ...base,
      id: 4,
      code: null,
      name: 'พุธแต้ม x2',
      nameEn: 'Double points Wednesday',
      description: 'สมาชิกรับแต้ม 2 เท่าทุกวันพุธ',
      descriptionEn: 'Members earn double points every Wednesday',
      type: 'POINT_MULTIPLIER',
      discountValue: 2,
      scope: 'ORDER',
      memberOnly: true,
      daysOfWeek: [3],
    },
    {
      ...base,
      id: 5,
      code: null,
      name: 'เครื่องดื่มลด 20% สั่งออนไลน์',
      nameEn: '20% off drinks online',
      description: 'ลดสูงสุด 30 บาท เฉพาะสั่งผ่านเว็บ',
      descriptionEn: 'Up to ฿30 off, web orders only',
      type: 'PERCENT',
      discountValue: 20,
      maxDiscount: 30,
      scope: 'CATEGORY',
      categoryIds: [3],
      channel: 'ONLINE',
      priority: 2,
    },
    {
      ...base,
      id: 6,
      code: 'SONGKRAN',
      name: 'สงกรานต์ลด 15%',
      nameEn: 'Songkran 15% off',
      description: 'โปรหมดอายุแล้ว',
      descriptionEn: 'Expired promotion',
      type: 'PERCENT',
      discountValue: 15,
      scope: 'ORDER',
      startAt: addDays(now, -170).toISOString(),
      endAt: addDays(now, -160).toISOString(),
      showOnLanding: false,
    },
  ];
}

function randomItems(state: MockState, rand: () => number): CartItemRequest[] {
  const available = state.products.filter((product) => product.isAvailable);
  const count = 1 + Math.floor(rand() * 3);
  return Array.from({ length: count }, () => {
    const product = pick(available, rand);
    const optionItemIds: number[] = [];
    for (const groupId of product.optionGroupIds) {
      const group = state.optionGroups.find((candidate) => candidate.id === groupId);
      if (!group) {
        continue;
      }
      if (group.minSelect > 0) {
        optionItemIds.push(pick(group.items, rand).id);
      } else if (rand() < 0.35) {
        optionItemIds.push(pick(group.items, rand).id);
      }
    }
    return { productId: product.id, quantity: rand() < 0.75 ? 1 : 2, optionItemIds };
  });
}

function seedOrder(
  state: MockState,
  rand: () => number,
  input: {
    at: Date;
    channel: OrderChannel;
    customer: MockUser | null;
    staff: MockUser;
    finalStatus:
      | 'COMPLETED'
      | 'CANCELLED'
      | 'CONFIRMED'
      | 'PREPARING'
      | 'READY'
      | 'PENDING_SLIP'
      | 'PENDING_CASH';
  },
): void {
  const balance = input.customer?.profile?.pointsBalance ?? 0;
  const redeem = input.customer && balance >= 150 && rand() < 0.15 ? 100 : null;
  let pricing;
  try {
    pricing = priceCart(state, {
      channel: input.channel,
      items: randomItems(state, rand),
      customer: input.customer,
      redeemPoints: redeem,
      now: input.at,
    });
  } catch {
    return;
  }
  const online = input.channel === 'ONLINE';
  const methodCode = online
    ? input.finalStatus === 'PENDING_CASH'
      ? 'CASH'
      : input.finalStatus === 'PENDING_SLIP'
        ? 'PROMPTPAY'
        : pick(['PROMPTPAY', 'PROMPTPAY', 'TRANSFER', 'CASH'], rand)
    : pick(['CASH', 'CASH', 'PROMPTPAY', 'CARD', 'TRANSFER'], rand);
  const order = createOrder(state, {
    channel: input.channel,
    pricing,
    customer: input.customer,
    guestName: online
      ? (input.customer?.nickname ?? pick(['คุณเอ', 'คุณบี', 'คุณซี'], rand))
      : null,
    guestPhone: online && !input.customer ? `08${Math.floor(10000000 + rand() * 89999999)}` : null,
    note: null,
    paymentMethodCode: methodCode,
    cashierId: online ? null : input.staff.id,
    now: input.at,
  });
  if (input.finalStatus === 'PENDING_CASH') {
    return;
  }
  const slipMethod = methodCode === 'PROMPTPAY' || methodCode === 'TRANSFER';
  if (online && slipMethod) {
    const payment = attachSlip(
      state,
      order,
      { methodCode, amount: order.totalAmount, slipUrl: slipPlaceholder(order.totalAmount) },
      new Date(input.at.getTime() + 60_000),
    );
    if (input.finalStatus === 'PENDING_SLIP') {
      return;
    }
    verifyPayment(state, payment, true, null, input.staff, new Date(input.at.getTime() + 180_000));
  } else if (input.finalStatus !== 'PENDING_SLIP' && order.totalAmount > 0) {
    const cash = methodCode === 'CASH';
    addPayment(
      state,
      order,
      {
        methodCode,
        amount: order.totalAmount,
        cashReceived: cash ? Math.ceil(order.totalAmount / 100) * 100 : null,
        referenceNo: methodCode === 'CARD' ? `EDC${Math.floor(rand() * 900000 + 100000)}` : null,
      },
      input.staff,
      new Date(input.at.getTime() + 60_000),
    );
  }
  if (input.finalStatus === 'CANCELLED') {
    cancelOrder(
      state,
      order,
      'ลูกค้ายกเลิก',
      new Date(input.at.getTime() + 240_000),
      input.staff.nickname,
    );
    return;
  }
  const steps: ('PREPARING' | 'READY' | 'COMPLETED')[] =
    input.finalStatus === 'CONFIRMED'
      ? []
      : input.finalStatus === 'PREPARING'
        ? ['PREPARING']
        : input.finalStatus === 'READY'
          ? ['PREPARING', 'READY']
          : ['PREPARING', 'READY', 'COMPLETED'];
  steps.forEach((step, index) =>
    transitionOrder(
      state,
      order,
      step,
      new Date(input.at.getTime() + (index + 3) * 240_000),
      input.staff.nickname,
    ),
  );
}

function slipPlaceholder(amount: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360"><rect width="240" height="360" rx="16" fill="#f6f7fb"/><rect x="0" y="0" width="240" height="70" rx="16" fill="#2c7a4b"/><text x="120" y="44" font-family="sans-serif" font-size="18" fill="#fff" text-anchor="middle">โอนเงินสำเร็จ</text><text x="120" y="150" font-family="sans-serif" font-size="14" fill="#556" text-anchor="middle">จำนวนเงิน</text><text x="120" y="190" font-family="sans-serif" font-size="30" font-weight="bold" fill="#123" text-anchor="middle">฿${amount.toFixed(2)}</text><text x="120" y="250" font-family="sans-serif" font-size="12" fill="#889" text-anchor="middle">ร้านโรตี 5 ดาว</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function seedDatabase(version: number): MockState {
  const now = new Date();
  const state: MockState = {
    version,
    settings: {
      shopName: 'โรตี5ดาว',
      shopPhone: '081-234-5678',
      address: '88 ถนนเจริญกรุง แขวงบางรัก กรุงเทพฯ 10500',
      openTime: '16:00',
      closeTime: '23:00',
      acceptOnlineOrder: true,
      promptpayId: '0812345678',
      bankAccount: 'กสิกรไทย 123-4-56789-0 (ร้านโรตี 5 ดาว)',
      earnBahtPerPoint: 25,
      redeemPointsPerBaht: 10,
      redeemMinPoints: 100,
      redeemMaxPercent: 50,
      expireDays: 365,
    },
    users: [],
    categories: structuredClone(SEED_CATEGORIES),
    products: structuredClone(SEED_PRODUCTS),
    optionGroups: structuredClone(SEED_OPTION_GROUPS),
    paymentMethods: [
      {
        id: 1,
        code: 'CASH',
        name: 'เงินสด / ชำระที่ร้าน',
        nameEn: 'Cash / Pay at store',
        requiresSlip: false,
        requiresReference: false,
        availableOnline: true,
        isActive: true,
        sortOrder: 1,
        instruction: 'ชำระที่เคาน์เตอร์ตอนรับอาหาร',
      },
      {
        id: 2,
        code: 'PROMPTPAY',
        name: 'พร้อมเพย์ QR',
        nameEn: 'PromptPay QR',
        requiresSlip: true,
        requiresReference: false,
        availableOnline: true,
        isActive: true,
        sortOrder: 2,
        instruction: 'สแกน QR แล้วแนบสลิป',
      },
      {
        id: 3,
        code: 'TRANSFER',
        name: 'โอนเงินธนาคาร',
        nameEn: 'Bank transfer',
        requiresSlip: true,
        requiresReference: false,
        availableOnline: true,
        isActive: true,
        sortOrder: 3,
        instruction: 'โอนเข้าบัญชีร้านแล้วแนบสลิป',
      },
      {
        id: 4,
        code: 'CARD',
        name: 'บัตรเครดิต/เดบิต (EDC)',
        nameEn: 'Credit/debit card (EDC)',
        requiresSlip: false,
        requiresReference: true,
        availableOnline: false,
        isActive: true,
        sortOrder: 4,
        instruction: 'รูดบัตรที่เครื่อง EDC หน้าร้าน',
      },
    ],
    orders: [],
    payments: [],
    pointTransactions: [],
    promotions: seedPromotions(now),
    promotionUsages: [],
    refreshSession: null,
    counters: {},
    sequences: {
      category: SEED_CATEGORIES.length,
      product: SEED_PRODUCTS.length,
      option_group: SEED_OPTION_GROUPS.length,
      option_item: SEED_OPTION_GROUPS.flatMap((group) => group.items).length,
      payment_method: 4,
      promotion: 6,
    },
  };

  createUser(state, {
    phone: DEMO.admin.username,
    password: DEMO.admin.password,
    nickname: 'เจ้าของร้าน',
    email: 'owner@roti5dao.com',
    role: 'ADMIN',
    createdAt: addDays(now, -400),
    withProfile: false,
  });
  const staff = createUser(state, {
    phone: DEMO.staff.username,
    password: DEMO.staff.password,
    nickname: 'น้องเมย์',
    role: 'STAFF',
    createdAt: addDays(now, -300),
    withProfile: false,
  });
  const demo = createUser(state, {
    phone: DEMO.customer.username,
    password: DEMO.customer.password,
    nickname: 'สมใจ',
    firstName: 'สมใจ',
    lastName: 'ใจดี',
    email: 'somjai@example.com',
    role: 'CUSTOMER',
    createdAt: addDays(now, -380),
    withProfile: true,
  });
  const others = [
    ['บอย', '0891112222', -200],
    ['แนน', '0863334444', -120],
    ['ต้น', '0825556666', -25],
    ['ฝน', '0957778888', -14],
    ['เจมส์', '0619990000', -6],
    ['มายด์', '0801231234', -2],
  ].map(([nickname, phone, days]) =>
    createUser(state, {
      phone: String(phone),
      password: 'roti1234',
      nickname: String(nickname),
      role: 'CUSTOMER',
      createdAt: addDays(now, Number(days)),
      withProfile: true,
    }),
  );

  if (demo.profile) {
    const bonusAt = addDays(now, -345);
    const points = 150;
    demo.profile.pointsBalance += points;
    demo.profile.lifetimePoints += points;
    state.pointTransactions.push({
      id: nextId(state, 'point_transaction'),
      customerId: demo.id,
      orderId: null,
      type: 'ADJUST',
      points,
      balanceAfter: demo.profile.pointsBalance,
      remaining: points,
      expiresAt: addDays(bonusAt, state.settings.expireDays).toISOString(),
      remark: 'โบนัสต้อนรับสมาชิก',
      createdAt: bonusAt.toISOString(),
      createdBy: 'system',
    });
  }

  const rand = random(20260926);
  const members = [demo, demo, ...others];
  const today = startOfDay(now);
  for (let offset = 29; offset >= 1; offset--) {
    const day = addDays(today, -offset);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const count = (weekend ? 6 : 3) + Math.floor(rand() * 4);
    for (let index = 0; index < count; index++) {
      const minutes = 16 * 60 + Math.floor(rand() * 400);
      const at = new Date(day.getTime() + minutes * 60_000);
      const eligibleMembers = members.filter((member) => new Date(member.createdAt) <= at);
      const customer = rand() < 0.5 && eligibleMembers.length ? pick(eligibleMembers, rand) : null;
      seedOrder(state, rand, {
        at,
        channel: rand() < 0.6 ? 'WALK_IN' : 'ONLINE',
        customer,
        staff,
        finalStatus: rand() < 0.05 ? 'CANCELLED' : 'COMPLETED',
      });
    }
  }

  const todayPlan: {
    minutesAgo: number;
    channel: OrderChannel;
    customer: MockUser | null;
    status: Parameters<typeof seedOrder>[2]['finalStatus'];
  }[] = [
    { minutesAgo: 95, channel: 'WALK_IN', customer: null, status: 'COMPLETED' },
    { minutesAgo: 80, channel: 'ONLINE', customer: others[0] ?? null, status: 'COMPLETED' },
    { minutesAgo: 26, channel: 'WALK_IN', customer: null, status: 'READY' },
    { minutesAgo: 18, channel: 'ONLINE', customer: others[1] ?? null, status: 'PREPARING' },
    { minutesAgo: 12, channel: 'WALK_IN', customer: others[2] ?? null, status: 'PREPARING' },
    { minutesAgo: 7, channel: 'WALK_IN', customer: null, status: 'CONFIRMED' },
    { minutesAgo: 5, channel: 'ONLINE', customer: null, status: 'PENDING_SLIP' },
    { minutesAgo: 3, channel: 'ONLINE', customer: others[3] ?? null, status: 'PENDING_SLIP' },
    { minutesAgo: 2, channel: 'ONLINE', customer: null, status: 'PENDING_CASH' },
  ];
  for (const plan of todayPlan) {
    seedOrder(state, rand, {
      at: new Date(now.getTime() - plan.minutesAgo * 60_000),
      channel: plan.channel,
      customer: plan.customer,
      staff,
      finalStatus: plan.status,
    });
  }

  return state;
}
