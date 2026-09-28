import {
  AddPaymentRequest,
  CancelOrderRequest,
  CreatePosOrderRequest,
  OrderStatusUpdateRequest,
  VerifyPaymentRequest,
} from '../../api/models/order.model';
import {
  addPayment,
  cancelOrder,
  completeOrder,
  settleOrder,
  createOrder,
  findCustomerByPhone,
  priceCart,
  requireOrderById,
  toOrder,
  toPayment,
  transitionOrder,
  verifyPayment,
} from '../mock-domain';
import {
  MockRouter,
  bodyOf,
  numberParam,
  queryNumber,
  queryString,
  requireStaff,
} from '../mock-router';
import {
  dateKey,
  normalizePhone,
  notFound,
  paginate,
  roundMoney,
  unprocessable,
} from '../mock-utils';

const ACTIVE_BOARD = ['CONFIRMED', 'PREPARING', 'READY'];

export function registerAdminOrderHandlers(router: MockRouter): void {
  router
    .post('/admin/orders', (context) => {
      const staff = requireStaff(context);
      const request = bodyOf<CreatePosOrderRequest>(context);
      const customer = request.customerPhone
        ? findCustomerByPhone(context.state, normalizePhone(request.customerPhone))
        : null;
      if (request.customerPhone && !customer) {
        throw notFound('Customer not found');
      }
      const pricing = priceCart(context.state, {
        channel: 'WALK_IN',
        items: request.items ?? [],
        promoCode: request.promoCode,
        redeemPoints: request.redeemPoints,
        customer,
        now: context.now,
      });
      if (pricing.promoCodeErrorCode) {
        throw unprocessable(pricing.promoCodeErrorCode, request.promoCode ?? '');
      }
      const order = createOrder(context.state, {
        channel: 'WALK_IN',
        pricing,
        customer,
        guestName: null,
        guestPhone: null,
        note: request.note?.trim() || null,
        paymentMethodCode: null,
        cashierId: staff.id,
        now: context.now,
      });
      return toOrder(context.state, order);
    })
    .get('/admin/orders', (context) => {
      requireStaff(context);
      const status = queryString(context, 'status');
      const channel = queryString(context, 'channel');
      const date = queryString(context, 'date');
      const keyword = queryString(context, 'keyword').toLowerCase();
      const orders = context.state.orders
        .filter(
          (order) =>
            (!status || order.status === status) &&
            (!channel || order.channel === channel) &&
            (!date || dateKey(new Date(order.createdAt)) === date),
        )
        .map((order) => toOrder(context.state, order))
        .filter(
          (order) =>
            !keyword ||
            `${order.orderNo} ${order.customerName ?? ''} ${order.customerPhone ?? ''} ${order.queueNo}`
              .toLowerCase()
              .includes(keyword),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(orders, queryNumber(context, 'page', 0), queryNumber(context, 'size', 10));
    })
    .get('/admin/orders/board', (context) => {
      requireStaff(context);
      const active = context.state.orders
        .filter((order) => ACTIVE_BOARD.includes(order.status))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((order) => toOrder(context.state, order));
      return {
        confirmed: active.filter((order) => order.status === 'CONFIRMED'),
        preparing: active.filter((order) => order.status === 'PREPARING'),
        ready: active.filter((order) => order.status === 'READY'),
      };
    })
    .get('/admin/orders/:id', (context) => {
      requireStaff(context);
      return toOrder(context.state, requireOrderById(context.state, numberParam(context, 'id')));
    })
    .get('/admin/orders/:id/receipt', (context) => {
      requireStaff(context);
      const settings = context.state.settings;
      return {
        shopName: settings.shopName,
        shopPhone: settings.shopPhone,
        address: settings.address,
        order: toOrder(context.state, requireOrderById(context.state, numberParam(context, 'id'))),
      };
    })
    .patch('/admin/orders/:id/status', (context) => {
      const staff = requireStaff(context);
      const order = requireOrderById(context.state, numberParam(context, 'id'));
      transitionOrder(
        context.state,
        order,
        bodyOf<OrderStatusUpdateRequest>(context).status,
        context.now,
        staff.nickname,
      );
      return toOrder(context.state, order);
    })
    .post('/admin/orders/:id/cancel', (context) => {
      const staff = requireStaff(context);
      const order = requireOrderById(context.state, numberParam(context, 'id'));
      cancelOrder(
        context.state,
        order,
        bodyOf<CancelOrderRequest>(context).reason ?? '',
        context.now,
        staff.nickname,
      );
      return toOrder(context.state, order);
    })
    .post('/admin/orders/:id/payments', (context) => {
      const staff = requireStaff(context);
      const order = requireOrderById(context.state, numberParam(context, 'id'));
      const request = bodyOf<AddPaymentRequest>(context);
      addPayment(context.state, order, request, staff, context.now);
      return toOrder(context.state, order);
    })
    .post('/admin/orders/:id/settle', (context) => {
      const staff = requireStaff(context);
      const order = requireOrderById(context.state, numberParam(context, 'id'));
      settleOrder(
        context.state,
        order,
        bodyOf<{ methodCode: string }>(context).methodCode,
        staff,
        context.now,
      );
      return toOrder(context.state, order);
    })
    .post('/admin/orders/:id/complete', (context) => {
      const staff = requireStaff(context);
      const order = requireOrderById(context.state, numberParam(context, 'id'));
      completeOrder(context.state, order, context.now, staff.nickname);
      return toOrder(context.state, order);
    })
    .get('/admin/payments', (context) => {
      requireStaff(context);
      const status = queryString(context, 'status');
      return context.state.payments
        .filter((payment) => !status || payment.status === status)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((payment) => toPayment(context.state, payment));
    })
    .patch('/admin/payments/:id/verify', (context) => {
      const staff = requireStaff(context);
      const payment = context.state.payments.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!payment) {
        throw notFound('Payment not found');
      }
      const request = bodyOf<VerifyPaymentRequest>(context);
      verifyPayment(
        context.state,
        payment,
        request.approve,
        request.rejectReason,
        staff,
        context.now,
      );
      return toPayment(context.state, payment);
    })
    .get('/admin/dashboard/today', (context) => {
      requireStaff(context);
      const today = dateKey(context.now);
      const orders = context.state.orders.filter(
        (order) => dateKey(new Date(order.createdAt)) === today,
      );
      const completed = orders.filter((order) => order.status === 'COMPLETED');
      return {
        orderCount: orders.filter((order) => order.status !== 'CANCELLED').length,
        salesAmount: roundMoney(completed.reduce((total, order) => total + order.totalAmount, 0)),
        completedCount: completed.length,
        cancelledCount: orders.filter((order) => order.status === 'CANCELLED').length,
        pendingPayments: context.state.payments.filter((payment) => payment.status === 'PENDING')
          .length,
        queueWaiting: context.state.orders.filter((order) => ACTIVE_BOARD.includes(order.status))
          .length,
        onlineCount: orders.filter((order) => order.channel === 'ONLINE').length,
        walkInCount: orders.filter((order) => order.channel === 'WALK_IN').length,
        newMembers: context.state.users.filter(
          (user) => user.profile !== null && dateKey(new Date(user.createdAt)) === today,
        ).length,
        queue: context.state.orders
          .filter((order) => ['PENDING_PAYMENT', ...ACTIVE_BOARD].includes(order.status))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((order) => toOrder(context.state, order)),
        latestOrders: [...orders]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5)
          .map((order) => toOrder(context.state, order)),
      };
    });
}
