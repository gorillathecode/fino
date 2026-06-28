# Tink Sandbox – Erster echter Test (Checkliste)

Diese Anleitung führt dich Schritt für Schritt durch den ersten echten Tink-Connect.
Arbeite sie von oben nach unten ab. Am Ende siehst du echte (Sandbox-)Kontodaten
in der App statt der Mock-Daten.

> Voraussetzung: Supabase CLI installiert (`npm i -g supabase`) und im Projekt
> angemeldet (`supabase login`, dann `supabase link --project-ref ylcccbcbznqvxogujeij`).

---

## 1. Sandbox-Credentials in der Tink Console holen

1. Registriere dich / melde dich an auf [console.tink.com](https://console.tink.com)
2. Oben links sicherstellen, dass der Modus auf **Sandbox** steht (nicht Production)
3. **Create app** (oder bestehende App öffnen)
4. Im App-Menü links: **App settings**
   - **Client ID** kopieren → das ist `EXPO_PUBLIC_TINK_CLIENT_ID` (öffentlich)
   - **Client secret** → einmalig generieren/anzeigen, sofort kopieren → das ist
     `TINK_CLIENT_SECRET` (geheim, nur Server). Wird er nicht angezeigt, neu generieren.
5. Unter **Products / Scopes** aktivieren: **Account Check** und **Transactions**
   (entspricht den Scopes `accounts:read,transactions:read`)

---

## 2. Redirect-URI eintragen

Damit der Callback `fino://tink-callback` zurück in die App findet:

1. Tink Console → deine App → **App settings** → Abschnitt **Redirect URIs**
2. **Add redirect URI** → exakt eintragen:
   ```
   fino://tink-callback
   ```
3. Speichern. (Ohne diesen Eintrag bricht Tink den Flow mit einem Redirect-Fehler ab.)

---

## 3. Backend aufsetzen (Supabase)

Alle Befehle im Projekt-Root ausführen.

**a) Migration einspielen** (legt `tink_credentials` mit RLS an):
```bash
supabase db push
```
> Alternativ ohne CLI: Inhalt von `supabase/migrations/0001_tink_credentials.sql`
> im Supabase Dashboard → SQL Editor einfügen und ausführen.

**b) Edge Function deployen:**
```bash
supabase functions deploy tink-token-exchange
```

**c) Secrets setzen** (serverseitig – `client_secret` landet NIE in der App):
```bash
supabase secrets set \
  TINK_CLIENT_ID=dein_client_id \
  TINK_CLIENT_SECRET=dein_client_secret \
  TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)
```
> `TOKEN_ENCRYPTION_KEY` verschlüsselt den gespeicherten `refresh_token` (AES-GCM).
> Einmal generieren und behalten – änderst du ihn, sind bestehende Tokens nicht mehr entschlüsselbar.

---

## 4. App konfigurieren (.env)

Im Projekt-Root existiert bereits eine `.env` mit den Client-Werten:
```
EXPO_PUBLIC_TINK_CLIENT_ID=ade805ed55ba41cbb50bb0d0308a35bd
EXPO_PUBLIC_SUPABASE_URL=https://ylcccbcbznqvxogujeij.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  (vollstaendig in .env)
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://ylcccbcbznqvxogujeij.functions.supabase.co
```
> Die `TINK_CLIENT_SECRET`-Zeile gehoert nie in `.env` (kein `EXPO_PUBLIC_`-Prefix).
> Sie wird via `supabase secrets set` serverseitig gesetzt (Schritt 3c).

App neu starten, damit die Env-Variable geladen wird:
```bash
npx expo start --clear
```

---

## 5. Connect-Flow testen (Sandbox-Bank)

1. In der App einloggen → Tab **Konten** → **Konto verbinden**
2. Tink Link öffnet sich. Markt **Deutschland**, dann die Sandbox-Testbank wählen:
   - **„Tink Demo Bank"** (auch „Test Provider" / „Demo Bank DE")
3. Demo-Login (Tink Sandbox-Standard):
   - **Username:** `u12345678`
   - **Passwort:** `12345678`
   > Falls die gewählte Demo-Bank andere Felder zeigt: Tink blendet die jeweils
   > gültigen Sandbox-Credentials direkt im Flow ein. Aktuelle Liste:
   > [docs.tink.com/resources/test-data](https://docs.tink.com/resources/test-data)
4. Zugriff bestätigen → Tink leitet zurück zu `fino://tink-callback`
5. Erwartetes Ergebnis: Die Konten-Liste zeigt echte Sandbox-Konten, der
   Gesamtsaldo aktualisiert sich, und unten erscheint **„Live über Tink verbunden"**.

---

## 6. Wenn etwas klemmt – Logs lesen

Das Debug-Logging ist mit `[TINK]` markiert (zentral abschaltbar, siehe unten).

- **App-Logs:** im Terminal von `npx expo start` (oder Browser-Konsole bei Web).
  Achte auf die `[TINK]`-Zeilen: kam ein `code` zurück? Ein `access_token`? Wie viele Accounts?
- **Edge-Function-Logs:**
  ```bash
  supabase functions logs tink-token-exchange
  ```
  Zeigt, ob der `code` ankommt, ob Tink ein Token liefert und ob das Speichern klappt.

**Debug-Logging abschalten:** In `services/tink.ts` den Schalter
`const TINK_DEBUG = true;` auf `false` setzen (ein einziger Ort).

### Häufige Fehler

| Symptom | Ursache / Fix |
|---|---|
| Sofort „Verbindung fehlgeschlagen", kein Browser | `EXPO_PUBLIC_TINK_CLIENT_ID` fehlt → App nutzt Mock-Fallback. `.env` prüfen, `--clear` neu starten. |
| Redirect-Fehler in Tink | `fino://tink-callback` nicht (exakt) als Redirect URI eingetragen (Schritt 2). |
| 401 beim Token-Exchange | Nicht in der App eingeloggt / Supabase-Session abgelaufen. Neu anmelden. |
| 400/invalid_client in Function-Logs | `TINK_CLIENT_ID`/`TINK_CLIENT_SECRET`-Secret falsch (Schritt 3c). |
| Token kommt, aber 0 Accounts | Scopes `Account Check` / `Transactions` nicht aktiviert (Schritt 1.5). |
