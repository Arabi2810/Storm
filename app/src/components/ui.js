import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ActivityIndicator, Animated, Easing, Platform, StyleSheet, AccessibilityInfo } from 'react-native';
import { C, R, T, FONT, shadow, STATUS, sheet, themed, useTheme, setThemePref } from '../theme';
import { initials } from '../api';

const font = FONT ? { fontFamily: FONT } : null;

/* ---------- Text ---------- */
export const H1 = ({ children, style }) => <Text accessibilityRole="header" style={[T.h1, font, style]}>{children}</Text>;
export const H2 = ({ children, style }) => <Text accessibilityRole="header" style={[T.h2, font, style]}>{children}</Text>;
export const Title = ({ children, style, ...p }) => <Text style={[T.title, font, style]} {...p}>{children}</Text>;
export const Body = ({ children, style, ...p }) => <Text style={[T.body, font, style]} {...p}>{children}</Text>;
export const Small = ({ children, style, ...p }) => <Text style={[T.small, font, style]} {...p}>{children}</Text>;

/* ---------- Motion ---------- */
/* People who turn on "reduce motion" in their phone or browser get no movement. */
let reduceMotion = false;
try {
  AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion = !!v; }).catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduceMotion = !!v; });
} catch (e) { /* not supported here: keep motion on */ }
const NATIVE = Platform.OS !== 'web';

export function FadeIn({ delay = 0, children, style, from = 'bottom', dist = 22, dur = 560 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reduceMotion ? 0 : dur, delay: reduceMotion ? 0 : delay, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, []);
  const move = from === 'bottom' || from === 'top'
    ? { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from === 'top' ? -dist : dist, 0] }) }
    : { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [(from === 'left' ? -1 : 1) * dist * 1.4, 0] }) };
  return <Animated.View style={[style, { opacity: v, transform: [move] }]}>{children}</Animated.View>;
}

function useCount(target) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setN(Math.round(value)));
    Animated.timing(v, { toValue: Number(target) || 0, duration: reduceMotion ? 0 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [target]);
  return n;
}

export function Float({ style, dy = 14, dur = 4200 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] }]} />;
}

