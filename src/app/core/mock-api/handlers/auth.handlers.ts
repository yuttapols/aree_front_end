import { FieldError } from '../../api/models/common.model';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdateRequest,
  RegisterRequest,
} from '../../api/models/user.model';
import type { MockState, MockUser } from '../mock-db';
import { findUser, nextMemberCode, toMe, toOrder, toPointTransaction } from '../mock-domain';
import { MockRouter, bodyOf, queryNumber, requireUser } from '../mock-router';
import {
  MockHttpError,
  addDays,
  badRequest,
  hashPassword,
  isEmail,
  isThaiPhone,
  nextId,
  normalizePhone,
  notFound,
  paginate,
  required,
} from '../mock-utils';

const ACCESS_TOKEN_TTL_MS: Record<MockUser['role'], number> = {
  CUSTOMER: 5 * 60 * 1000,
  STAFF: 15 * 60 * 1000,
  ADMIN: 15 * 60 * 1000,
};
const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SIGNATURE_PREFIX_LENGTH = 5;

function sign(userId: number, expiresAt: number): string {
  return hashPassword(`${userId}:${expiresAt}`).slice(SIGNATURE_PREFIX_LENGTH);
}

export function issueAccessToken(user: MockUser, now: Date): string {
  const expiresAt = now.getTime() + ACCESS_TOKEN_TTL_MS[user.role];
  return `mock.${user.id}.${expiresAt}.${sign(user.id, expiresAt)}`;
}

export function authenticate(state: MockState, header: string | null, now: Date): MockUser | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const [prefix, id, expiresAt, signature] = header.slice(7).split('.');
  const valid = prefix === 'mock' && signature === sign(Number(id), Number(expiresAt));
  const user = valid ? findUser(state, Number(id)) : null;
  if (!user || user.status !== 'ACTIVE') {
    throw new MockHttpError(401, 'UNAUTHORIZED', 'Invalid token');
  }
  if (Number(expiresAt) < now.getTime()) {
    throw new MockHttpError(401, 'TOKEN_EXPIRED', 'Token expired');
  }
  return user;
}

function session(state: MockState, user: MockUser, now: Date): AuthResponse {
  state.refreshSession = { userId: user.id, expiresAt: now.getTime() + REFRESH_TOKEN_TTL_MS };
  return { accessToken: issueAccessToken(user, now), user: toMe(user) };
}

function findByUsername(state: MockState, username: string): MockUser | null {
  const value = username.trim().toLowerCase();
  const phone = normalizePhone(value);
  return (
    state.users.find(
      (user) => (phone.length >= 9 && user.phone === phone) || user.email?.toLowerCase() === value,
    ) ?? null
  );
}

export function assertUniqueContact(
  state: MockState,
  phone: string,
  email: string | null,
  ignoreUserId?: number,
): void {
  if (state.users.some((user) => user.phone === phone && user.id !== ignoreUserId)) {
    throw new MockHttpError(409, 'PHONE_ALREADY_USED', phone);
  }
  if (
    email &&
    state.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase() && user.id !== ignoreUserId,
    )
  ) {
    throw new MockHttpError(409, 'EMAIL_ALREADY_USED', email);
  }
}

export function createCustomer(
  state: MockState,
  input: { phone: string; password: string; nickname: string; email: string | null },
  now: Date,
): MockUser {
  const user: MockUser = {
    id: nextId(state, 'app_user'),
    phone: input.phone,
    email: input.email,
    passwordHash: hashPassword(input.password),
    role: 'CUSTOMER',
    status: 'ACTIVE',
    lastLoginAt: now.toISOString(),
    createdAt: now.toISOString(),
    nickname: input.nickname,
    passwordChangeRequired: false,
    profile: {
      memberCode: nextMemberCode(state),
      nickname: input.nickname,
      firstName: null,
      lastName: null,
      birthDate: null,
      gender: null,
      avatarUrl: null,
      pointsBalance: 0,
      lifetimePoints: 0,
    },
  };
  state.users.push(user);
  return user;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function readUploadedImage(body: unknown, field = 'file'): Promise<string> {
  const file = body instanceof FormData ? body.get(field) : null;
  if (!(file instanceof Blob)) {
    throw new MockHttpError(400, 'FILE_INVALID', 'file is required');
  }
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
    throw new MockHttpError(400, 'FILE_INVALID', `${file.type} ${file.size}`);
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new MockHttpError(400, 'FILE_INVALID', 'read failed'));
    reader.readAsDataURL(file);
  });
}

