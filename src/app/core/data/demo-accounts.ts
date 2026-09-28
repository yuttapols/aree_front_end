import { UserRole } from '../api/models/user.model';

export interface DemoAccount {
  role: UserRole;
  username: string;
  password: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: 'CUSTOMER', username: '0812345678', password: 'roti1234' },
  { role: 'STAFF', username: '0800000002', password: 'staff1234' },
  { role: 'ADMIN', username: '0800000001', password: 'admin1234' },
];
