import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import {
  Account, Transaction, Invoice, Customer, Insight,
  mockAccounts, mockTransactions, mockInsights,
  defaultRules,
} from '../data/mockData';
import { supabase } from '../lib/supabase';
import { scheduleOverdueReminder, scheduleLiquidityWarning } from '../services/notifications';

type Rules = { taxPct: number; fixedPct: number };

type FinoState = {
  // auth
  session: Session | null;
  loading: boolean;

  // data
  accounts: Account[];
  transactions: Transaction[];
  invoices: Invoice[];
  customers: Customer[];
  insights: Insight[];
  rules: Rules;
  onboarded: boolean;
  tinkConnected: boolean;

  // computed
  totalBalance: () => number;
  taxReserve: () => number;
  fixedReserve: () => number;
  realBalance: () => number;
  openInvoicesTotal: () => number;

  // auth actions
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;

  // data actions
  loadUserData: (userId: string) => Promise<void>;
  completeOnboarding: (taxPct: number, fixedPct: number) => Promise<void>;
  setRules: (rules: Rules) => void;
  setOnboarded: (v: boolean) => void;
  addInvoice: (inv: Invoice) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  addAccount: (a: Account) => void;
  setTinkData: (accounts: Account[], transactions: Transaction[]) => void;
  checkAndNotify: () => Promise<void>;
};

let _authInitialized = false;

export const useFinoStore = create<FinoState>((set, get) => ({
  session: null,
  loading: true,

  accounts: mockAccounts,
  transactions: mockTransactions,
  invoices: [],
  customers: [],
  insights: mockInsights,
  rules: defaultRules,
  onboarded: false,
  tinkConnected: false,

  // ── computed ────────────────────────────────────────────────────────────

  totalBalance: () => get().accounts.reduce((sum, a) => sum + a.balance, 0),

  taxReserve: () => {
    const income = get().transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return Math.round((income * get().rules.taxPct) / 100);
  },

  fixedReserve: () => {
    const income = get().transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return Math.round((income * get().rules.fixedPct) / 100);
  },

  realBalance: () => {
    return get().totalBalance() - get().taxReserve() - get().fixedReserve();
  },

  openInvoicesTotal: () =>
    get().invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + i.amount, 0),

  // ── auth ────────────────────────────────────────────────────────────────

  initializeAuth: async () => {
    if (_authInitialized) return;
    _authInitialized = true;

    // getSession() gibt die aktuelle Session sofort zurück — kein Warten auf
    // einen Listener-Event. Damit kann loading: false garantiert gesetzt werden,
    // egal welches Event onAuthStateChange als erstes feuert (z.B. TOKEN_REFRESHED
    // auf Web, das früher auftritt als INITIAL_SESSION).
    const { data: { session } } = await supabase.auth.getSession();
    set({ session });

    if (session) {
      await get().loadUserData(session.user.id);
    }

    set({ loading: false });

    // Folge-Events (Login, Logout) abfangen — INITIAL_SESSION und TOKEN_REFRESHED
    // überspringen, weil der initiale State bereits oben erledigt ist.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      set({ session });

      if (session) {
        await get().loadUserData(session.user.id);
      } else {
        set({ onboarded: false, invoices: [], customers: [], accounts: mockAccounts, transactions: mockTransactions, tinkConnected: false });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // session is null when email confirmation is required
    return { error: null, needsConfirmation: !data.session };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      onboarded: false,
      invoices: [],
      customers: [],
      rules: defaultRules,
      // back to the mock demo fallback for the next session
      accounts: mockAccounts,
      transactions: mockTransactions,
      tinkConnected: false,
    });
  },

  // ── data ────────────────────────────────────────────────────────────────

  loadUserData: async (userId) => {
    const [rulesRes, invoicesRes, customersRes] = await Promise.all([
      supabase.from('user_rules').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('user_id', userId),
    ]);

    if (rulesRes.data) {
      set({
        rules: { taxPct: rulesRes.data.tax_pct, fixedPct: rulesRes.data.fixed_pct },
        onboarded: true,
      });
    }

    if (invoicesRes.data) {
      set({
        invoices: invoicesRes.data.map((r) => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          customerName: r.customer_name,
          amount: r.amount,
          status: r.status as Invoice['status'],
          dueDate: r.due_date,
          daysInfo: r.days_info ?? undefined,
          createdAt: r.created_at ?? undefined,
        })),
      });
    }

    if (customersRes.data) {
      set({
        customers: customersRes.data.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        })),
      });
    }

    await get().checkAndNotify();
  },

  completeOnboarding: async (taxPct, fixedPct) => {
    // set locally first so navigation is never blocked
    set({ rules: { taxPct, fixedPct }, onboarded: true });

    const session = get().session;
    if (!session) return;

    // fire-and-forget — don't block navigation on DB round-trip
    supabase.from('user_rules').upsert({
      user_id: session.user.id,
      tax_pct: taxPct,
      fixed_pct: fixedPct,
    });
  },

  setRules: (rules) => {
    set({ rules });
    const session = get().session;
    if (!session) return;
    supabase.from('user_rules').upsert({
      user_id: session.user.id,
      tax_pct: rules.taxPct,
      fixed_pct: rules.fixedPct,
    });
  },
  setOnboarded: (v) => set({ onboarded: v }),

  addInvoice: async (inv) => {
    // optimistic update
    set((s) => ({ invoices: [inv, ...s.invoices] }));

    const session = get().session;
    if (!session) return;

    await supabase.from('invoices').insert({
      id: inv.id,
      user_id: session.user.id,
      invoice_number: inv.invoiceNumber,
      customer_name: inv.customerName,
      amount: inv.amount,
      status: inv.status,
      due_date: inv.dueDate,
      days_info: inv.daysInfo ?? null,
    });
  },

  updateInvoiceStatus: async (id, status) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => inv.id === id ? { ...inv, status } : inv),
    }));
    const session = get().session;
    if (!session) return;
    await supabase.from('invoices').update({ status }).eq('id', id).eq('user_id', session.user.id);
  },

  deleteInvoice: async (id) => {
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
    const session = get().session;
    if (!session) return;
    await supabase.from('invoices').delete().eq('id', id).eq('user_id', session.user.id);
  },

  addCustomer: async (c) => {
    set((s) => ({ customers: [c, ...s.customers] }));

    const session = get().session;
    if (!session) return;

    await supabase.from('customers').upsert({
      id: c.id,
      user_id: session.user.id,
      name: c.name,
      email: c.email,
    });
  },

  addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a] })),

  // Replace mock data with real Tink data. We replace (not append) so the
  // mock accounts/transactions never double-count into the Real Balance.
  // As long as tinkConnected is false, the mock data serves as the demo fallback.
  setTinkData: (accounts, transactions) =>
    set({ accounts, transactions, tinkConnected: true }),

  checkAndNotify: async () => {
    try {
      const state = get();
      const overdueInvoices = state.invoices.filter((i) => i.status === 'overdue');
      for (const inv of overdueInvoices) {
        await scheduleOverdueReminder(inv.invoiceNumber, inv.customerName);
      }
      if (state.realBalance() < 500) {
        await scheduleLiquidityWarning(30);
      }
    } catch {
      // Notifications not available in Expo Go or web — fail silently
    }
  },
}));
