import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '../../theme';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useFinoStore } from '../../store/useFinoStore';
import { formatEUR } from '../../utils/format';
import { ProfileModal } from '../../components/ProfileModal';

export default function Dashboard() {
  const [profileVisible, setProfileVisible] = useState(false);
  const realBalance = useFinoStore((s) => s.realBalance());
  const taxReserve = useFinoStore((s) => s.taxReserve());
  const fixedReserve = useFinoStore((s) => s.fixedReserve());
  const openInvoices = useFinoStore((s) => s.openInvoicesTotal());
  const insights = useFinoStore((s) => s.insights);
  const transactions = useFinoStore((s) => s.transactions);

  const recentTx = transactions.slice(0, 4);

  return (
    <View style={styles.root}>
      {/* Navy header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Text style={styles.logo}>
              fino<Text style={{ color: colors.turquoise }}>.</Text>
            </Text>
            <Pressable onPress={() => setProfileVisible(true)} hitSlop={12}>
              <Ionicons name="person-circle-outline" size={28} color="#9FB3D1" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Real Balance */}
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>Real Balance</Text>
          <Text style={styles.heroValue}>{formatEUR(realBalance)}</Text>
          <View style={styles.heroBadge}>
            <Ionicons name="arrow-up" size={14} color={colors.turquoise} />
            <Text style={styles.heroBadgeText}>wirklich verfügbar</Text>
          </View>
        </View>

        {/* Pots */}
        <View style={styles.potsRow}>
          <Card style={styles.potCard}>
            <View style={styles.potIconRow}>
              <Ionicons name="receipt-outline" size={18} color={colors.cyan} />
            </View>
            <Text style={styles.potLabel}>Steuer-Rücklage</Text>
            <Text style={styles.potValue}>{formatEUR(taxReserve)}</Text>
          </Card>
          <Card style={styles.potCard}>
            <View style={styles.potIconRow}>
              <Ionicons name="home-outline" size={18} color={colors.cyan} />
            </View>
            <Text style={styles.potLabel}>Fixkosten</Text>
            <Text style={styles.potValue}>{formatEUR(fixedReserve)}</Text>
          </Card>
        </View>

        {/* Open invoices summary */}
        <Card style={styles.invoiceSummary}>
          <View style={styles.invoiceSummaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Offene Rechnungen</Text>
              <Text style={styles.summaryValue}>{formatEUR(openInvoices)}</Text>
            </View>
            <View style={styles.summaryIcon}>
              <Ionicons name="document-text-outline" size={22} color={colors.cyan} />
            </View>
          </View>
        </Card>

        {/* Copilot insights */}
        {insights.map((insight) => (
          <View
            key={insight.id}
            style={[
              styles.insightCard,
              insight.type === 'warning' && styles.insightWarning,
              insight.type === 'info' && styles.insightInfo,
            ]}
          >
            <Ionicons
              name={insight.type === 'warning' ? 'warning-outline' : 'information-circle-outline'}
              size={16}
              color={insight.type === 'warning' ? '#D97706' : colors.cyan}
            />
            <Text style={styles.insightMessage}>{insight.message}</Text>
          </View>
        ))}

        {/* Recent transactions */}
        {recentTx.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title="Noch keine Bewegungen"
            subtitle="Verbinde ein Konto um deine Transaktionen zu sehen."
          />
        ) : (
          <>
            <Text style={styles.sectionHeading}>Letzte Bewegungen</Text>
            <Card padded={false} style={styles.txCard}>
              {recentTx.map((tx, i) => (
                <View
                  key={tx.id}
                  style={[styles.txRow, i < recentTx.length - 1 && styles.txRowBorder]}
                >
                  <View style={styles.txIcon}>
                    <Ionicons
                      name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={tx.type === 'income' ? colors.successText : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={styles.txCategory}>{tx.category}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'income' ? colors.successText : colors.textDark },
                    ]}
                  >
                    {formatEUR(tx.amount, true)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
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
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  heroSection: {
    paddingVertical: spacing.xl,
  },
  heroLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textDark,
    lineHeight: 52,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  heroBadgeText: {
    fontSize: 14,
    color: colors.turquoise,
    fontWeight: '500',
  },
  potsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  potCard: {
    flex: 1,
    padding: 18,
  },
  potIconRow: {
    marginBottom: 10,
  },
  potLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  potValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
  },
  invoiceSummary: {
    padding: 18,
    marginBottom: spacing.md,
  },
  invoiceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
    ...shadow.subtle,
  },
  insightWarning: {
    borderLeftColor: '#D97706',
  },
  insightInfo: {
    borderLeftColor: colors.cyan,
  },
  insightMessage: {
    flex: 1,
    fontSize: 13,
    color: colors.textDark,
    lineHeight: 19,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  txCard: {
    paddingHorizontal: 18,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
  },
  txCategory: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
