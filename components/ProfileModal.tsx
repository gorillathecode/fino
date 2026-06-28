import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '../theme';
import { useFinoStore } from '../store/useFinoStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileModal({ visible, onClose }: Props) {
  const router = useRouter();
  const session = useFinoStore((s) => s.session);
  const rules = useFinoStore((s) => s.rules);
  const setRules = useFinoStore((s) => s.setRules);
  const accounts = useFinoStore((s) => s.accounts);
  const signOut = useFinoStore((s) => s.signOut);

  const [taxPct, setTaxPct] = useState(rules.taxPct);
  const [fixedPct, setFixedPct] = useState(rules.fixedPct);
  const [notifications, setNotifications] = useState(false);

  const email = session?.user?.email ?? '';
  const initials = email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const memberSince = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const handleTaxChange = (v: number) => {
    setTaxPct(v);
    setRules({ taxPct: v, fixedPct });
  };

  const handleFixedChange = (v: number) => {
    setFixedPct(v);
    setRules({ taxPct, fixedPct: v });
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.replace('/auth');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Account loeschen',
      'Diese Funktion ist noch nicht verfuegbar. Bitte kontaktiere den Support.',
      [{ text: 'OK' }],
    );
  };

  const handleDatenschutz = () => {
    Alert.alert(
      'Datenschutz',
      'FINO verarbeitet deine Finanzdaten ausschliesslich zur Berechnung deiner Real Balance. Daten werden sicher in der EU gespeichert. Keine Weitergabe an Dritte.',
      [{ text: 'Verstanden' }],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar + User Info */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Text style={styles.avatarEmail}>{email}</Text>
            {memberSince ? (
              <Text style={styles.avatarSince}>Mitglied seit {memberSince}</Text>
            ) : null}
          </View>

          {/* Finanzen */}
          <SectionHeader label="Finanzen" />

          <View style={styles.card}>
            <Stepper
              icon="receipt-outline"
              label="Steuer-Ruecklage"
              value={taxPct}
              onDecrease={() => handleTaxChange(Math.max(0, taxPct - 5))}
              onIncrease={() => handleTaxChange(Math.min(100, taxPct + 5))}
            />
            <View style={styles.rowDivider} />
            <Stepper
              icon="home-outline"
              label="Fixkosten-Ruecklage"
              value={fixedPct}
              onDecrease={() => handleFixedChange(Math.max(0, fixedPct - 5))}
              onIncrease={() => handleFixedChange(Math.min(100, fixedPct + 5))}
            />
          </View>

          {/* App */}
          <SectionHeader label="App" />

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications-outline" size={18} color={colors.cyan} />
              </View>
              <Text style={styles.rowLabel}>Benachrichtigungen</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.border, true: colors.cyan }}
                thumbColor={colors.cardWhite}
              />
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="information-circle-outline" size={18} color={colors.cyan} />
              </View>
              <Text style={styles.rowLabel}>App-Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
          </View>

          {/* Konto */}
          <SectionHeader label="Konto" />

          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => {
                onClose();
                router.push('/(tabs)/accounts');
              }}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="business-outline" size={18} color={colors.cyan} />
              </View>
              <Text style={styles.rowLabel}>Verbundene Konten</Text>
              <Text style={styles.rowValue}>{accounts.length}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} style={styles.rowChevron} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable style={styles.row} onPress={handleDatenschutz}>
              <View style={styles.rowIcon}>
                <Ionicons name="shield-outline" size={18} color={colors.cyan} />
              </View>
              <Text style={styles.rowLabel}>Datenschutz</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} style={styles.rowChevron} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable style={styles.row} onPress={handleDeleteAccount}>
              <View style={[styles.rowIcon, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="trash-outline" size={18} color={colors.dangerText} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.dangerText }]}>Account loeschen</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} style={styles.rowChevron} />
            </Pressable>
          </View>

          {/* Sitzung */}
          <SectionHeader label="Sitzung" />

          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.cardWhite} />
            <Text style={styles.signOutText}>Abmelden</Text>
          </Pressable>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>;
}

function Stepper({
  icon,
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.cyan} />
      </View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable onPress={onDecrease} style={styles.stepperBtn} hitSlop={8}>
          <Ionicons name="remove" size={16} color={colors.navy} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}%</Text>
        <Pressable onPress={onIncrease} style={styles.stepperBtn} hitSlop={8}>
          <Ionicons name="add" size={16} color={colors.navy} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11,23,54,0.4)',
  },
  sheet: {
    backgroundColor: colors.offWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    ...shadow.card,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.cardWhite,
    letterSpacing: 2,
  },
  avatarEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  avatarSince: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Section header
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    marginLeft: 4,
  },

  // Card / rows
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  rowChevron: {
    marginLeft: 4,
  },

  // Stepper
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    minWidth: 40,
    textAlign: 'center',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: spacing.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cardWhite,
  },
});
