// Mock data simulating what Open Banking would provide
// Replace with Tink Sandbox integration later

export type Account = {
  id: string;
  bankName: string;
  ibanMasked: string;
  balance: number;
  type: 'business' | 'private';
};

export type Transaction = {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  status: 'paid' | 'due' | 'overdue';
  dueDate: string;
  daysInfo?: string;
  createdAt?: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
};

export type Insight = {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
};

export const mockAccounts: Account[] = [
  { id: 'acc1', bankName: 'DKB Geschäft', ibanMasked: 'DE89 •••• 4521', balance: 8420, type: 'business' },
  { id: 'acc2', bankName: 'N26 Privat', ibanMasked: 'DE21 •••• 9087', balance: 2150, type: 'private' },
];

export const mockTransactions: Transaction[] = [
  { id: 't1', accountId: 'acc1', description: 'Müller GmbH - RE-2026-014', amount: 3500, type: 'income', date: '2026-06-18', category: 'Projekteinnahme' },
  { id: 't2', accountId: 'acc1', description: 'Adobe Creative Cloud', amount: -60, type: 'expense', date: '2026-06-15', category: 'Software' },
  { id: 't3', accountId: 'acc1', description: 'Finanzamt Berlin', amount: -1200, type: 'expense', date: '2026-06-10', category: 'Steuer' },
  { id: 't4', accountId: 'acc2', description: 'Rewe', amount: -85, type: 'expense', date: '2026-06-19', category: 'Lebensmittel' },
  { id: 't5', accountId: 'acc1', description: 'Schmidt AG - Anzahlung', amount: 1800, type: 'income', date: '2026-06-12', category: 'Projekteinnahme' },
];

export const mockInvoices: Invoice[] = [
  { id: 'inv1', invoiceNumber: 'RE-2026-014', customerName: 'Müller GmbH', amount: 3500, status: 'paid', dueDate: '2026-06-15' },
  { id: 'inv2', invoiceNumber: 'RE-2026-015', customerName: 'Schmidt AG', amount: 1800, status: 'due', dueDate: '2026-06-26', daysInfo: 'Fällig in 3 Tagen' },
  { id: 'inv3', invoiceNumber: 'RE-2026-013', customerName: 'Weber KG', amount: 920, status: 'overdue', dueDate: '2026-06-10', daysInfo: 'Überfällig' },
  { id: 'inv4', invoiceNumber: 'RE-2026-012', customerName: 'Becker Solutions', amount: 2400, status: 'paid', dueDate: '2026-05-30' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Müller GmbH', email: 'buchhaltung@mueller.de' },
  { id: 'c2', name: 'Schmidt AG', email: 'rechnungen@schmidt-ag.de' },
  { id: 'c3', name: 'Weber KG', email: 'finance@weber-kg.de' },
];

export const mockInsights: Insight[] = [
  { id: 'i1', type: 'warning', title: 'Copilot', message: 'Steuer-Topf 2× angetastet. April wird eng.' },
  { id: 'i2', type: 'info', title: 'Liquidität', message: 'Schmidt-Zahlung (1.800 €) kommt in 3 Tagen.' },
];

// Tax/budget split rules (user configurable)
export const defaultRules = {
  taxPct: 30,
  fixedPct: 20,
};
