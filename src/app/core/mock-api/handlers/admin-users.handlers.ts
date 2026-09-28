import { FieldError } from '../../api/models/common.model';
import { AdjustPointsRequest } from '../../api/models/loyalty.model';
import { PaymentMethodUpsertRequest } from '../../api/models/order.model';
import {
  QuickRegisterRequest,
  ShopSettings,
  StaffUpsertRequest,
} from '../../api/models/user.model';
import type { MockUser } from '../mock-db';
import {
  adjustPoints,
  findCustomerByPhone,
  toCustomer,
  toOrder,
  toPaymentMethod,
  toPointTransaction,
  toStaff,
} from '../mock-domain';
import {
  MockContext,
  MockRouter,
  bodyOf,
  numberParam,
  queryNumber,
  queryString,
  requireAdmin,
  requireStaff,
} from '../mock-router';
import {
  badRequest,
  hashPassword,
  isEmail,
  isThaiPhone,
  nextId,
  normalizePhone,
  notFound,
  paginate,
  required,
  temporaryPassword,
} from '../mock-utils';
import { assertUniqueContact, createCustomer } from './auth.handlers';

function requireCustomer(context: MockContext): MockUser {
  const customer = context.state.users.find(
    (user) => user.id === numberParam(context, 'id') && user.profile !== null,
  );
  if (!customer) {
    throw notFound('Customer not found');
  }
  return customer;
}

function requireStaffMember(context: MockContext): MockUser {
  const staff = context.state.users.find(
    (user) => user.id === numberParam(context, 'id') && user.role !== 'CUSTOMER',
  );
  if (!staff) {
    throw notFound('Staff not found');
  }
  return staff;
}