export const Banner = () => (
  <View style={[{ height: 76, backgroundColor: C.brandFill, overflow: 'hidden' }, Platform.OS === 'web' && { backgroundImage: 'radial-gradient(circle at 92% 0%, rgba(255,138,92,.65), transparent 50%), linear-gradient(120deg,#1E1B6B,#4F46E5)' }]}>
    <Float dy={10} dur={3800} style={{ position: 'absolute', right: 40, top: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,.09)' }} />
  </View>
);

/* ---------- Layout ---------- */
/* Cards that mount in the same burst (a list, a tab) get a rising delay automatically,
   so every screen staggers in without each screen having to ask. */
let _last = 0, _seq = 0;
const autoDelay = () => { const n = Date.now(); if (n - _last > 150) _seq = 0; _last = n; return Math.min(_seq++, 8) * 65; };

/* Hook for tab bodies: which way should the new tab slide in from? */
export function useTabDir(items, tab) {
  const prev = useRef(items.indexOf(tab));
  const i = items.indexOf(tab);
  const d = i >= prev.current ? 'right' : 'left';
  prev.current = i;
  return d;
}

export function Card({ children, style, accent, delay }) {
  const [d] = useState(() => (delay != null ? delay : autoDelay()));
  return (
    <FadeIn delay={d} dist={16} dur={440}>
      <View style={[st.card, shadow(1), accent && { borderLeftWidth: 4, borderLeftColor: C[accent] || accent }, style]}>{children}</View>
    </FadeIn>
  );
}

export function Tap({ onPress, children, label, delay }) {
  const [dl] = useState(() => (delay != null ? delay : autoDelay()));
  const sc = useRef(new Animated.Value(1)).current;
  const to = (x) => Animated.spring(sc, { toValue: x, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 7 }).start();
  return (
    <FadeIn delay={dl} dist={16} dur={440}><Animated.View style={{ transform: [{ scale: sc }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={() => to(0.975)} onPressOut={() => to(1)}
        style={({ hovered }) => [st.card, shadow(1), hovered && Platform.OS === 'web' && st.cardHover]}>
        {children}
      </Pressable>
    </Animated.View></FadeIn>
  );
}

export const Row = ({ children, style, between }) => (
  <View style={[st.row, between && { justifyContent: 'space-between' }, style]}>{children}</View>
);

export const Section = ({ title, count, action, children }) => (
  <View style={{ marginTop: 20 }}>
    <View style={st.sectionHead}>
      <H2>{title}{typeof count === 'number' ? <Text style={st.sectionCount}>  {count}</Text> : null}</H2>
      {action}
    </View>
    {children}
  </View>
);

export const Divider = () => <View style={{ height: 1, backgroundColor: C.line, marginVertical: 12 }} />;

/* ---------- Button ---------- */
function BtnBase({ title, onPress, kind = 'solid', icon, disabled, small, full = true }) {
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const off = disabled || busy;
  const press = async () => {
    if (off) return;
    setBusy(true);
    let good = false;
    try { good = (await onPress()) !== false; } finally { if (alive.current) setBusy(false); }
    if (good && alive.current && (kind === 'solid' || kind === 'gold')) { setTick(true); setTimeout(() => { if (alive.current) setTick(false); }, 900); }
  };
  const k = BTN[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      onPress={press}
      style={({ pressed, hovered }) => [
        st.btn, small && st.btnSmall, !full && { alignSelf: 'flex-start' }, k.box,
        hovered && Platform.OS === 'web' && k.hover,
        pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
        off && { opacity: 0.55 },
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={k.text} /> : tick ? <Pop><Text style={[st.btnText, { color: k.text }]}>✓</Text></Pop> : (
        <Text style={[st.btnText, font, small && { fontSize: 13 }, { color: k.text }]}>{icon ? `${icon}  ` : ''}{title}</Text>
      )}
    </Pressable>
  );
}
export function Btn(p) { return p.pulse ? <Breathe to={1.035}><BtnBase {...p} /></Breathe> : <BtnBase {...p} />; }
const BTN = themed(() => ({
  solid: { box: { backgroundColor: C.brandFill, ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg,#4F46E5,#7C6CF7)', boxShadow: '0 8px 20px rgba(79,70,229,.32)', transition: 'filter .2s' }, default: {} }) }, hover: { filter: 'brightness(1.1)' }, text: C.white },
  gold: { box: { backgroundColor: C.gold }, hover: { backgroundColor: '#966214' }, text: C.white },
  ghost: { box: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong }, hover: { backgroundColor: C.brandSoft }, text: C.brand },
  warn: { box: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.redLine }, hover: { backgroundColor: C.redSoft }, text: C.red },
}));

/* ---------- Form fields ---------- */
export function Field({ label, hint, error, multiline, style, ...p }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      {label ? <Text style={[T.label, font, { marginBottom: 6 }]}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={C.placeholder}
        multiline={multiline}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[
          st.input, font,
          multiline && { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
          focus && st.inputFocus,
          error && { borderColor: C.red },
          Platform.OS === 'web' && { outlineStyle: 'none' },
          style,
        ]}
        {...p}
      />
      {error ? <Text style={[T.small, font, { color: C.red, marginTop: 4 }]}>{error}</Text> : hint ? <Text style={[T.small, font, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

/* ---------- Badges ---------- */
const TONES = themed(() => ({
  gold: [C.goldSoft, C.goldText], green: [C.greenSoft, C.greenText], red: [C.redSoft, C.redText],
  blue: [C.blueSoft, C.blueText], grey: [C.greySoft, C.inkSoft], brand: [C.brandSoft, C.brandDark],
}));

export const Chip = ({ text, tone = 'grey' }) => {
  const [bg, fg] = TONES[tone] || TONES.grey;
  return (
    <View style={[st.chip, { backgroundColor: bg }]}>
      <Text style={[st.chipText, font, { color: fg }]}>{text}</Text>
    </View>
  );
};

/* A status chip that always uses the same colour and wording for the same status. */
export const StatusChip = ({ status, label }) => {
  const [text, tone] = STATUS[status] || [status, 'grey'];
  return <Chip tone={tone} text={label || text} />;
};

export const Avatar = ({ name, size = 44, tone = 'brand' }) => {
  const [bg, fg] = TONES[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[font, { color: fg, fontWeight: '800', fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
};

/* ---------- States ---------- */
export const Empty = ({ title, text, icon = '○', action }) => (
  <View style={st.empty}>
    <View style={st.emptyIcon}><Text style={{ fontSize: 22, color: C.brand }}>{icon}</Text></View>
    <Title style={{ textAlign: 'center' }}>{title}</Title>
    {text ? <Body style={{ textAlign: 'center', marginTop: 4, maxWidth: 380 }}>{text}</Body> : null}
    {action ? <View style={{ marginTop: 14, alignSelf: 'stretch', maxWidth: 260, width: '100%' }}>{action}</View> : null}
  </View>
);

function Pulse({ style }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const a = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }));
    a.start();
    return () => a.stop();
  }, [x]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ backgroundColor: C.line, borderRadius: 6, overflow: 'hidden' }, style]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: '55%', backgroundColor: 'rgba(255,255,255,.28)' },
        Platform.OS === 'web' && { backgroundImage: 'linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)', backgroundColor: 'transparent' },
        { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w] }) }] }]} />
    </View>
  );
}

