# FINO – Finanz-Copilot für Freelancer

Mobile App (React Native + Expo). Verbindet Konten, teilt Zahlungseingänge automatisch auf, zeigt die **Real Balance** und gibt Copilot-Hinweise.

## Was die App kann (MVP)

- **Onboarding**: Willkommen, Konto verbinden (Sandbox), Steuer-/Fixkostenregeln einstellen
- **Dashboard**: Real Balance prominent, Töpfe (Steuer, Fixkosten), Copilot-Warnungen, letzte Bewegungen
- **Rechnungen**: Liste mit Status (Bezahlt/Fällig/Überfällig), Filter, neue Rechnung erstellen
- **Konten**: Verbundene Banken, Gesamtsaldo, weiteres Konto verbinden
- **Copilot**: Chat der "Kann ich mir X leisten?" beantwortet (regelbasiert, später echtes LLM)

## Setup

Voraussetzung: Node.js 18+ und npm.

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. App starten
npx expo start
```

Dann:
- **Auf dem Handy**: Expo Go App installieren (App Store / Play Store), QR-Code scannen
- **iOS Simulator**: Taste `i` drücken (nur macOS mit Xcode)
- **Android Emulator**: Taste `a` drücken (mit Android Studio)
- **Browser**: Taste `w` drücken (schnellster Test)

## Projektstruktur

```
fino-app/
├── app/                      # Screens (expo-router, file-based routing)
│   ├── _layout.tsx           # Root Stack
│   ├── index.tsx             # Redirect (Onboarding oder Tabs)
│   ├── onboarding.tsx        # 3-Schritt Onboarding
│   └── (tabs)/
│       ├── _layout.tsx       # Tab Navigator
│       ├── dashboard.tsx     # Hauptscreen mit Real Balance
│       ├── invoices.tsx      # Rechnungen + Erstell-Modal
│       ├── accounts.tsx      # Konten
│       └── copilot.tsx       # Chat
├── components/               # Card, Button, StatusBadge
├── theme/                    # Design-System (Farben, Typo, Spacing)
├── store/                    # Zustand State Management
├── data/                     # Mock-Daten (ersetzbar durch Tink)
└── utils/                    # formatEUR Helper
```

## Real Balance Logik

Die Kernformel in `store/useFinoStore.ts`:

```
Real Balance = Gesamtsaldo aller Konten
             − Steuer-Rücklage (30% der Einnahmen)
             − Fixkosten-Rücklage (20% der Einnahmen)
```

Die Prozentsätze sind im Onboarding einstellbar und in `rules` gespeichert.

## Nächste Schritte

1. **Echte Bankanbindung**: Mock-Daten durch Tink Sandbox ersetzen (siehe `TINK_INTEGRATION.md`)
2. **Backend**: Supabase für Auth + Datenpersistenz
3. **Echter Copilot**: Regelbasierte Antworten durch Claude API ersetzen
4. **Push-Benachrichtigungen**: Für Copilot-Warnungen (überfällige Rechnungen etc.)

## Design-System

Strikt eingehalten in `theme/index.ts`. Farben: Navy `#0B1736`, Cyan `#10BFE8`, Türkis `#12D6C5`, Off-White `#F7FAFC`. Inter-Schrift, große Headlines, viel Whitespace.
