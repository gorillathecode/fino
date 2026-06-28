import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '../../theme';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { useFinoStore } from '../../store/useFinoStore';
import { formatEUR } from '../../utils/format';

type Filter = 'all' | 'due' | 'paid';

export default function Invoices() {
  const router = useRouter();
  const invoices = useFinoStore((s) => s.invoices);
  const addInvoice = useFinoStore((s) => s.addInvoice);

  const [filter, setFilter] = useState<Filter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');

  const filtered = invoices.filter((inv) => {
    if (filter === 'all') return true;
    if (filter === 'due') return inv.status === 'due' || inv.status === 'overdue';
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const handleCreate = () => {
    if (!customerName || !amount) return;
    const num = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!num) return;
    const nextNum = 16 + invoices.length;
    addInvoice({
      id: `inv-${Date.now()}`,
      invoiceNumber: `RE-2026-0${nextNum}`,
      customerName,
      amount: num,
      status: 'due',
      dueDate: '2026-07-15',
      daysInfo: 'Fällig in 21 Tagen',
    });
    setCustomerName('');
    setAmount('');
    setModalVisible(false);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Rechnungen</Text>
            <Pressable onPress={() => setModalVisible(true)} hitSlop={12}>
              <Ionicons name="add" size={24} color={colors.turquoise} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'due', 'paid'] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Alle' : f === 'due' ? 'Offen' : 'Bezahlt'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((inv) => (
          <Pressable
            key={inv.id}
            onPress={() => router.push({ pathname: '/invoice-detail', params: { id: inv.id } })}
          >
            <Card style={styles.invoiceCard}>
              <View style={styles.invoiceTop}>
                <Text style={styles.customerName}>{inv.customerName}</Text>
                <Text style={styles.invoiceAmount}>{formatEUR(inv.amount)}</Text>
              </View>
              <View style={styles.invoiceBottom}>
                <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                <StatusBadge status={inv.status} info={inv.daysInfo} />
              </View>
            </Card>
          </Pressable>
        ))}
        {filtered.length === 0 && invoices.length === 0 && (
          <EmptyState
            icon="document-text-outline"
            title="Noch keine Rechnungen"
            subtitle="Erstelle deine erste Rechnung und behalte den Ueberblick."
            actionLabel="Rechnung erstellen"
            onAction={() => setModalVisible(true)}
          />
        )}
        {filtered.length === 0 && invoices.length > 0 && (
          <EmptyState
            icon="document-text-outline"
            title="Keine Ergebnisse"
            subtitle="Keine Rechnungen passen zu diesem Filter."
          />
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Neue Rechnung</Text>

            <Text style={styles.inputLabel}>Kunde</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. Müller GmbH"
              placeholderTextColor={colors.textMuted}
              value={customerName}
              onChangeText={setCustomerName}
            />

            <Text style={styles.inputLabel}>Betrag (EUR)</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. 2500"
              placeholderTextColor={colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
            />

            <View style={{ height: spacing.md }} />
            <Button label="Rechnung erstellen" onPress={handleCreate} />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Abbrechen"
              variant="secondary"
              onPress={() => setModalVisible(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.cardWhite,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  invoiceCard: {
    padding: 18,
    marginBottom: spacing.md,
  },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  invoiceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,17,38,0.45)',
  },
  modalSheet: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textDark,
  },
});
