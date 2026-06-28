import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, shadow } from '../theme';
import { useFinoStore } from '../store/useFinoStore';

type Mode = 'login' | 'register';

export default function Auth() {
  const signIn = useFinoStore((s) => s.signIn);
  const signUp = useFinoStore((s) => s.signUp);
  const session = useFinoStore((s) => s.session);
  const onboarded = useFinoStore((s) => s.onboarded);
  const router = useRouter();

  // navigate away as soon as we have a session and data is loaded
  useEffect(() => {
    if (session) {
      router.replace(onboarded ? '/(tabs)/dashboard' : '/onboarding');
    }
  }, [session, onboarded]);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('E-Mail und Passwort erforderlich.');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'login') {
      const err = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      const { error: err, needsConfirmation } = await signUp(email.trim(), password);
      if (err) {
        setError(err);
      } else if (needsConfirmation) {
        setInfo('Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich anmelden.');
        setMode('login');
      }
    }

    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.logo}>
              fino<Text style={{ color: colors.turquoise }}>.</Text>
            </Text>
            <Text style={styles.headline}>
              {mode === 'login' ? 'Willkommen zurück.' : 'Konto erstellen.'}
            </Text>
            <Text style={styles.sub}>
              {mode === 'login'
                ? 'Melde dich an um fortzufahren.'
                : 'Starte deinen Finanz-Copilot.'}
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput
                style={styles.input}
                placeholder="deine@email.de"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>Passwort</Text>
              <TextInput
                style={styles.input}
                placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}
              {info && <Text style={styles.infoText}>{info}</Text>}
            </View>

            <Pressable
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.cardWhite} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.toggleBtn}
              onPress={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
                setInfo(null);
              }}
            >
              <Text style={styles.toggleText}>
                {mode === 'login'
                  ? 'Noch kein Konto? Registrieren'
                  : 'Bereits registriert? Anmelden'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.offWhite },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.lg,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.subtle,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 8,
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
  errorText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.dangerText,
    fontWeight: '500',
  },
  infoText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.successText,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