/* Skeleton cards instead of a lonely spinner: the page feels faster and doesn't jump. */
export const Loading = ({ rows = 3 }) => (
  <View accessibilityLabel="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={[st.card, shadow(1)]}>
        <Pulse style={{ height: 16, width: '55%' }} />
        <Pulse style={{ height: 12, width: '85%', marginTop: 12 }} />
        <Pulse style={{ height: 12, width: '40%', marginTop: 8 }} />
      </View>
    ))}
  </View>
);

/* ---------- Navigation ---------- */
const spring = (val, to) => (reduceMotion
  ? Animated.timing(val, { toValue: to, duration: 0, useNativeDriver: false })
  : Animated.spring(val, { toValue: to, friction: 9, tension: 120, useNativeDriver: false }));

export function Tabs({ items, tab, setTab, badges = {} }) {
  const [lay, setLay] = useState({});
  const [ready, setReady] = useState(false);
  const placed = useRef(false);
  const box = useRef({ x: new Animated.Value(0), y: new Animated.Value(0), w: new Animated.Value(0), h: new Animated.Value(0) }).current;
  const cur = lay[tab];
  useEffect(() => {
    if (!cur) return;
    if (!placed.current) {
      box.x.setValue(cur.x); box.y.setValue(cur.y); box.w.setValue(cur.width); box.h.setValue(cur.height);
      placed.current = true; setReady(true); return;
    }
    Animated.parallel([spring(box.x, cur.x), spring(box.y, cur.y), spring(box.w, cur.width), spring(box.h, cur.height)]).start();
  }, [tab, cur && cur.x, cur && cur.y, cur && cur.width, cur && cur.height]);
  const measure = (t) => (e) => {
    const l = e.nativeEvent.layout;
    setLay((p) => (p[t] && p[t].x === l.x && p[t].y === l.y && p[t].width === l.width && p[t].height === l.height ? p : { ...p, [t]: l }));
  };
  return (
    <View style={st.tabsWrap}>
      <View style={st.tabs}>
        <Animated.View pointerEvents="none" style={[st.tabInd, { opacity: ready ? 1 : 0, left: box.x, top: box.y, width: box.w, height: box.h }]} />
        {items.map((t) => {
          const on = tab === t;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t)} onLayout={measure(t)}
              style={({ hovered }) => [st.tab, !on && hovered && Platform.OS === 'web' && { backgroundColor: C.greySoft }]}>
              <Text style={[st.tabText, font, on && { color: C.white }]}>{t}</Text>
              {badges[t] > 0 && <Pop key={badges[t]}><View style={[st.dot, on && { backgroundColor: C.white }]}><Ping color={on ? C.white : C.red} /><Text style={[st.dotText, on && { color: C.brandFill }]}>{badges[t]}</Text></View></Pop>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const Seg = ({ items, value, onChange }) => (
  <View style={st.seg}>
    {items.map((i) => {
      const on = value === i.key;
      return (
        <Pressable key={i.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(i.key)} style={[st.segItem, on && st.segOn]}>
          <Text style={[st.segText, font, on && { color: C.ink }]}>{i.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

/* ---------- Numbers ---------- */
export const Stat = ({ label, value, tone, onPress }) => {
  const shown = useCount(value);
  const color = tone === 'alert' && value > 0 ? C.red : C.ink;
  const inner = (
    <>
      <Text style={[st.statValue, font, { color }]}>{shown}</Text>
      <Small style={{ marginTop: 2 }}>{label}</Small>
    </>
  );
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ hovered }) => [st.stat, shadow(1), hovered && Platform.OS === 'web' && st.cardHover]}>{inner}</Pressable>
    : <View style={[st.stat, shadow(1)]}>{inner}</View>;
};

/* ---------- Job progress (a real sequence, so numbering is meaningful) ---------- */
const FLOW = [
  ['open', 'Open'],
  ['assigned', 'Chosen'],
  ['funded', 'Working'],
  ['submitted', 'Review'],
  ['accepted', 'Accepted'],
  ['paid', 'Paid'],
];
function ProgSeg({ on, i }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: on ? 1 : 0, duration: 520, delay: 300 + i * 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [on]);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: C.brand, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}
export function Progress({ status }) {
  const norm = status === 'revision' ? 'funded' : status;
  const idx = FLOW.findIndex(([k]) => k === norm);
  if (idx < 0) return null;
  return (
    <View style={st.progress} accessibilityLabel={`Progress: ${FLOW[idx][1]}`}>
      {FLOW.map(([k, label], i) => (
        <View key={k} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ width: '100%' }}><ProgSeg on={i <= idx} i={i} /></View>
          <Text numberOfLines={1} style={[font, { fontSize: 10.5, marginTop: 5, color: i === idx ? C.brand : C.mute, fontWeight: i === idx ? '700' : '500' }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------- Toast ---------- */
export function Toast({ toast }) {
  const y = useRef(new Animated.Value(-20)).current;
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!toast) return;
    y.setValue(-20); o.setValue(0);
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [toast]);
  if (!toast) return null;
  const tone = { success: [C.greenSoft, C.green, '✓'], error: [C.redSoft, C.red, '!'], info: [C.blueSoft, C.blue, 'i'] }[toast.kind] || [];
  return (
    <Animated.View accessibilityLiveRegion="polite" pointerEvents="none" style={[st.toastWrap, { opacity: o, transform: [{ translateY: y }] }]}>
      <View style={[st.toast, shadow(2), { backgroundColor: C.surface, borderLeftColor: tone[1] }]}>
        <View style={[st.toastIcon, { backgroundColor: tone[0] }]}><Text style={{ color: tone[1], fontWeight: '800', fontSize: 13 }}>{tone[2]}</Text></View>
        <Text style={[font, { color: C.ink, fontSize: 14, flex: 1, lineHeight: 20 }]}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const st = sheet(() => ({
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  cardHover: Platform.select({ web: { borderColor: C.brand, transform: [{ translateY: -2 }], boxShadow: `0 14px 34px rgba(${C.shadowRgb},.16)`, transition: 'all .2s ease' }, default: {} }),
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginVertical: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionCount: { color: C.mute, fontWeight: '600', fontSize: 15 },

  btn: { minHeight: 46, borderRadius: R.md, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnSmall: { minHeight: 38, paddingHorizontal: 14, borderRadius: R.sm },
  btnText: { fontWeight: '700', fontSize: 15 },

  input: { minHeight: 48, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink, backgroundColor: C.field },
  inputFocus: { borderColor: C.brand, backgroundColor: C.surface },

  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  chipText: { fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },

  tabsWrap: { marginVertical: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, backgroundColor: C.surface, padding: 5, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  tab: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: R.sm },
  tabInd: { position: 'absolute', borderRadius: R.sm, backgroundColor: C.brandFill, ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg,#4F46E5,#7C6CF7)', boxShadow: '0 6px 16px rgba(79,70,229,.3)' }, default: {} }) },
  tabText: { color: C.inkSoft, fontWeight: '700', fontSize: 14 },
  dot: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dotText: { color: C.white, fontSize: 11, fontWeight: '800' },

  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  segItem: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface },
  segOn: { backgroundColor: C.brandSoft, borderColor: C.brand },
  segText: { color: C.inkSoft, fontWeight: '600', fontSize: 13 },

  stat: { flexGrow: 1, flexBasis: 140, backgroundColor: C.surface, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.line },
  statValue: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },

  progress: { flexDirection: 'row', gap: 4, marginTop: 14 },
  progressTrack: { width: '100%', height: 5 },
  progressSeg: { flex: 1, borderRadius: 3 },

  toastWrap: { position: 'absolute', top: Platform.OS === 'web' ? 70 : 100, left: 12, right: 12, alignItems: 'center', zIndex: 50 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 520, width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.md, borderLeftWidth: 4 },
  toastIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
}));

/* ---------- Theme picker (System / Light / Dark) ---------- */
const THEME_OPTIONS = [
  { key: 'system', icon: '◐', label: 'System' },
  { key: 'light', icon: '☀', label: 'Light' },
  { key: 'dark', icon: '☾', label: 'Dark' },
];
export const themeIcon = (pref) => (THEME_OPTIONS.find((o) => o.key === pref) || THEME_OPTIONS[0]).icon;

export function ThemePicker() {
  const { pref } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Colour theme">
      {THEME_OPTIONS.map((o) => {
        const on = pref === o.key;
        return (
          <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.label}
            onPress={() => setThemePref(o.key)}
            style={({ hovered }) => [pk.item, on && pk.itemOn, !on && hovered && Platform.OS === 'web' && { backgroundColor: C.greySoft }]}>
            <Text style={[pk.icon, { color: on ? C.brand : C.mute }]}>{o.icon}</Text>
            <Text style={[pk.label, font, { color: on ? C.brandDark : C.inkSoft, fontWeight: on ? '700' : '600' }]}>{o.label}</Text>
            {on ? <Text style={[pk.tick, { color: C.brand }]}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
const pk = sheet(() => ({
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, paddingHorizontal: 10, borderRadius: R.sm },
  itemOn: { backgroundColor: C.brandSoft },
  icon: { width: 22, textAlign: 'center', fontSize: 17 },
  label: { flex: 1, fontSize: 14 },
  tick: { fontSize: 14, fontWeight: '800' },
}));


/* ---------- Extra motion ---------- */

/* Springs a small thing (badge, icon) into view. Change its `key` to make it pop again. */
export function Pop({ children, style }) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (!reduceMotion) Animated.spring(v, { toValue: 1, friction: 4, tension: 170, useNativeDriver: NATIVE }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v }] }]}>{children}</Animated.View>
  );
}

/* Counts a number up from 0, e.g. <Text><CountUp value={1500} format={money} /></Text> */
export function CountUp({ value, format }) {
  const n = useCount(value);
  return <>{format ? format(n) : n}</>;
}

/* A bouncing tick with a soft ring, for "it worked" moments. */
export function CheckPop({ size = 44, tone = 'green' }) {
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const ring = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 150, useNativeDriver: NATIVE }),
      Animated.timing(ring, { toValue: 1, duration: 900, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }),
    ]).start();
  }, []);
  const col = C[tone] || tone;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: col, opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] }} />
      <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
        <Text style={{ color: C.white, fontSize: size * 0.5, fontWeight: '800', marginTop: -1 }}>✓</Text>
      </Animated.View>
    </View>
  );
}

