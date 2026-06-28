import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

type Status = 'paid' | 'due' | 'overdue';

const config: Record<Status, { bg: string; text: string; label: (info?: string) => string }> = {
  paid: { bg: colors.successBg, text: colors.successText, label: () => 'Bezahlt' },
  due: { bg: colors.warningBg, text: colors.warningText, label: (info) => info || 'Fällig' },
  overdue: { bg: colors.dangerBg, text: colors.dangerText, label: () => 'Überfällig' },
};

export function StatusBadge({ status, info }: { status: Status; info?: string }) {
  const c = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{c.label(info)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
