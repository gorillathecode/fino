// Tink Open Banking – Client-Flow
//
// Sicherheit: Hier liegt NUR die öffentliche client_id. Der client_secret und
// der Token-Austausch laufen ausschließlich über die Supabase Edge Function
// "tink-token-exchange" (siehe supabase/functions/). Das access_token bleibt
// nur im Speicher für die Session.

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Account, Transaction } from '../data/mockData';

const TINK_LINK_BASE = 'https://link.tink.com/1.0/transactions/connect-accounts';
const TINK_API_BASE = 'https://api.tink.com/data/v2';
const REDIRECT_URI = 'fino://tink-callback';
const TINK_CLIENT_ID = process.env.EXPO_PUBLIC_TINK_CLIENT_ID ?? '';

// ── Debug-Logging ───────────────────────────────────────────────────────────
// EIN zentraler Schalter. Auf false setzen, um das gesamte [TINK]-Logging
// (temporär für den ersten Sandbox-Test) wieder abzuschalten.
const TINK_DEBUG = true;

function tlog(...args: unknown[]): void {
  if (TINK_DEBUG) console.log('[TINK]', ...args);
}

// ── 1. Connect-Flow ────────────────────────────────────────────────────────

export function buildTinkLinkUrl(): string {
  const params = new URLSearchParams({
    client_id: TINK_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    market: 'DE',
    locale: 'de_DE',
    scope: 'accounts:read,transactions:read',
  });
  return `${TINK_LINK_BASE}?${params.toString()}`;
}

export function isTinkConfigured(): boolean {
  return TINK_CLIENT_ID.length > 0;
}