/* One quiet burst of confetti inside a card. Plays once when it appears. */
export function Confetti({ count = 22 }) {
  const parts = useRef(Array.from({ length: count }, (_, i) => ({
    v: new Animated.Value(0),
    x: (Math.random() - 0.5) * 280,
    up: 30 + Math.random() * 50,
    fall: 150 + Math.random() * 90,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    w: 6 + Math.random() * 5,
    delay: i * 18,
    pick: i,
  }))).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const a = Animated.parallel(parts.map((p) => Animated.timing(p.v, { toValue: 1, duration: 1500, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE })));
    a.start();
    return () => a.stop();
  }, []);
  if (reduceMotion) return null;
  const colors = [C.brand, C.gold, C.green, C.red, C.blue];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', alignItems: 'center', borderRadius: R.lg }}>
      {parts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', top: 22, width: p.w, height: p.w * 1.6, borderRadius: 2, backgroundColor: colors[p.pick % colors.length],
          opacity: p.v.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
            { translateY: p.v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, -p.up, p.fall] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}


/* =====================================================================
   Interactive extras: used by the login / sign-up flow
   ===================================================================== */

/* A pressable that squishes slightly under the finger. `style` may be a function (hovered, pressed). */
export function Press({ onPress, children, style, label, scale = 0.97 }) {
  const sc = useRef(new Animated.Value(1)).current;
  const to = (x) => Animated.spring(sc, { toValue: reduceMotion ? 1 : x, useNativeDriver: NATIVE, speed: 40, bounciness: 7 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={() => to(scale)} onPressOut={() => to(1)} style={style}>{children}</Pressable>
    </Animated.View>
  );
}

/* Wiggles its children sideways whenever `trigger` changes to a new non-zero number (e.g. a failed submit). */
export function Shake({ trigger = 0, children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger || reduceMotion) return;
    v.setValue(0);
    Animated.sequence([1, -1, 0.7, -0.7, 0].map((x) => Animated.timing(v, { toValue: x, duration: 55, useNativeDriver: NATIVE }))).start();
  }, [trigger]);
  return <Animated.View style={[style, { transform: [{ translateX: v.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }] }]}>{children}</Animated.View>;
}

