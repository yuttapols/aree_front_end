import {
  AddPaymentRequest,
  AdminQuoteRequest,
  BoardItem,
  CancelOrderRequest,
  CreatePosOrderRequest,
  OrderStatus,
  OrderStatusUpdateRequest,
  TodayResponse,
  VerifyPaymentRequest,
} from '../../api/models/order.model';
import {
  addPayment,
  cancelOrder,
  createOrder,
  findCustomerByPhone,
  findUser,
  priceCart,
  requireOrderById,
  toOrder,
  toPayment,
  toPendingPaymentItem,
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
  blobResult,
  dateKey,
  normalizePhone,
  notFound,
  paginate,
  roundMoney,
  unprocessable,
} from '../mock-utils';

const ACTIVE_BOARD: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY'];

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
    .post('/admin/orders/quote', (context) => {
      const request = bodyOf<AdminQuoteRequest>(context);
      const customer = request.customerPhone
        ? findCustomerByPhone(context.state, normalizePhone(request.customerPhone))
        : null;
      return priceCart(context.state, {
        channel: 'WALK_IN',
        items: request.items ?? [],
        promoCode: request.promoCode,
        redeemPoints: request.redeemPoints,
        customer,
        now: context.now,
      }).quote;
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
            `${order.orderNo} ${order.customer?.nickname ?? ''} ${order.guestName ?? ''} ${order.guestPhone ?? ''} ${order.queueNo}`
              .toLowerCase()
              .includes(keyword),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(orders, queryNumber(context, 'page', 0), queryNumber(context, 'size', 10));
    })
    .get('/admin/orders/board', (context) => {
      requireStaff(context);
      const board: BoardItem[] = context.state.orders
        .filter((order) => ACTIVE_BOARD.includes(order.status))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((order) => {
          const full = toOrder(context.state, order);
          return {
            id: full.id,
            orderNo: full.orderNo,
            channel: full.channel,
            status: full.status,
            queueNo: full.queueNo,
            customerName: full.customer?.nickname ?? full.guestName,
            items: full.items,
            note: full.note,
            createdAt: full.createdAt,
            confirmedAt: full.confirmedAt,
          };
        });
      return board;
    })
    .get('/admin/orders/:id', (context) => {
      requireStaff(context);
      return toOrder(context.state, requireOrderById(context.state, numberParam(context, 'id')));
    })
    .get('/admin/orders/:id/receipt', (context) => {
      requireStaff(context);
      const settings = context.state.settings;
      const full = toOrder(
        context.state,
        requireOrderById(context.state, numberParam(context, 'id')),
      );
      const cashier = full.cashierId ? findUser(context.state, full.cashierId) : null;
      return {
        shopName: settings.shopName,
        shopPhone: settings.shopPhone,
        address: settings.address,
        order: full,
        cashierName: cashier?.nickname ?? null,
        printedAt: context.now.toISOString(),
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
    .get('/admin/payments', (context) => {
      requireStaff(context);
      const status = queryString(context, 'status');
      return context.state.payments
        .filter((payment) => !status || payment.status === status)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((payment) => toPendingPaymentItem(context.state, payment));
    })
    .get('/admin/payments/:id/slip', (context) => {
      requireStaff(context);
      const payment = context.state.payments.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!payment?.slipUrl) {
        throw notFound('Slip not found');
      }
      return blobResult(payment.slipUrl);
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
      const ordersByStatus = orders.reduce<Partial<Record<OrderStatus, number>>>((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      }, {});
      const lastQueue = [...orders].sort((a, b) => b.queueNo - a.queueNo)[0] ?? null;
      const response: TodayResponse = {
        date: today,
        ordersByStatus,
        completedCount: completed.length,
        netSales: roundMoney(completed.reduce((total, order) => total + order.totalAmount, 0)),
        pendingPayments: context.state.payments.filter((payment) => payment.status === 'PENDING')
          .length,
        lastQueueNo: lastQueue?.queueNo ?? null,
      };
      return response;
    });
}
