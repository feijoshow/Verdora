/** Pre-configured demo accounts — only surfaced when EXPO_PUBLIC_DEMO_MODE=1 */
export interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: 'farmer' | 'admin';
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Demo farmer (Oshakati)',
    email: 'demo.farmer@verdora.test',
    password: 'VerdoraDemo1!',
    role: 'farmer',
  },
  {
    label: 'Demo admin',
    email: 'demo.admin@verdora.test',
    password: 'VerdoraAdmin1!',
    role: 'admin',
  },
];
