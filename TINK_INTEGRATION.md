# Tink Sandbox Integration

So ersetzt du die Mock-Daten durch echte Open-Banking-Daten von Tink.

## 1. Tink Account einrichten

1. Registriere dich auf [console.tink.com](https://console.tink.com)
2. Erstelle eine neue App im Sandbox-Modus
3. Notiere dir `client_id` und `client_secret`
4. Aktiviere die Produkte: **Account Check** und **Transactions**

## 2. Umgebungsvariablen

Erstelle eine `.env` Datei (nicht committen):

```
EXPO_PUBLIC_TINK_CLIENT_ID=dein_client_id
TINK_CLIENT_SECRET=dein_client_secret
```

Installiere das dotenv-Paket:

```bash
npx expo install expo-constants
```

## 3. Tink Link Flow (vereinfacht)

Tink nutzt einen OAuth-ähnlichen Flow. Der Nutzer wird zu Tink weitergeleitet, wählt seine Bank, autorisiert den Zugriff, und kommt mit einem `code` zurück.

```typescript
// services/tink.ts
const TINK_LINK_BASE = 'https://link.tink.com/1.0/transactions/connect-accounts';

export function buildTinkLinkUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.EXPO_PUBLIC_TINK_CLIENT_ID!,
    redirect_uri: 'fino://tink-callback',
    market: 'DE',
    locale: 'de_DE',
    scope: 'accounts:read,transactions:read',
  });
  return `${TINK_LINK_BASE}?${params.toString()}`;
}
```

## 4. Deep Link Handling

In `app.json` ist `scheme: "fino"` bereits gesetzt. Fange den Callback ab:

```typescript
import * as Linking from 'expo-linking';

Linking.addEventListener('url', ({ url }) => {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (code) {
    // Tausche code gegen access_token (über dein Backend!)
    exchangeCodeForToken(code as string);
  }
});
```

**Wichtig**: Der `client_secret` darf NIE in der App stehen. Der Token-Austausch muss über ein Backend laufen (z.B. Supabase Edge Function).

## 5. Daten abrufen

Nach erfolgreichem Token-Austausch:

```typescript
// Konten abrufen
const accounts = await fetch('https://api.tink.com/data/v2/accounts', {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then((r) => r.json());

// Transaktionen abrufen
const transactions = await fetch('https://api.tink.com/data/v2/transactions', {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then((r) => r.json());
```

## 6. In den Store mappen

Mappe die Tink-Antwort auf das `Account` / `Transaction` Format in `data/mockData.ts` und schreibe sie via `addAccount()` in den Store. Die Real-Balance-Berechnung funktioniert dann automatisch.

## Architektur-Empfehlung

```
App (Expo)  →  Backend (Supabase Edge Function)  →  Tink API
                     ↑ hält client_secret sicher
```

Niemals den `client_secret` oder Access Tokens direkt in der App speichern.

## Sandbox-Testdaten

Tink stellt Test-Banken bereit. Im Sandbox-Modus kannst du mit Demo-Credentials einen vollständigen Flow durchspielen ohne echte Bankdaten. Details: [docs.tink.com/resources/test-data](https://docs.tink.com).
