import { BreakdownSlice, DashboardTotals, TrendGroupBy } from '../../api/models/dashboard.model';
import type { MockOrder, MockState } from '../mock-db';
import { MockContext, MockRouter, queryString, requireAdmin } from '../mock-router';
import { addDays, dateKey, pad, parseDateKey, roundMoney, startOfDay } from '../mock-utils';

interface Range {
  from: Date;
  to: Date;
}

function rangeOf(context: MockContext): Range {
  const today = startOfDay(context.now);
  const from = queryString(context, 'from');
  const to = queryString(context, 'to');
  return {
    from: from ? parseDateKey(from) : addDays(today, -6),
    to: addDays(to ? parseDateKey(to) : today, 1),
  };
}

function previousRange(range: Range): Range {
  const length = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - length), to: range.from };
}

function completedIn(state: MockState, range: Range): MockOrder[] {
  return state.orders.filter((order) => {
    const at = new Date(order.createdAt).getTime();
    return order.status === 'COMPLETED' && at >= range.from.getTime() && at < range.to.getTime();
  });
}

function slice(orders: MockOrder[]): BreakdownSlice {
  return {
    count: orders.length,
    amount: roundMoney(orders.reduce((total, order) => total + order.totalAmount, 0)),
  };
}

function totals(state: MockState, range: Range): DashboardTotals {
  const orders = completedIn(state, range);
  const salesAmount = roundMoney(orders.reduce((total, order) => total + order.totalAmount, 0));
  const inRange = (value: string) => {
    const at = new Date(value).getTime();
    return at >= range.from.getTime() && at < range.to.getTime();
  };
  const transactions = state.pointTransactions.filter((transaction) =>
    inRange(transaction.createdAt),
  );
  return {
    salesAmount,
    orderCount: orders.length,
    averageOrderValue: orders.length ? roundMoney(salesAmount / orders.length) : 0,
    newMembers: state.users.filter(
      (user) => user.profile !== null && user.role === 'CUSTOMER' && inRange(user.createdAt),
    ).length,
    pointsIssued: transactions
      .filter((transaction) => transaction.type === 'EARN')
      .reduce((total, transaction) => total + transaction.points, 0),
    pointsRedeemed: transactions
      .filter((transaction) => transaction.type === 'REDEEM')
      .reduce((total, transaction) => total - transaction.points, 0),
  };
}

function periodKey(date: Date, groupBy: TrendGroupBy): string {
  if (groupBy === 'MONTH') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }
  if (groupBy === 'WEEK') {
    const monday = addDays(startOfDay(date), -((date.getDay() + 6) % 7));
    return dateKey(monday);
  }
  return dateKey(date);
}

export function registerDashboardHandlers(router: MockRouter): void {
  router
    .get('/admin/dashboard/summary', (context) => {
      requireAdmin(context);
      const range = rangeOf(context);
      const orders = completedIn(context.state, range);
      return {
        ...totals(context.state, range),
        previous: totals(context.state, previousRange(range)),
        walkIn: slice(orders.filter((order) => order.channel === 'WALK_IN')),
        online: slice(orders.filter((order) => order.channel === 'ONLINE')),
        member: slice(orders.filter((order) => order.customerId !== null)),
        guest: slice(orders.filter((order) => order.customerId === null)),
      };
    })
    .get('/admin/dashboard/sales-trend', (context) => {
      requireAdmin(context);
      const range = rangeOf(context);
      const groupBy = (queryString(context, 'groupBy') || 'DAY') as TrendGroupBy;
      const buckets = new Map<string, { salesAmount: number; orderCount: number }>();
      for (let day = range.from; day < range.to; day = addDays(day, 1)) {
        buckets.set(periodKey(day, groupBy), { salesAmount: 0, orderCount: 0 });
      }
      for (const order of completedIn(context.state, range)) {
        const key = periodKey(new Date(order.createdAt), groupBy);
        const bucket = buckets.get(key) ?? { salesAmount: 0, orderCount: 0 };
        bucket.salesAmount = roundMoney(bucket.salesAmount + order.totalAmount);
        bucket.orderCount += 1;
        buckets.set(key, bucket);
      }
      return [...buckets.entries()].map(([period, value]) => ({ period, ...value }));
    })
    .get('/admin/dashboard/top-products', (context) => {
      requireAdmin(context);
      const limit = Number(queryString(context, 'limit') || 10);
      const products = new Map<
        number,
        { productName: string; productNameEn: string; quantity: number; salesAmount: number }
      >();
      for (const order of completedIn(context.state, rangeOf(context))) {
        for (const item of order.items) {
          const entry = products.get(item.productId) ?? {
            productName: item.productName,
            productNameEn: item.productNameEn,
            quantity: 0,
            salesAmount: 0,
          };
          entry.quantity += item.quantity;
          entry.salesAmount = roundMoney(entry.salesAmount + item.lineTotal);
          products.set(item.productId, entry);
        }
      }
      return [...products.entries()]
        .map(([productId, value]) => ({ productId, ...value }))
        .sort((a, b) => b.quantity - a.quantity || b.salesAmount - a.salesAmount)
        .slice(0, limit);
    })
    .get('/admin/dashboard/payment-methods', (context) => {
      requireAdmin(context);
      const orderIds = new Set(
        completedIn(context.state, rangeOf(context)).map((order) => order.id),
      );
      const methods = new Map<string, { amount: number; count: number }>();
      for (const payment of context.state.payments) {
        if (payment.status !== 'PAID' || !orderIds.has(payment.orderId)) {
          continue;
        }
        const entry = methods.get(payment.methodCode) ?? { amount: 0, count: 0 };
        entry.amount = roundMoney(entry.amount + payment.amount);
        entry.count += 1;
        methods.set(payment.methodCode, entry);
      }
      return [...methods.entries()].map(([methodCode, value]) => {
        const method = context.state.paymentMethods.find(
          (candidate) => candidate.code === methodCode,
        );
        return {
          methodCode,
          methodName: method?.name ?? methodCode,
          methodNameEn: method?.nameEn ?? methodCode,
          ...value,
        };
      });
    })
    .get('/admin/dashboard/hourly', (context) => {
      requireAdmin(context);
      const hours = Array.from({ length: 24 }, (_value, hour) => ({
        hour,
        orderCount: 0,
        salesAmount: 0,
      }));
      for (const order of completedIn(context.state, rangeOf(context))) {
        const bucket = hours[new Date(order.createdAt).getHours()];
        if (bucket) {
          bucket.orderCount += 1;
          bucket.salesAmount = roundMoney(bucket.salesAmount + order.totalAmount);
        }
      }
      return hours;
    });
}