// Öffnet Tink Link im In-App-Browser und fängt den fino://tink-callback ab.
// Gibt den `code` aus der Callback-URL zurück (oder null bei Abbruch/Fehler).
export async function openTinkLink(): Promise<string | null> {
  tlog('openTinkLink: opening', buildTinkLinkUrl());
  const result = await WebBrowser.openAuthSessionAsync(buildTinkLinkUrl(), REDIRECT_URI);

  tlog('openTinkLink: browser result type =', result.type);
  if (result.type !== 'success' || !result.url) {
    tlog('openTinkLink: no success URL (abgebrochen oder dismissed)');
    return null;
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  const tinkError = queryParams?.error;

  if (typeof tinkError === 'string') {
    // Tink kann den Fehler als Query-Param zurückgeben (z.B. falsche redirect_uri)
    tlog('openTinkLink: Tink hat Fehler im Callback gemeldet:', tinkError, queryParams);
    return null;
  }

  if (typeof code === 'string' && code.length > 0) {
    tlog('openTinkLink: code erhalten (len =', code.length, ')');
    return code;
  }

  tlog('openTinkLink: kein code im Callback', queryParams);
  return null;
}

// ── 2. Token-Austausch (über Backend, nie mit client_secret in der App) ─────

export async function exchangeCodeForToken(code: string): Promise<string | null> {
  // functions.invoke hängt automatisch das Supabase-JWT der Session an,
  // das die Edge Function für die Autorisierung prüft.
  tlog('exchangeCodeForToken: rufe Edge Function tink-token-exchange auf');
  const { data, error } = await supabase.functions.invoke('tink-token-exchange', {
    body: { code },
  });

  if (error) {
    // FunctionsHttpError trägt die Server-Antwort im context; auslesen für Details
    let detail: unknown = error.message;
    try {
      detail = await (error as { context?: Response }).context?.json?.();
    } catch {
      /* context evtl. nicht lesbar – message reicht */
    }
    tlog('exchangeCodeForToken: Edge Function Fehler:', error.message, detail);
    return null;
  }

  if (!data?.access_token) {
    tlog('exchangeCodeForToken: kein access_token in Antwort:', data);
    return null;
  }

  tlog('exchangeCodeForToken: access_token erhalten (len =', String(data.access_token).length, ')');
  return data.access_token as string;
}

// ── 3. Daten abrufen ───────────────────────────────────────────────────────

type TinkAmount = {
  value?: { unscaledValue?: string; scale?: string };
  currencyCode?: string;
};

type TinkAccount = {
  id: string;
  name?: string;
  type?: string;
  balances?: { booked?: { amount?: TinkAmount }; available?: { amount?: TinkAmount } };
  identifiers?: { iban?: { iban?: string } };
};

type TinkTransaction = {
  id: string;
  accountId: string;
  amount?: TinkAmount;
  descriptions?: { display?: string; original?: string };
  dates?: { booked?: string };
  types?: { type?: string };
  categories?: { pfm?: { name?: string } };
};

export async function fetchTinkAccounts(token: string): Promise<Account[]> {
  const res = await fetch(`${TINK_API_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    tlog('fetchTinkAccounts: HTTP', res.status, body);
    throw new Error(`Tink accounts request failed: ${res.status} ${body}`);
  }

  const body = (await res.json()) as { accounts?: TinkAccount[] };
  const accounts = (body.accounts ?? []).map(mapTinkAccount);
  tlog('fetchTinkAccounts:', accounts.length, 'Account(s)');
  return accounts;
}

export async function fetchTinkTransactions(token: string): Promise<Transaction[]> {
  const res = await fetch(`${TINK_API_BASE}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    tlog('fetchTinkTransactions: HTTP', res.status, body);
    throw new Error(`Tink transactions request failed: ${res.status} ${body}`);
  }

  const body = (await res.json()) as { transactions?: TinkTransaction[] };
  const transactions = (body.transactions ?? []).map(mapTinkTransaction);
  tlog('fetchTinkTransactions:', transactions.length, 'Transaktion(en)');
  return transactions;
}

// ── 4. Mapping auf FINO-Typen ──────────────────────────────────────────────

// Tink-Beträge: value = unscaledValue * 10^-scale
function parseTinkAmount(amount?: TinkAmount): number {
  const v = amount?.value;
  if (!v?.unscaledValue) return 0;
  const unscaled = Number(v.unscaledValue);
  const scale = Number(v.scale ?? '0');
  if (Number.isNaN(unscaled) || Number.isNaN(scale)) return 0;
  return unscaled * Math.pow(10, -scale);
}

function maskIban(iban?: string): string {
  if (!iban || iban.length < 8) return iban ?? 'IBAN unbekannt';
  const country = iban.slice(0, 4);
  const tail = iban.slice(-4);
  return `${country} •••• ${tail}`;
}

export function mapTinkAccount(acc: TinkAccount): Account {
  const balance = parseTinkAmount(acc.balances?.booked?.amount ?? acc.balances?.available?.amount);
  // Tink kennt u.a. CHECKING/SAVINGS/CREDIT_CARD/... – wir mappen grob auf
  // business/private. Geschäftskonten lassen sich im Sandbox nicht sicher
  // unterscheiden, daher Default 'business' (Hauptkonto des Freelancers).
  const type: Account['type'] = acc.type === 'SAVINGS' ? 'private' : 'business';

  return {
    id: acc.id,
    bankName: acc.name ?? 'Bankkonto',
    ibanMasked: maskIban(acc.identifiers?.iban?.iban),
    balance: Math.round(balance),
    type,
  };
}

export function mapTinkTransaction(tx: TinkTransaction): Transaction {
  const signed = parseTinkAmount(tx.amount);
  const type: Transaction['type'] = signed >= 0 ? 'income' : 'expense';

  return {
    id: tx.id,
    accountId: tx.accountId,
    description: tx.descriptions?.display ?? tx.descriptions?.original ?? 'Transaktion',
    amount: Math.round(signed),
    type,
    date: tx.dates?.booked ?? '',
    category: tx.categories?.pfm?.name ?? (type === 'income' ? 'Einnahme' : 'Ausgabe'),
  };
}
