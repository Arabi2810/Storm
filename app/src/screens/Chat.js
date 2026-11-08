import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Platform, Animated, Easing, useWindowDimensions } from 'react-native';
import { C, R, FONT, sheet } from '../theme';
import { Title, Body, Small, Card, Tap, Btn, Chip, StatusChip, Avatar, Empty, Loading, Pop } from '../components/ui';
import { api, run, usePoll, day, timeOf, sameDay } from '../api';

const font = FONT ? { fontFamily: FONT } : null;

/* Total unread messages, for the badge on the "Messages" tab. */
export function useUnread() {
  const [chats] = usePoll('/chats', 10000);
  return Array.isArray(chats) ? chats.reduce((a, c) => a + (c.unread || 0), 0) : 0;
}

/* The list of conversations. One row per job that has a chosen student. */
export function Inbox({ open }) {
  const [chats] = usePoll('/chats', 6000);
  if (!chats) return <Loading rows={2} />;
  if (!Array.isArray(chats) || !chats.length) {
    return <Empty icon="💬" title="No conversations yet" text="Chat opens as soon as a company chooses a student for a job." />;
  }
  return chats.map((c) => (
    <Tap key={c.task} onPress={() => open(c.task)} label={`Chat about ${c.title}`}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar name={c.other} tone="blue" />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[font, { color: C.ink, fontWeight: c.unread ? '800' : '700', fontSize: 15 }]}>{c.other}</Text>
          <Small numberOfLines={1}>{c.title}</Small>
          <Text numberOfLines={1} style={[font, { color: c.unread ? C.ink : C.mute, fontSize: 13, marginTop: 2, fontWeight: c.unread ? '600' : '400' }]}>
            {c.last ? `${c.last.mine ? 'You: ' : ''}${c.last.text}` : 'Say hello and agree on the details'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {c.last ? <Small>{sameDay(c.last.at, Date.now()) ? timeOf(c.last.at) : day(c.last.at)}</Small> : null}
          {c.unread > 0 ? <Pop key={c.unread}><View style={st.badge}><Text style={st.badgeText}>{c.unread}</Text></View></Pop> : null}
        </View>
      </View>
    </Tap>
  ));
}

/* New messages slide in from their side. Messages that were already there just appear. */
function Enter({ fresh, mine, children, style }) {
  const v = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  useEffect(() => {
    if (fresh) Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>{children}</Animated.View>
  );
}

function Bubble({ m, showName, fresh }) {
  const staff = m.role === 'admin';
  return (
    <Enter fresh={fresh} style={[st.bubbleWrap, m.mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
      {showName && !m.mine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, marginLeft: 4 }}>
          <Small style={{ fontWeight: '700', color: C.inkSoft }}>{m.name}</Small>
          {staff ? <Chip tone="gold" text="Admin" /> : null}
        </View>
      ) : null}
      <View style={[st.bubble, m.mine ? st.mine : staff ? st.staff : st.theirs]}>
        <Text selectable style={[font, { fontSize: 15, lineHeight: 21, color: m.mine ? C.white : C.ink }]}>{m.text}</Text>
        <Text style={[font, { fontSize: 11, marginTop: 4, alignSelf: 'flex-end', color: m.mine ? 'rgba(255,255,255,.75)' : C.mute }]}>{timeOf(m.at)}</Text>
      </View>
    </Enter>
  );
}

/* A full chat for one job. New messages appear by themselves every few seconds. */
export function Chat({ id, user }) {
  const [d, reload] = usePoll(`/tasks/${id}/messages`, 4000);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef(null);
  const { height } = useWindowDimensions();
  const count = d && d.messages ? d.messages.length : 0;
  const seen = useRef(null); // ids already on screen when the chat opened: only later ones animate
  if (!seen.current && d && d.messages) seen.current = new Set(d.messages.map((x) => x._id));

  useEffect(() => { if (count && list.current) setTimeout(() => list.current && list.current.scrollToEnd({ animated: false }), 30); }, [count]);

  if (!d) return <Loading rows={2} />;
  if (!d.messages) return <Empty icon="!" title="Chat is not available" text="Go back and open the job again." />;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const ok = await run(async () => { await api(`/tasks/${id}/messages`, 'POST', { text: body }); await reload(); });
    if (ok) setText('');
    setSending(false);
  };
  const onKey = (e) => {
    const k = e.nativeEvent;
    if (Platform.OS === 'web' && k.key === 'Enter' && !k.shiftKey) { e.preventDefault && e.preventDefault(); send(); }
  };

  const other = user.role === 'company' ? d.student : user.role === 'student' ? d.company : `${d.company} and ${d.student}`;
  const multi = user.role === 'admin';
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Avatar name={multi ? d.company : other} tone="blue" />
          <View style={{ flex: 1 }}>
            <Title numberOfLines={1}>{other}</Title>
            <Small numberOfLines={1}>{d.task.title}</Small>
          </View>
          <StatusChip status={d.task.status} />
        </View>
      </Card>

      <View style={st.panel}>
        <ScrollView ref={list} nestedScrollEnabled style={{ maxHeight: Math.max(280, Math.min(height * 0.52, 520)), minHeight: 220 }} contentContainerStyle={{ padding: 12, flexGrow: 1, justifyContent: count ? 'flex-end' : 'center' }}>
          {!count && <Body style={{ textAlign: 'center' }}>No messages yet. Say hello and agree on the details of the job.</Body>}
          {d.messages.map((m, i) => {
            const prev = d.messages[i - 1];
            const newDay = !prev || !sameDay(prev.at, m.at);
            const showName = multi || m.role === 'admin' || !prev || prev.name !== m.name || newDay;
            return (
              <React.Fragment key={m._id}>
                {newDay ? <View style={st.dayPill}><Small style={{ fontWeight: '600' }}>{day(m.at)}</Small></View> : null}
                <Bubble m={m} fresh={!!seen.current && !seen.current.has(m._id)} showName={showName && (multi || m.role === 'admin')} />
              </React.Fragment>
            );
          })}
        </ScrollView>

        <View style={st.composer}>
          <TextInput
            accessibilityLabel="Message"
            placeholder="Write a message"
            placeholderTextColor={C.placeholder}
            value={text}
            onChangeText={setText}
            onKeyPress={onKey}
            multiline
            maxLength={1000}
            style={[st.input, font, Platform.OS === 'web' && { outlineStyle: 'none' }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={send} disabled={!text.trim() || sending}
            style={({ pressed }) => [st.send, (!text.trim() || sending) && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 18, marginTop: -2 }}>➤</Text>
          </Pressable>
        </View>
      </View>
      <Small style={{ textAlign: 'center', marginTop: 4 }}>Keep payments on the platform. Admins can read this chat if there is a problem.</Small>
    </>
  );
}

const st = sheet(() => ({
  panel: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  bubbleWrap: { marginVertical: 3 },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderRadius: 16 },
  mine: { backgroundColor: C.brandFill, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: C.greySoft, borderBottomLeftRadius: 4 },
  staff: { backgroundColor: C.goldSoft, borderBottomLeftRadius: 4 },
  dayPill: { alignSelf: 'center', backgroundColor: C.greySoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginVertical: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, borderRadius: 22, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.field, color: C.ink, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.brandFill, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: C.white, fontSize: 12, fontWeight: '800' },
}));
