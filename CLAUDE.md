# FINO – Claude Code Context

Lies diese Datei komplett bevor du irgendetwas änderst.

---

## Produkt

FINO ist ein Finanz-Copilot für Freelancer und Selbstständige im DACH-Raum.
Keine Bank, kein Buchhaltungstool. Eine kontoübergreifende Steuerungszentrale die
Zahlungseingänge automatisch aufteilt, die Real Balance berechnet und proaktiv warnt.

Tagline: FINO trackt nicht nur. FINO handelt.
Zielgruppe: Freelancer DACH, 25-42, unregelmäßiges Einkommen.

---

## Stack

| Was | Womit |
|-----|-------|
| Framework | React Native + Expo SDK 54 |
| Sprache | TypeScript strict |
| Routing | expo-router (file-based) |
| State | Zustand |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| Open Banking | Tink (Sandbox aktiv, Production beantragt) |
| KI-Copilot | Claude API via Supabase Edge Function (claude-haiku-4-5-20251001) |
| Icons | NUR Ionicons — keine Lucide/Tabler/Feather Namen |
| PDF Export | expo-print + expo-sharing |
| Notifications | expo-notifications (gebaut, braucht EAS Build zum Testen) |

Node-Version: 20.x zwingend.
```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use v20.20.2
npx expo start --tunnel --clear
```

---

## Projektstruktur

```
app/
  _layout.tsx              Root-Stack. initializeAuth() + registerForPushNotifications()
  index.tsx                Gate: kein Session -> /auth | Session -> /onboarding oder /(tabs)/dashboard
  auth.tsx                 Login + Registrierung
  onboarding.tsx           3 Schritte: Welcome, Bank verbinden (Tink), Regeln einstellen
  invoice-detail.tsx       Rechnungsdetail: Status ändern, PDF Export, löschen
  (tabs)/
    _layout.tsx            Tab-Navigator (4 Tabs)
    dashboard.tsx          Real Balance + Töpfe + Copilot-Insights + Transaktionen
                           Avatar-Icon oben rechts öffnet ProfileModal
    invoices.tsx           Rechnungsliste + Filter + Erstell-Modal + Empty States
    accounts.tsx           Verbundene Konten + Tink Connect + Empty State
    copilot.tsx            KI-Chat via Claude API (claude-haiku-4-5-20251001)

components/
  Card.tsx                 Basis-Card. Nutze diese, keine eigenen Varianten.
  Button.tsx               Primary (navy) / Secondary (weiß mit Border)
  StatusBadge.tsx          paid | due | overdue
  EmptyState.tsx           Leere Listen mit Icon, Title, Subtitle, optionalem Button
  ProfileModal.tsx         Bottom Sheet: Profil, Einstellungen, Regeln, Abmelden

lib/
  supabase.ts              Client: SecureStore (native) / localStorage (web)

store/
  useFinoStore.ts          Zentraler State + berechnete Werte + checkAndNotify()

services/
  tink.ts                  buildTinkLinkUrl, openTinkLink, exchangeCodeForToken,
                           fetchTinkAccounts, fetchTinkTransactions,
                           mapTinkAccount, mapTinkTransaction, isTinkConfigured
  generateInvoicePdf.ts    HTML-Template -> expo-print -> expo-sharing
  notifications.ts         registerForPushNotifications, scheduleOverdueReminder,
                           scheduleLiquidityWarning, cancelAllNotifications

supabase/
  functions/
    tink-token-exchange/   Deno, JWT-verified, AES-GCM Verschlüsselung für refresh_token
    copilot-chat/          Deno, JWT-verified, Claude API Proxy (claude-haiku-4-5-20251001)
  migrations/
    0001_tink_credentials.sql

data/mockData.ts           Fallback wenn kein Tink verbunden
theme/index.ts             EINZIGE Quelle für Farben, Spacing, Shadows
utils/format.ts            formatEUR(amount, showSign?)
```

---

## Supabase Schema

```sql
user_rules       (user_id uuid PK, tax_pct int, fixed_pct int)
invoices         (id text PK, user_id uuid, invoice_number, customer_name,
                  amount, status, due_date, days_info)
customers        (id text PK, user_id uuid, name, email)
tink_credentials (user_id uuid PK, refresh_token_enc text, scope text, updated_at)
```

RLS auf allen Tabellen: auth.uid() = user_id.
tink_credentials nur via Service-Role Key (Edge Function) beschreibbar.

Supabase Projekt: ylcccbcbznqvxogujeij
Deployed Edge Functions: tink-token-exchange, copilot-chat

---

## Design-System (theme/index.ts — niemals abweichen)

```
Navy:       #0B1736   Header, Primary Buttons
Cyan:       #10BFE8   Akzente, Icons
Türkis:     #12D6C5   Logo-Punkt, Erfolg
Off White:  #F7FAFC   Screen-Hintergrund
Card White: #FFFFFF   Cards
Text Dark:  #101B3D   Haupttext
Text Muted: #667085   Sekundärtext
Border:     #E4EAF2   Borders
```