export function registerAdminUserHandlers(router: MockRouter): void {
  router
    .get('/admin/customers', (context) => {
      requireStaff(context);
      const keyword = queryString(context, 'keyword').toLowerCase();
      const customers = context.state.users
        .filter((user) => user.profile !== null && user.role === 'CUSTOMER')
        .filter(
          (user) =>
            !keyword ||
            `${user.nickname} ${user.phone} ${user.email ?? ''} ${user.profile?.memberCode ?? ''} ${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`
              .toLowerCase()
              .includes(keyword),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((user) => toCustomer(context.state, user));
      return paginate(customers, queryNumber(context, 'page', 0), queryNumber(context, 'size', 10));
    })
    .get('/admin/customers/lookup', (context) => {
      requireStaff(context);
      const value = queryString(context, 'phone');
      const phone = normalizePhone(value);
      const customer =
        findCustomerByPhone(context.state, phone) ??
        context.state.users.find(
          (user) => user.profile?.memberCode.toUpperCase() === value.toUpperCase(),
        ) ??
        null;
      if (!customer) {
        throw notFound('Customer not found');
      }
      return toCustomer(context.state, customer);
    })
    .post('/admin/customers/quick-register', (context) => {
      requireStaff(context);
      const request = bodyOf<QuickRegisterRequest>(context);
      const fields: FieldError[] = [];
      required(request.nickname, 'nickname', fields);
      const phone = normalizePhone(request.phone ?? '');
      if (!isThaiPhone(phone)) {
        fields.push({ field: 'phone', message: 'phone format' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      assertUniqueContact(context.state, phone, null);
      const password = temporaryPassword();
      const customer = createCustomer(
        context.state,
        { phone, password, nickname: request.nickname.trim(), email: null },
        context.now,
      );
      customer.lastLoginAt = null;
      return { customer: toCustomer(context.state, customer), temporaryPassword: password };
    })
    .get('/admin/customers/:id', (context) => {
      requireStaff(context);
      return toCustomer(context.state, requireCustomer(context));
    })
    .get('/admin/customers/:id/orders', (context) => {
      requireStaff(context);
      const customer = requireCustomer(context);
      const orders = context.state.orders
        .filter((order) => order.customerId === customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((order) => toOrder(context.state, order));
      return paginate(orders, queryNumber(context, 'page', 0), queryNumber(context, 'size', 10));
    })
    .get('/admin/customers/:id/points/transactions', (context) => {
      requireStaff(context);
      const customer = requireCustomer(context);
      const transactions = context.state.pointTransactions
        .filter((transaction) => transaction.customerId === customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .map((transaction) => toPointTransaction(context.state, transaction));
      return paginate(
        transactions,
        queryNumber(context, 'page', 0),
        queryNumber(context, 'size', 10),
      );
    })
    .post('/admin/customers/:id/points/adjust', (context) => {
      const admin = requireAdmin(context);
      const customer = requireCustomer(context);
      const request = bodyOf<AdjustPointsRequest>(context);
      const fields: FieldError[] = [];
      required(request.remark, 'remark', fields);
      if (!Number.isInteger(request.points) || request.points === 0) {
        fields.push({ field: 'points', message: 'points must be non-zero integer' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      const transaction = adjustPoints(
        context.state,
        customer,
        request.points,
        request.remark.trim(),
        context.now,
        admin.nickname,
      );
      return toPointTransaction(context.state, transaction);
    })
    .get('/admin/staff', (context) => {
      requireAdmin(context);
      return context.state.users
        .filter((user) => user.role !== 'CUSTOMER')
        .sort((a, b) => a.id - b.id)
        .map(toStaff);
    })
    .post('/admin/staff', (context) => {
      requireAdmin(context);
      const request = bodyOf<StaffUpsertRequest>(context);
      const fields: FieldError[] = [];
      required(request.nickname, 'nickname', fields);
      const phone = normalizePhone(request.phone ?? '');
      if (!isThaiPhone(phone)) {
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
      assertUniqueContact(context.state, phone, email);
      const staff: MockUser = {
        id: nextId(context.state, 'app_user'),
        phone,
        email,
        passwordHash: hashPassword(request.password ?? ''),
        role: request.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
        status: request.status ?? 'ACTIVE',
        lastLoginAt: null,
        createdAt: context.now.toISOString(),
        nickname: request.nickname.trim(),
        profile: null,
      };
      context.state.users.push(staff);
      return toStaff(staff);
    })
    .put('/admin/staff/:id', (context) => {
      const admin = requireAdmin(context);
      const staff = requireStaffMember(context);
      const request = bodyOf<StaffUpsertRequest>(context);
      const phone = normalizePhone(request.phone ?? '');
      const email = request.email?.trim() || null;
      const fields: FieldError[] = [];
      required(request.nickname, 'nickname', fields);
      if (!isThaiPhone(phone)) {
        fields.push({ field: 'phone', message: 'phone format' });
      }
      if (staff.id === admin.id && (request.status === 'SUSPENDED' || request.role !== 'ADMIN')) {
        fields.push({ field: 'status', message: 'cannot demote or suspend yourself' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      assertUniqueContact(context.state, phone, email, staff.id);
      Object.assign(staff, {
        phone,
        email,
        nickname: request.nickname.trim(),
        role: request.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
        status: request.status,
      });
      if (staff.status === 'SUSPENDED' && context.state.refreshSession?.userId === staff.id) {
        context.state.refreshSession = null;
      }
      return toStaff(staff);
    })
    .post('/admin/staff/:id/reset-password', (context) => {
      requireAdmin(context);
      const staff = requireStaffMember(context);
      const password = temporaryPassword();
      staff.passwordHash = hashPassword(password);
      return { temporaryPassword: password };
    })
    .get('/admin/settings', (context) => {
      requireAdmin(context);
      return context.state.settings;
    })
    .put('/admin/settings', (context) => {
      requireAdmin(context);
      const request = bodyOf<ShopSettings>(context);
      const fields: FieldError[] = [];
      required(request.shopName, 'shopName', fields);
      for (const key of [
        'earnBahtPerPoint',
        'redeemPointsPerBaht',
        'redeemMinPoints',
        'redeemMaxPercent',
        'expireDays',
      ] as const) {
        if (!(Number(request[key]) > 0)) {
          fields.push({ field: key, message: `${key} > 0` });
        }
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      context.state.settings = { ...context.state.settings, ...request };
      return context.state.settings;
    })
    .get('/admin/payment-methods', (context) => {
      requireStaff(context);
      return [...context.state.paymentMethods]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((method) => toPaymentMethod(context.state, method));
    })
    .post('/admin/payment-methods', (context) => {
      requireAdmin(context);
      const request = bodyOf<PaymentMethodUpsertRequest>(context);
      const fields: FieldError[] = [];
      required(request.code, 'code', fields);
      required(request.name, 'name', fields);
      const code = request.code?.trim().toUpperCase() ?? '';
      if (context.state.paymentMethods.some((method) => method.code === code)) {
        fields.push({ field: 'code', message: 'code already used' });
      }
      if (fields.length) {
        throw badRequest('Validation failed', fields);
      }
      const method = {
        ...request,
        id: nextId(context.state, 'payment_method'),
        code,
        nameEn: request.nameEn || request.name,
        sortOrder: context.state.paymentMethods.length + 1,
      };
      context.state.paymentMethods.push(method);
      return toPaymentMethod(context.state, method);
    })
    .put('/admin/payment-methods/:id', (context) => {
      requireAdmin(context);
      const method = context.state.paymentMethods.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!method) {
        throw notFound();
      }
      const request = bodyOf<PaymentMethodUpsertRequest>(context);
      Object.assign(method, {
        name: request.name,
        nameEn: request.nameEn || request.name,
        requiresSlip: request.requiresSlip,
        requiresReference: request.requiresReference,
        availableOnline: request.availableOnline,
        isActive: request.isActive,
        instruction: request.instruction ?? '',
      });
      return toPaymentMethod(context.state, method);
    });
}
