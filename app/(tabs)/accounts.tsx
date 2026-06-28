import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useFinoStore } from '../../store/useFinoStore';
import { formatEUR } from '../../utils/format';
import {
  isTinkConfigured, openTinkLink, exchangeCodeForToken,
  fetchTinkAccounts, fetchTinkTransactions,
} from '../../services/tink';

export default function Accounts() {
  const accounts = useFinoStore((s) => s.accounts);
  const totalBalance = useFinoStore((s) => s.totalBalance());
  const tinkConnected = useFinoStore((s) => s.tinkConnected);
  const addAccount = useFinoStore((s) => s.addAccount);
  const setTinkData = useFinoStore((s) => s.setTinkData);

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo fallback when no real Tink app is configured (no EXPO_PUBLIC_TINK_CLIENT_ID).
  const simulateConnect = () =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        addAccount({
          id: `acc-${Date.now()}`,
          bankName: 'Sparkasse Geschäft',
          ibanMasked: 'DE44 •••• 1203',
          balance: 3200,
          type: 'business',
        });
        resolve();
      }, 1200);
    });

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      if (!isTinkConfigured()) {
        await simulateConnect();
        return;
      }

      const code = await openTinkLink();
      if (!code) return; // vom Nutzer abgebrochen

      const token = await exchangeCodeForToken(code);
      if (!token) {
        setError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
        return;
      }

      const [tinkAccounts, tinkTransactions] = await Promise.all([
        fetchTinkAccounts(token),
        fetchTinkTransactions(token),
      ]);
      setTinkData(tinkAccounts, tinkTransactions);
    } catch {
      setError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Konten</Text>
            <Pressable onPress={handleAdd} hitSlop={12} disabled={adding}>
              <Ionicons name="add" size={24} color={colors.turquoise} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total across all accounts */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Gesamtsaldo aller Konten</Text>
          <Text style={styles.totalValue}>{formatEUR(totalBalance)}</Text>
        </View>

        {accounts.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="Kein Konto verbunden"
            subtitle="Verbinde dein erstes Konto um die Real Balance zu sehen."
            actionLabel="Konto verbinden"
            onAction={handleAdd}
          />
        ) : (
          <>
            {accounts.map((acc) => (
              <Card key={acc.id} style={styles.accountCard}>
                <View style={styles.accountTop}>
                  <View style={styles.bankIcon}>
                    <Ionicons name="business-outline" size={20} color={colors.turquoise} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankName}>{acc.bankName}</Text>
                    <Text style={styles.iban}>{acc.ibanMasked}</Text>
                  </View>
                  <View
                    style={[
                      styles.typeTag,
                      { backgroundColor: acc.type === 'business' ? '#E6F1FB' : '#E1F5EE' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeTagText,
                        { color: acc.type === 'business' ? '#185FA5' : '#0F6E56' },
                      ]}
                    >
                      {acc.type === 'business' ? 'Geschaeft' : 'Privat'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.accountBalance}>{formatEUR(acc.balance)}</Text>
              </Card>
            ))}

            {/* Add account button */}
            <Pressable onPress={handleAdd} style={styles.addCard} disabled={adding}>
              <Ionicons
                name={adding ? 'sync' : 'add'}
                size={18}
                color={colors.cyan}
              />
              <Text style={styles.addText}>
                {adding ? 'Verbinde ueber Open Banking...' : 'Konto verbinden'}
              </Text>
            </Pressable>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {tinkConnected && (
          <View style={styles.connectedRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.turquoise} />
            <Text style={styles.connectedText}>Live über Tink verbunden</Text>
          </View>
        )}

        <Text style={styles.note}>
          FINO liest nur mit. Kein Kontowechsel, keine Passwörter. Sicher über Open Banking (PSD2).
        </Text>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  totalSection: {
    paddingVertical: spacing.xl,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textDark,
  },
  accountCard: {
    padding: 18,
    marginBottom: spacing.md,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  iban: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  accountBalance: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C5D2E3',
    marginTop: spacing.xs,
  },
  addText: {
    fontSize: 14,
    color: colors.cyan,
    fontWeight: '500',
  },
  error: {
    fontSize: 13,
    color: colors.dangerText,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  connectedText: {
    fontSize: 12,
    color: colors.successText,
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
