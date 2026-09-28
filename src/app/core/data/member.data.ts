import { MemberAccount } from '../models/member.model';

export const DEMO_PASSWORD = 'roti1234';

export const DEMO_MEMBER: MemberAccount = {
  name: 'สมใจ ใจดี',
  phone: '0812345678',
  points: 1250,
  joinedAt: '2025-03-14T10:00:00.000Z',
  orders: [
    {
      orderNo: 'RT-4821',
      placedAt: '2026-09-24T12:40:00.000Z',
      itemCount: 3,
      total: 215,
      pointsEarned: 21,
    },
    {
      orderNo: 'RT-4377',
      placedAt: '2026-09-19T11:15:00.000Z',
      itemCount: 2,
      total: 120,
      pointsEarned: 12,
    },
    {
      orderNo: 'RT-3902',
      placedAt: '2026-09-11T13:05:00.000Z',
      itemCount: 5,
      total: 340,
      pointsEarned: 34,
    },
    {
      orderNo: 'RT-3518',
      placedAt: '2026-08-30T10:50:00.000Z',
      itemCount: 1,
      total: 45,
      pointsEarned: 4,
    },
  ],
};