/* Text field whose label floats up when you focus or type. Has a Show/Hide toggle for passwords
   and a green tick via `ok`. Forwards its ref to the TextInput so screens can move focus. */
export const FloatField = forwardRef(function FloatField({ label, error, hint, ok, secure, value = '', onChangeText, onFocus, onBlur, placeholder, style, ...p }, ref) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const up = useRef(new Animated.Value(value ? 1 : 0)).current;
  const lifted = focus || !!value;
  useEffect(() => {
    Animated.timing(up, { toValue: lifted ? 1 : 0, duration: reduceMotion ? 0 : 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [lifted]);
  const tint = error ? C.red : focus ? C.brand : C.mute;
  return (
    <View style={{ marginTop: 12 }}>
      <View style={[ff.box, { borderColor: error ? C.red : focus ? C.brand : C.line, backgroundColor: focus ? C.surface : C.field },
        focus && Platform.select({ web: { boxShadow: `0 0 0 4px ${(error ? C.red : C.brand)}22` }, default: {} })]}>
        <Animated.Text pointerEvents="none" style={[font, { position: 'absolute', left: 14, fontWeight: '600', color: tint,
          top: up.interpolate({ inputRange: [0, 1], outputRange: [17, 7] }), fontSize: up.interpolate({ inputRange: [0, 1], outputRange: [15, 11.5] }) }]}>{label}</Animated.Text>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!!secure && !show}
          placeholder={focus ? placeholder : undefined}
          placeholderTextColor={C.placeholder}
          onFocus={(e) => { setFocus(true); onFocus && onFocus(e); }}
          onBlur={(e) => { setFocus(false); onBlur && onBlur(e); }}
          style={[ff.input, font, (secure || ok) && { paddingRight: 64 }, Platform.OS === 'web' && { outlineStyle: 'none' }, style]}
          {...p}
        />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow((x) => !x)} hitSlop={8} style={ff.side}>
            <Text style={[font, { color: C.brand, fontWeight: '700', fontSize: 13 }]}>{show ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : ok ? (
          <View pointerEvents="none" style={ff.side}><Pop><Text style={{ color: C.green, fontWeight: '800', fontSize: 16 }}>✓</Text></Pop></View>
        ) : null}
      </View>
      {error ? (
        <FadeIn dist={6} dur={200}><Text style={[T.small, font, { color: C.red, marginTop: 4 }]}>{error}</Text></FadeIn>
      ) : hint ? <Text style={[T.small, font, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
});
const ff = sheet(() => ({
  box: { minHeight: 56, borderWidth: 1.5, borderRadius: R.md, justifyContent: 'center', ...Platform.select({ web: { transition: 'border-color .18s, box-shadow .18s, background-color .18s' }, default: {} }) },
  input: { minHeight: 54, paddingHorizontal: 14, paddingTop: 22, paddingBottom: 6, fontSize: 15, color: C.ink },
  side: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
}));

/* Password strength bar: 0 (empty) to 4 */
export const pwScore = (p = '') => {
  if (!p) return 0;
  let n = 0;
  if (p.length >= 8) n++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) n++;
  return Math.max(1, n);
};
export function PasswordMeter({ value }) {
  const n = pwScore(value);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: n / 4, duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [n]);
  const col = [C.line, C.red, C.gold, C.blue, C.green][n];
  const word = ['', 'Weak', 'Fair', 'Good', 'Strong'][n];
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}>
        <Animated.View style={{ height: 5, borderRadius: 3, backgroundColor: col, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      <Text style={[T.small, font, { marginTop: 4, color: n ? col : C.mute }]}>{n ? `Password strength: ${word}` : 'Use 8+ characters with letters and numbers'}</Text>
    </View>
  );
}

/* Multi-step progress: circles joined by lines that fill as you move forward. */
function StepLine({ on, hidden }) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: on ? 1 : 0, duration: reduceMotion ? 0 : 320, useNativeDriver: false }).start();
  }, [on]);
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: hidden ? 'transparent' : C.line, overflow: 'hidden' }}>
      {!hidden && <Animated.View style={{ height: 3, backgroundColor: C.brand, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />}
    </View>
  );
}
export function Stepper({ steps, index }) {
  return (
    <View accessibilityLabel={`Step ${index + 1} of ${steps.length}`} style={{ flexDirection: 'row', marginTop: 2, marginBottom: 4 }}>
      {steps.map((t, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <View key={t} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <StepLine hidden={i === 0} on={i <= index} />
              <Pop key={done ? 'd' : now ? 'n' : 'f'}>
                <View style={{ width: 26, height: 26, borderRadius: 13, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? C.brandFill : now ? C.surface : C.line, borderWidth: now ? 2 : 0, borderColor: C.brand }}>
                  <Text style={[font, { fontSize: 12, fontWeight: '800', color: done ? C.white : now ? C.brand : C.mute }]}>{done ? '✓' : i + 1}</Text>
                </View>
              </Pop>
              <StepLine hidden={i === steps.length - 1} on={i < index} />
            </View>
            <Text numberOfLines={1} style={[font, { fontSize: 11, marginTop: 5, fontWeight: now ? '700' : '500', color: now ? C.brand : C.mute }]}>{t}</Text>
          </View>
        );
      })}
    </View>
  );
}