export function registerAuthHandlers(router: MockRouter): void {
  router
    .post('/auth/register', ({ state, body, now }) => {
      const request = (body ?? {}) as RegisterRequest;
      const fields: FieldError[] = [];
      required(request.nickname, 'nickname', fields);
      required(request.phone, 'phone', fields);
      required(request.password, 'password', fields);
      const phone = normalizePhone(request.phone ?? '');
      if (request.phone && !isThaiPhone(phone)) {
        fields.push({ field: 'phone', message: 'phone format' });
      }
      if ((request.password ?? '').length < 8) {
        fields.push({ field: 'password', message: 'password min 8' });
      }
      const email = request.email?.trim() || null;
      if (email && !isEmail(email)) {
        fields.push({ field: 'email', message: 'email format' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      assertUniqueContact(state, phone, email);
      const user = createCustomer(
        state,
        { phone, password: request.password, nickname: request.nickname.trim(), email },
        now,
      );
      return session(state, user, now);
    })
    .post('/auth/login', ({ state, body, now }) => {
      const request = (body ?? {}) as LoginRequest;
      const user = findByUsername(state, request.username ?? '');
      if (!user || user.passwordHash !== hashPassword(request.password ?? '')) {
        throw new MockHttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
      }
      if (user.status !== 'ACTIVE') {
        throw new MockHttpError(403, 'FORBIDDEN', 'Account suspended');
      }
      user.lastLoginAt = now.toISOString();
      return session(state, user, now);
    })
    .post('/auth/refresh', ({ state, now }) => {
      const current = state.refreshSession;
      const user = current ? findUser(state, current.userId) : null;
      if (!current || !user || current.expiresAt < now.getTime() || user.status !== 'ACTIVE') {
        state.refreshSession = null;
        throw new MockHttpError(401, 'UNAUTHORIZED', 'No session');
      }
      return session(state, user, now);
    })
    .post('/auth/logout', ({ state }) => {
      state.refreshSession = null;
      return null;
    })
    .get('/me', (context) => toMe(requireUser(context)))
    .get('/me/profile', (context) => toMe(requireUser(context)))
    .put('/me/profile', (context) => {
      const user = requireUser(context);
      const request = bodyOf<ProfileUpdateRequest>(context);
      const fields: FieldError[] = [];
      required(request.nickname, 'nickname', fields);
      const email = request.email?.trim() || null;
      if (email && !isEmail(email)) {
        fields.push({ field: 'email', message: 'email format' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      assertUniqueContact(context.state, user.phone, email, user.id);
      user.nickname = request.nickname.trim();
      user.email = email;
      if (user.profile) {
        user.profile.nickname = user.nickname;
        user.profile.firstName = request.firstName?.trim() || null;
        user.profile.lastName = request.lastName?.trim() || null;
        user.profile.birthDate = request.birthDate || null;
        user.profile.gender = request.gender ?? null;
      }
      return toMe(user);
    })
    .post('/me/profile/avatar', async (context) => {
      const user = requireUser(context);
      const url = await readUploadedImage(context.body);
      if (user.profile) {
        user.profile.avatarUrl = url;
      }
      return toMe(user);
    })
    .put('/me/password', (context) => {
      const user = requireUser(context);
      const request = bodyOf<ChangePasswordRequest>(context);
      if (user.passwordHash !== hashPassword(request.currentPassword ?? '')) {
        throw new MockHttpError(401, 'INVALID_CREDENTIALS', 'Wrong password');
      }
      if ((request.newPassword ?? '').length < 8) {
        throw badRequest('Validation failed', [{ field: 'newPassword', message: 'min 8' }]);
      }
      user.passwordHash = hashPassword(request.newPassword);
      user.passwordChangeRequired = false;
      return session(context.state, user, context.now);
    })
    .get('/me/orders', (context) => {
      const user = requireUser(context);
      const orders = context.state.orders
        .filter((order) => order.customerId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((order) => toOrder(context.state, order));
      return paginate(orders, queryNumber(context, 'page', 0), queryNumber(context, 'size', 10));
    })
    .get('/me/orders/:orderNo', (context) => {
      const user = requireUser(context);
      const order = context.state.orders.find(
        (candidate) =>
          candidate.orderNo === context.params['orderNo'] && candidate.customerId === user.id,
      );
      if (!order) {
        throw notFound('Order not found');
      }
      return toOrder(context.state, order);
    })
    .get('/me/points', (context) => {
      const user = requireUser(context);
      const settings = context.state.settings;
      const horizon = addDays(context.now, 30).getTime();
      const expiring = context.state.pointTransactions
        .filter(
          (transaction) =>
            transaction.customerId === user.id &&
            (transaction.remaining ?? 0) > 0 &&
            transaction.expiresAt !== null &&
            new Date(transaction.expiresAt).getTime() <= horizon,
        )
        .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
      return {
        pointsBalance: user.profile?.pointsBalance ?? 0,
        lifetimePoints: user.profile?.lifetimePoints ?? 0,
        expiringPoints: expiring.reduce((total, chunk) => total + (chunk.remaining ?? 0), 0),
        expiringAt: expiring[0]?.expiresAt ?? null,
        earnBahtPerPoint: settings.earnBahtPerPoint,
        redeemPointsPerBaht: settings.redeemPointsPerBaht,
        redeemMinPoints: settings.redeemMinPoints,
        redeemMaxPercent: settings.redeemMaxPercent,
        expireDays: settings.expireDays,
      };
    })
    .get('/me/points/transactions', (context) => {
      const user = requireUser(context);
      const transactions = context.state.pointTransactions
        .filter((transaction) => transaction.customerId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .map((transaction) => toPointTransaction(context.state, transaction));
      return paginate(
        transactions,
        queryNumber(context, 'page', 0),
        queryNumber(context, 'size', 10),
      );
    })
    .post('/files', async (context) => {
      requireUser(context);
      return { url: await readUploadedImage(context.body) };
    });
}
