import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../lib/authStore';
import { useTheme } from '../../lib/ThemeContext';
import { FONTS, FONT_SIZES, RADII, SPACING } from '../../constants/theme';

const EDGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-advisor`;
const FREE_DAILY_LIMIT = 3;

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
}

export default function Advisor() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [queriesRemaining, setQueriesRemaining] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  const canSend = input.trim().length > 0 && !loading && !!session;

  const send = async () => {
    const text = input.trim();
    if (!canSend || !text) return;

    setMessages((prev) => [{ id: `u-${Date.now()}`, role: 'user', text }, ...prev]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          { id: `e-${Date.now()}`, role: 'error', text: json.error ?? 'Something went wrong.' },
          ...prev,
        ]);
      } else {
        setMessages((prev) => [
          { id: `a-${Date.now()}`, role: 'assistant', text: json.reply },
          ...prev,
        ]);
        setQueriesRemaining(json.queriesRemaining);
      }
    } catch {
      setMessages((prev) => [
        { id: `e-${Date.now()}`, role: 'error', text: 'Network error — please try again.' },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    if (item.role === 'error') {
      return (
        <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: theme.debtBg }]}>
          <Text style={[styles.bubbleText, { color: theme.debt, fontFamily: FONTS.body }]}>
            {item.text}
          </Text>
        </View>
      );
    }
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
          { backgroundColor: isUser ? theme.brand : theme.surface },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? theme.brandInk : theme.ink, fontFamily: FONTS.body },
          ]}
        >
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
          AI Advisor
        </Text>
        <Text style={[styles.subtitle, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
          {queriesRemaining !== null
            ? `${queriesRemaining} of ${FREE_DAILY_LIMIT} free questions left today`
            : `${FREE_DAILY_LIMIT} free questions per day`}
        </Text>
      </View>

      {/* Message list — inverted so newest is at the bottom */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          loading ? (
            <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: theme.surface }]}>
              <ActivityIndicator size="small" color={theme.brand} />
            </View>
          ) : null
        }
        ListFooterComponent={
          messages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.ink, fontFamily: FONTS.displayBold }]}>
                Ask me anything about your finances
              </Text>
              <Text style={[styles.emptyBody, { color: theme.inkSoft, fontFamily: FONTS.body }]}>
                I can help with budgeting, debt payoff strategies, and spending habits — using your real Centsy data.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.line,
            paddingBottom: insets.bottom + SPACING.s2,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: theme.ink,
              backgroundColor: theme.surface3,
              fontFamily: FONTS.body,
            },
          ]}
          placeholder="Ask your advisor..."
          placeholderTextColor={theme.inkSoft}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={send}
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? theme.brand : theme.surface3 },
          ]}
          onPress={send}
          disabled={!canSend}
        >
          <Text
            style={[
              styles.sendLabel,
              {
                color: canSend ? theme.brandInk : theme.inkSoft,
                fontFamily: FONTS.bodySemiBold,
              },
            ]}
          >
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.s5,
    paddingTop: SPACING.s6,
    paddingBottom: SPACING.s3,
  },
  title: { fontSize: FONT_SIZES.h1, marginBottom: 2 },
  subtitle: { fontSize: FONT_SIZES.small },
  listContent: {
    paddingHorizontal: SPACING.s4,
    paddingVertical: SPACING.s3,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.s4,
    paddingVertical: SPACING.s3,
    marginVertical: 4,
  },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleAI: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: FONT_SIZES.body, lineHeight: 22 },
  empty: {
    alignItems: 'center',
    paddingHorizontal: SPACING.s6,
    paddingTop: SPACING.s8 * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.h3,
    textAlign: 'center',
    marginBottom: SPACING.s3,
  },
  emptyBody: {
    fontSize: FONT_SIZES.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.s2,
    paddingTop: SPACING.s3,
    paddingHorizontal: SPACING.s3,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.s3,
    paddingVertical: SPACING.s2 + 2,
    fontSize: FONT_SIZES.body,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: SPACING.s4,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: { fontSize: 14.5 },
});