/* =====================================================================
   Motion pack: small looping details that make the app feel alive
   ===================================================================== */
const loop = (v, dur, rest = 0) => Animated.loop(Animated.sequence([
  Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
  ...(rest ? [Animated.delay(rest)] : []),
  Animated.timing(v, { toValue: 0, duration: rest ? 0 : dur, useNativeDriver: NATIVE }),
]));

/* Gentle "breathing" scale for logos and primary calls to action. */
export function Breathe({ on = true, to = 1.05, dur = 1700, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on || reduceMotion) return undefined;
    const a = loop(v, dur);
    a.start();
    return () => a.stop();
  }, [on]);
  if (!on) return children;
  return <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, to] }) }] }}>{children}</Animated.View>;
}

/* Expanding ring behind a notification badge. */
function Ping({ color }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }));
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 99, backgroundColor: color,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }] }} />;
}

/* A soft ring that pulses outwards from an avatar. */
export function Glow({ size = 72, color, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color || C.brand,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }} />
      {children}
    </View>
  );
}

/* Waving hand for greetings. */
export function Wave() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return undefined;
    const a = loop(v, 1000, 1400);
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.Text style={{ fontSize: 17, transform: [{ rotate: v.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '16deg', '-8deg', '14deg', '-4deg', '0deg'] }) }] }}>👋</Animated.Text>;
}


/* Save/bookmark heart: springs up and bursts into little dots when switched on. */
export function Heart({ on, onChange }) {
  const sc = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const press = () => {
    const n = !on;
    onChange(n);
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(sc, { toValue: 1.5, duration: 110, useNativeDriver: NATIVE }),
      Animated.spring(sc, { toValue: 1, friction: 4, useNativeDriver: NATIVE }),
    ]).start();
    if (n) { burst.setValue(0); Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start(); }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={on ? 'Remove from saved' : 'Save job'} onPress={press} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 7 }).map((_, i) => {
        const g = (i / 7) * Math.PI * 2;
        return (
          <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: C.red,
            opacity: burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(g) * 20] }) }, { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(g) * 20] }) }, { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }] }} />
        );
      })}
      <Animated.Text style={{ fontSize: 20, color: on ? C.red : C.mute, transform: [{ scale: sc }] }}>{on ? '♥' : '♡'}</Animated.Text>
    </Pressable>
  );
}