- Max 3 Hauptfarben pro Screen
- Cards: border-radius 20-24px, 1px solid Border, Shadow aus theme/index.ts
- Kein Gradient über ganze Flächen, keine Emojis
- Viel Whitespace, min. 35% der Fläche leer
- Jeder Screen hat exakt EINE Hauptaussage

---

## Real Balance Logik (Herzstück)

```
totalBalance()      = Summe aller Account-Salden
taxReserve()        = Einnahmen * rules.taxPct / 100
fixedReserve()      = Einnahmen * rules.fixedPct / 100
realBalance()       = totalBalance - taxReserve - fixedReserve
openInvoicesTotal() = Summe aller nicht-bezahlten Rechnungen
```

Defaults: taxPct 30%, fixedPct 20%. Einstellbar in ProfileModal.
Berechnungen IMMER im Store, nie in Screens duplizieren.

---

## Tink Flow

```
1. isTinkConfigured() prüfen (EXPO_PUBLIC_TINK_CLIENT_ID in .env)
2. openTinkLink() -> expo-web-browser öffnet Tink UI
3. Nutzer verbindet Bank (Sandbox: Tink Demo Bank mit Credentials aus console.tink.com)
4. Callback: fino://tink-callback?code=...
5. exchangeCodeForToken(code) -> supabase.functions.invoke('tink-token-exchange')
   -> Edge Function: code -> Tink OAuth -> access_token zurück
   -> refresh_token AES-GCM verschlüsselt in tink_credentials gespeichert
6. fetchTinkAccounts(token) + fetchTinkTransactions(token)
7. setTinkData(accounts, transactions) -> ersetzt Mock-Daten im Store
```

Tink Client ID: ade805ed55ba41cbb50bb0d0308a35bd (öffentlich, in .env)
Tink Production: beantragt, ausstehend (ariankabiri@outlook.com)
Mock-Daten als Fallback wenn kein Tink verbunden (tinkConnected Flag im Store).

---

## Copilot Flow

```
copilot.tsx -> supabase.functions.invoke('copilot-chat', { message, context })
context = { realBalance, taxReserve, fixedReserve, openInvoices }
Edge Function -> Anthropic API (claude-haiku-4-5-20251001, max_tokens: 300)
-> Antwort auf Deutsch, max 2-3 Sätze
```

Typing-Indikator während API-Call läuft.
Vorschlags-Chips für schnellen Einstieg bleiben erhalten.

---

## PDF-Rechnungsexport Flow

```
invoice-detail.tsx -> handleExportPdf()
-> supabase.auth.getUser() für E-Mail
-> generateInvoicePdf(invoice, email) in services/generateInvoicePdf.ts
-> Print.printToFileAsync({ html }) -> Sharing.shareAsync(uri)
-> Nativer Share-Sheet öffnet sich
```

---

## Auth Flow

```
App Start -> _layout.tsx -> initializeAuth()
          -> getSession() direkt (nicht auf Listener warten, wegen TOKEN_REFRESHED Bug)
          -> loadUserData() wenn Session vorhanden
          -> set({ loading: false })

onAuthStateChange: nur SIGNED_IN / SIGNED_OUT Events behandeln.

Logout: signOut() -> Store reset -> router.replace('/auth')
Logout-Button: in ProfileModal (öffnet sich via Avatar-Icon oben rechts im Dashboard)
```

---

## Push Notifications

Implementiert in services/notifications.ts und store/useFinoStore.ts (checkAndNotify()).
WICHTIG: Funktioniert nicht mit Expo Go. Braucht EAS Development Build.

Zum Testen:
```bash
npm install -g eas-cli
eas build --platform android --profile development
```

---

## Offene Aufgaben

1. Tink Production-Zugang abwarten (E-Mail an ariankabiri@outlook.com)
2. EAS Build erstellen für Push Notification Tests
3. Tink Auto-Refresh (refresh_token liegt in DB, zweite Edge Function fehlt noch)
4. Erste externe Nutzer testen lassen (3-5 Freelancer aus TU-Berlin-Netzwerk)

---

## Pflichtregeln

1. Nur Ionicons-Namen. Falsch: alert-triangle. Richtig: warning-outline.
2. Kein Em-Dash (—) in UI-Texten.
3. Alle UI-Texte auf Deutsch (DACH-Markt).
4. Nach jeder Änderung: npx tsc --noEmit
5. Erst Struktur, dann Styling. Nie beides im selben Diff.
6. Berechnungen gehören in den Store, nicht in Screens.
7. Bestehende Komponenten nutzen (Card, Button, StatusBadge, EmptyState).
8. client_secret und API Keys niemals in der App. Nur in Supabase Secrets.
9. Mock-Daten als Fallback behalten für Demo ohne Tink.