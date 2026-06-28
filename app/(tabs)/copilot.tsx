import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import { useFinoStore } from '../../store/useFinoStore';
import { formatEUR } from '../../utils/format';
import { supabase } from '../../lib/supabase';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'tip';
  text: string;
};

type ApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Copilot() {
  const session = useFinoStore((s) => s.session);
  const realBalance = useFinoStore((s) => s.realBalance());
  const taxReserve = useFinoStore((s) => s.taxReserve());
  const fixedReserve = useFinoStore((s) => s.fixedReserve());
  const openInvoices = useFinoStore((s) => s.openInvoicesTotal());
  const rules = useFinoStore((s) => s.rules);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm0',
      role: 'assistant',
      text: 'Hi! Ich bin dein Finanz-Copilot. Frag mich z.B. ob du dir etwas leisten kannst oder wie deine Steuerruecklage aussieht.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const chatHistoryRef = useRef<ApiMessage[]>([]);

  // Rule-based fallback for demo mode (no session / not logged in)
  const generateDemoResponse = (q: string): Message[] => {
    const lower = q.toLowerCase();

    const amountMatch = q.match(/(\d[\d.,]*)\s*(?:€|euro|eur)?/i);
    if (
      (lower.includes('leisten') || lower.includes('kaufen') || lower.includes('ausgeben')) &&
      amountMatch
    ) {
      const cost = parseInt(amountMatch[1].replace(/[^0-9]/g, ''), 10);
      if (cost) {
        const afterPurchase = realBalance - cost;
        if (afterPurchase >= 500) {
          return [{
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `Ja, das geht. Deine Real Balance ist ${formatEUR(realBalance)}. Nach dem Kauf von ${formatEUR(cost)} blieben dir noch ${formatEUR(afterPurchase)} verfuegbar.`,
          }];
        } else if (afterPurchase >= 0) {
          return [
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              text: `Knapp. Deine Real Balance ist ${formatEUR(realBalance)}, davon sind ${formatEUR(taxReserve)} fuer die Steuer reserviert. Nach dem Kauf blieben nur ${formatEUR(afterPurchase)} Puffer.`,
            },
            {
              id: `t-${Date.now()}`,
              role: 'tip',
              text: openInvoices > 0
                ? `Tipp: Du hast ${formatEUR(openInvoices)} an offenen Rechnungen. Warte auf den naechsten Zahlungseingang.`
                : 'Tipp: Plane den Kauf lieber fuer naechsten Monat ein.',
            },
          ];
        } else {
          return [
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              text: `Das wird eng. Deine Real Balance ist nur ${formatEUR(realBalance)}, der Kauf kostet ${formatEUR(cost)}. Das wuerde deine Steuerruecklage angreifen.`,
            },
            {
              id: `t-${Date.now()}`,
              role: 'tip',
              text: 'Tipp: Davon wuerde ich aktuell abraten. Deine Liquiditaet reicht nicht ohne Risiko.',
            },
          ];
        }
      }
    }

    if (lower.includes('steuer') || lower.includes('ruecklage')) {
      return [{
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Du hast aktuell ${formatEUR(taxReserve)} fuer die Steuer zurueckgelegt. Das sind ${rules.taxPct}% deiner Einnahmen, automatisch reserviert bei jedem Zahlungseingang.`,
      }];
    }

    if (lower.includes('verfuegbar') || lower.includes('balance') || lower.includes('geld')) {
      return [{
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Deine Real Balance ist ${formatEUR(realBalance)}. Das ist was nach Steuern und Fixkosten-Ruecklage ueber alle Konten wirklich frei verfuegbar ist.`,
      }];
    }

    if (lower.includes('rechnung') || lower.includes('offen')) {
      return [{
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Du hast ${formatEUR(openInvoices)} an offenen Rechnungen. Sobald die bezahlt werden, steigt deine Real Balance entsprechend.`,
      }];
    }

    return [{
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: 'Das kann ich noch nicht beantworten. Frag mich nach deiner Real Balance, Steuerruecklage, offenen Rechnungen oder ob du dir etwas leisten kannst.',
    }];
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    if (!session) {
      const responses = generateDemoResponse(text);
      setMessages((prev) => [...prev, ...responses]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setLoading(true);
    chatHistoryRef.current = [...chatHistoryRef.current, { role: 'user', content: text }];

    try {
      const { data, error } = await supabase.functions.invoke('copilot-chat', {
        body: {
          messages: chatHistoryRef.current,
          context: {
            realBalance,
            taxReserve,
            fixedReserve,
            openInvoices,
            taxPct: rules.taxPct,
            fixedPct: rules.fixedPct,
          },
        },
      });

      if (error || !data?.text) throw new Error(error?.message ?? 'No response');

      const aiMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', text: data.text };
      setMessages((prev) => [...prev, aiMsg]);
      chatHistoryRef.current = [...chatHistoryRef.current, { role: 'assistant', content: data.text }];
    } catch {
      // Roll back the user message from history on failure
      chatHistoryRef.current = chatHistoryRef.current.slice(0, -1);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Ich bin gerade nicht erreichbar. Bitte versuche es erneut.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.turquoise} />
            <Text style={styles.headerTitle}>Copilot</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <View key={msg.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{msg.text}</Text>
                </View>
              );
            }
            if (msg.role === 'tip') {
              return (
                <View key={msg.id} style={styles.tipBubble}>
                  <Text style={styles.tipText}>{msg.text}</Text>
                </View>
              );
            }
            return (
              <View key={msg.id} style={styles.aiBubble}>
                <Text style={styles.aiText}>{msg.text}</Text>
              </View>
            );
          })}

          {loading && (
            <View style={styles.aiBubble}>
              <Text style={[styles.aiText, styles.loadingText]}>...</Text>
            </View>
          )}

          <View style={{ height: spacing.md }} />
        </ScrollView>

        {/* Suggestion chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionsContent}
        >
          {['Kann ich mir 2.500 Euro leisten?', 'Wie viel Steuer habe ich?', 'Was ist verfuegbar?'].map(
            (s) => (
              <Pressable
                key={s}
                style={styles.suggestionChip}
                onPress={() => setInput(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            )
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Frag deinen Copilot..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            editable={!loading}
          />
          <Pressable onPress={send} style={[styles.sendBtn, loading && styles.sendBtnDisabled]} disabled={loading}>
            <Ionicons name="arrow-up" size={18} color={colors.cardWhite} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    gap: 8,
    paddingTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.cardWhite,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: colors.navy,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  userText: {
    fontSize: 14,
    color: colors.cardWhite,
    lineHeight: 20,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: colors.cardWhite,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20,
  },
  loadingText: {
    color: colors.textMuted,
    letterSpacing: 2,
  },
  tipBubble: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    backgroundColor: colors.successBg,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  tipText: {
    fontSize: 13,
    color: colors.successText,
    fontWeight: '500',
    lineHeight: 19,
  },
  suggestions: {
    maxHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestionsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  suggestionChip: {
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.textDark,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardWhite,
  },
  input: {
    flex: 1,
    backgroundColor: colors.offWhite,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textDark,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
