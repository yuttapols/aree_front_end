export type MemberTier = 'bronze' | 'silver' | 'gold';

export interface MemberOrder {
  orderNo: string;
  placedAt: string;
  itemCount: number;
  total: number;
  pointsEarned: number;
}

export interface MemberAccount {
  name: string;
  phone: string;
  points: number;
  joinedAt: string;
  orders: MemberOrder[];
}
