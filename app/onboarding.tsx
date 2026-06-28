import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadow } from '../theme';
import { Button } from '../components/Button';
import { useFinoStore } from '../store/useFinoStore';

export default function Onboarding() {
  const router = useRouter();
  const completeOnboarding = useFinoStore((s) => s.completeOnboarding);
  const rules = useFinoStore((s) => s.rules);

  const [step, setStep] = useState(0);
  const [taxPct, setTaxPct] = useState(rules.taxPct);
  const [fixedPct, setFixedPct] = useState(rules.fixedPct);
  const [bankConnected, setBankConnected] = useState(false);

  const finish = async () => {
    await completeOnboarding(taxPct, fixedPct);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* progress dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View style={styles.stepWrap}>
              <Text style={styles.logo}>
                fino<Text style={{ color: colors.turquoise }}>.</Text>
              </Text>
              <Text style={styles.hero}>Dein Finanz-Copilot für Freelancer.</Text>
              <Text style={styles.sub}>
                FINO verbindet alle deine Konten, teilt jeden Zahlungseingang automatisch auf und
                zeigt dir was wirklich verfügbar ist.
              </Text>
            </View>
          )}

          {step === 1 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>Konto verbinden</Text>
              <Text style={styles.sub}>
                Verbinde deine Bank sicher über Open Banking. FINO liest nur mit, kein
                Kontowechsel nötig.
              </Text>

              <Pressable
                onPress={() => setBankConnected(true)}
                style={[styles.bankOption, bankConnected && styles.bankConnected]}
              >
                <View style={styles.bankIcon}>
                  <Ionicons name="business-outline" size={22} color={colors.turquoise} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankName}>DKB Geschäftskonto</Text>
                  <Text style={styles.bankSub}>
                    {bankConnected ? 'Verbunden' : 'Tippen zum Verbinden'}
                  </Text>
                </View>
                {bankConnected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.turquoise} />
                )}
              </Pressable>

              <Text style={styles.sandboxNote}>
                Sandbox-Modus: Demo-Konten zum Testen. Echte Bankanbindung via Tink folgt.
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>Deine Regeln</Text>
              <Text style={styles.sub}>
                Lege fest wie FINO jeden Zahlungseingang automatisch aufteilt. Du kannst das
                jederzeit ändern.
              </Text>

              <RuleStepper label="Steuer-Rücklage" value={taxPct} onChange={setTaxPct} />
              <RuleStepper label="Fixkosten-Rücklage" value={fixedPct} onChange={setFixedPct} />

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Verfügbar pro Eingang</Text>
                <Text style={styles.previewValue}>{100 - taxPct - fixedPct}%</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 2 ? (
            <Button
              label="Weiter"
              onPress={() => setStep((s) => s + 1)}
              variant={step === 1 && !bankConnected ? 'secondary' : 'primary'}
            />
          ) : (
            <Button label="Los geht's" onPress={finish} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function RuleStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 5))}
          style={styles.stepperBtn}
        >
          <Ionicons name="remove" size={20} color={colors.navy} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}%</Text>
        <Pressable
          onPress={() => onChange(Math.min(100, value + 5))}
          style={styles.stepperBtn}
        >
          <Ionicons name="add" size={20} color={colors.navy} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  safe: { flex: 1 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.cyan,
    width: 24,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  stepWrap: {
    paddingVertical: spacing.xl,
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.lg,
  },
  hero: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textDark,
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  sub: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  taglineBox: {
    backgroundColor: '#E0F7FA',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(18,214,197,0.4)',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0077A8',
    textAlign: 'center',
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  bankConnected: {
    borderColor: colors.turquoise,
    borderWidth: 2,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  bankSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sandboxNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
    flex: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    minWidth: 48,
    textAlign: 'center',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E1F5EE',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F6E56',
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F6E56',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
