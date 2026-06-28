import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '../theme';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { useFinoStore } from '../store/useFinoStore';
import { formatEUR } from '../utils/format';
import { supabase } from '../lib/supabase';
import { exportInvoicePdf } from '../services/generateInvoicePdf';

function formatDate(iso?: string): string {
  if (!iso) return 'Unbekannt';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const invoice = useFinoStore((s) => s.invoices.find((inv) => inv.id === id));
  const updateInvoiceStatus = useFinoStore((s) => s.updateInvoiceStatus);
  const deleteInvoice = useFinoStore((s) => s.deleteInvoice);

  const [exporting, setExporting] = useState(false);

  if (!invoice) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={colors.cardWhite} />
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Rechnung nicht gefunden.</Text>
        </View>
      </View>
    );
  }

  const handleExportPdf = async () => {
    if (!invoice || exporting) return;
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email ?? 'freelancer@fino.app';
      await exportInvoicePdf(invoice, email);
    } catch {
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    } finally {
      setExporting(false);
    }
  };

  const handleMarkPaid = () => {
    Alert.alert(
      'Als bezahlt markieren',
      `Rechnung ${invoice.invoiceNumber} als bezahlt markieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Bestaetigen',
          onPress: async () => {
            await updateInvoiceStatus(invoice.id, 'paid');
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Rechnung loeschen',
      `${invoice.invoiceNumber} unwiderruflich loeschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Loeschen',
          style: 'destructive',
          onPress: async () => {
            await deleteInvoice(invoice.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      {/* Navy Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={colors.cardWhite} />
            </Pressable>
            <Text style={styles.headerTitle}>Rechnung</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.customerName}>{invoice.customerName}</Text>
          <Text style={styles.amount}>{formatEUR(invoice.amount)}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={invoice.status} info={invoice.daysInfo} />
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailCard}>
          <DetailRow
            icon="calendar-outline"
            label="Faelligkeitsdatum"
            value={formatDate(invoice.dueDate)}
          />
          {invoice.createdAt && (
            <>
              <View style={styles.rowDivider} />
              <DetailRow
                icon="time-outline"
                label="Erstellt am"
                value={formatDate(invoice.createdAt)}
              />
            </>
          )}
          <View style={styles.rowDivider} />
          <DetailRow
            icon="person-outline"
            label="Kunde"
            value={invoice.customerName}
          />
          <View style={styles.rowDivider} />
          <DetailRow
            icon="cash-outline"
            label="Betrag"
            value={formatEUR(invoice.amount)}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {invoice.status !== 'paid' && (
            <Button label="Als bezahlt markieren" onPress={handleMarkPaid} />
          )}
          <Pressable
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={handleExportPdf}
            disabled={exporting}
          >
            <Ionicons name="share-outline" size={16} color={colors.navy} />
            <Text style={styles.exportBtnText}>
              {exporting ? 'PDF wird erstellt...' : 'PDF exportieren'}
            </Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.dangerText} />
            <Text style={styles.deleteBtnText}>Rechnung loeschen</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color={colors.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.cardWhite,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },

  // Hero
  heroSection: {
    paddingVertical: spacing.xl,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.textDark,
    lineHeight: 50,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
  },

  // Detail card
  detailCard: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadow.subtle,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    gap: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 58,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },

  // Actions
  actions: {
    gap: spacing.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardWhite,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerText,
    backgroundColor: colors.dangerBg,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dangerText,
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
