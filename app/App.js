import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Platform, BackHandler, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { C, R, FONT, sheet, useTheme, shadow } from './src/theme';
import { api, setToken, store, bindToast } from './src/api';
import { Avatar, Toast, Loading, Small, FadeIn, Float, Breathe, Btn, Chip, ThemePicker, themeIcon } from './src/components/ui';
import { Welcome, Auth, HOME_T0 } from './src/screens/Auth';
import { Chat } from './src/screens/Chat';
import { TaskDetail } from './src/screens/TaskDetail';
import { Student } from './src/screens/Student';
import { Company, PostJob } from './src/screens/Company';
import { Admin } from './src/screens/Admin';

const font = FONT ? { fontFamily: FONT } : null;
const ROLE_LABEL = { student: 'Student', company: 'Company', admin: 'Admin' };

/* Page title shown under the header, so people always know where they are. */
const screenTitle = (user, role, top) => {
  if (top && top.name === 'task') return 'Job details';
  if (top && top.name === 'post') return 'New job';
  if (top && top.name === 'chat') return 'Chat';
  if (!user) return role ? 'Account' : null;
  return { student: 'Find work', company: 'Your jobs', admin: 'Admin console' }[user.role];
};

/* The footer fades up last on the home screen; on other screens it just shows. */
const FootFade = ({ on, children }) => (on ? <FadeIn delay={HOME_T0 + 1100} dist={10} dur={400}>{children}</FadeIn> : children);

export default function App() {
  const { pref, dark } = useTheme(); // re-renders the whole app when the theme changes
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [stack, setStack] = useState([]); // screens opened on top of the dashboard
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);
  const { width } = useWindowDimensions();
  const wide = width >= 560;
  const [menu, setMenu] = useState(false);
  const [themeMenu, setThemeMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prog = useRef(new Animated.Value(0)).current;
  const [far, setFar] = useState(false);
  const [dir, setDir] = useState('bottom'); // which way the next screen slides in
  const [hh, setHh] = useState(64);
  const timer = useRef(null);
  const scroller = useRef(null);

  useEffect(() => {
    bindToast((message, kind) => {
      clearTimeout(timer.current);
      setToast({ message, kind, id: Date.now() });
      timer.current = setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3500);
    });
    return () => clearTimeout(timer.current);
  }, []);

  /* Web only: load a clean typeface and set the page title. */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'Student Income Platform';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  /* Web only: page background, browser theme colour and native widgets follow the chosen theme. */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = dark ? C.surface : C.brandDark;
    let style = document.getElementById('sip-theme');
    if (!style) { style = document.createElement('style'); style.id = 'sip-theme'; document.head.appendChild(style); }
    style.textContent = `:root{color-scheme:${dark ? 'dark' : 'light'}} body{background:radial-gradient(900px 480px at 100% -5%,${C.page1},transparent 60%),radial-gradient(700px 420px at -10% 35%,${C.page2},transparent 60%),${C.bg};background-attachment:fixed} *{-webkit-tap-highlight-color:transparent} [role=button]:focus-visible,[role=tab]:focus-visible,[role=radio]:focus-visible{outline:3px solid ${C.brand}88;outline-offset:2px}`;
  }, [dark]);

  const push = (screen) => { setDir('right'); setStack((st) => [...st, screen]); scroller.current && scroller.current.scrollTo({ y: 0, animated: false }); };
  const pop = () => { setDir('left'); setStack((st) => st.slice(0, -1)); };
  const openChat = (id) => push({ name: 'chat', id });
  const canBack = user ? stack.length > 0 : !!role;
  const back = () => { if (user) pop(); else { setDir('left'); setRole(null); } };

  useEffect(() => {
    const saved = store && store.getItem('sip_token');
    if (!saved) { setReady(true); return; }
    setToken(saved);
    api('/me').then(setUser).catch(() => { setToken(null); store.removeItem('sip_token'); }).finally(() => setReady(true));
  }, []);

  // keep the account fresh (so "waiting for approval" changes by itself)
  useEffect(() => {
    if (!user) return undefined;
    const id = setInterval(() => { api('/me').then(setUser).catch(() => {}); }, 8000);
    return () => clearInterval(id);
  }, [user && user._id]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (canBack) { back(); return true; } return false; });
    return () => sub.remove();
  }, [canBack, user]);

  useEffect(() => { scroller.current && scroller.current.scrollTo({ y: 0, animated: false }); }, [user && user._id, role]);

  const logout = () => { setDir('bottom'); setMenu(false); setToken(null); if (store) store.removeItem('sip_token'); setUser(null); setRole(null); setStack([]); };
  const top = stack[stack.length - 1];
  const title = screenTitle(user, role, top);

  return (
    <View style={s.screen}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      {/* slow drifting colour blobs behind everything: quiet movement that makes the app feel alive */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Float dy={36} dur={7000} style={{ position: 'absolute', left: -90, top: 120, width: 300, height: 300, borderRadius: 150, backgroundColor: dark ? 'rgba(124,108,247,.14)' : 'rgba(124,108,247,.12)' }} />
        <Float dy={-30} dur={8200} style={{ position: 'absolute', right: -80, top: 380, width: 260, height: 260, borderRadius: 130, backgroundColor: dark ? 'rgba(255,138,92,.10)' : 'rgba(255,138,92,.13)' }} />
      </View>

      <View style={[s.header, scrolled && s.headerShadow]} onLayout={(e) => setHh(e.nativeEvent.layout.height)}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 3, overflow: 'hidden' }}>
          <Animated.View style={[{ height: 3, width: '100%', backgroundColor: C.brand, transform: [{ translateX: prog.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] }, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(90deg,#FF8A5C,#4F46E5)' }]} />
        </View>
        <View style={s.headerInner}>
          <View style={s.headerLeft}>
            {canBack ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} style={({ hovered }) => [s.iconBtn, hovered && Platform.OS === 'web' && { backgroundColor: C.brandHover }]}>
                <Text style={s.backArrow}>‹</Text>
              </Pressable>
            ) : (
              <Breathe to={1.07} dur={1800}><View style={s.logo}><Text style={s.logoText}>S</Text></View></Breathe>
            )}
            <View style={{ flexShrink: 1 }}>
              <Text numberOfLines={1} style={[s.brand, font]}>{title || 'Student Income'}</Text>
              <Text numberOfLines={1} style={[s.brandSub, font]}>{title ? 'Student Income Platform' : 'Earn while you study'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Colour theme: ${pref}`} onPress={() => { setMenu(false); setThemeMenu((m) => !m); }}
            style={({ hovered }) => [s.themeBtn, (themeMenu || (hovered && Platform.OS === 'web')) && { backgroundColor: C.brandSoft }]}>
            <Text style={s.themeIcon}>{themeIcon(pref)}</Text>
          </Pressable>
          {user && (
            <Pressable accessibilityRole="button" accessibilityLabel="Account menu" onPress={() => { setThemeMenu(false); setMenu((m) => !m); }}
              style={({ hovered }) => [s.userBox, (menu || (hovered && Platform.OS === 'web')) && { backgroundColor: C.brandSoft }]}>
              <Avatar name={user.role === 'company' ? user.companyName : user.name} size={34} tone="brand" />
              {wide && (
                <View style={{ marginLeft: 8 }}>
                  <Text numberOfLines={1} style={[s.userName, font]}>{user.role === 'company' ? user.companyName : user.name}</Text>
                  <Text style={[s.userRole, font]}>{ROLE_LABEL[user.role]}</Text>
                </View>
              )}
              <Text style={s.chev}>{menu ? '▴' : '▾'}</Text>
            </Pressable>
          )}
          </View>
        </View>
      </View>

      {themeMenu && (
        <>
          <Pressable accessibilityLabel="Close theme menu" onPress={() => setThemeMenu(false)} style={[StyleSheet.absoluteFill, { zIndex: 55 }]} />
          <FadeIn from="top" dist={10} dur={220} style={[s.menu, { width: 200, padding: 8, top: hh + 6, right: Math.max(14, (width - 760) / 2 + 14) }]}>
            <Small style={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 6, fontWeight: '700', color: C.mute }}>Appearance</Small>
            <ThemePicker />
          </FadeIn>
        </>
      )}

      {menu && user && (
        <>
          <Pressable accessibilityLabel="Close menu" onPress={() => setMenu(false)} style={[StyleSheet.absoluteFill, { zIndex: 55 }]} />
          <FadeIn from="top" dist={10} dur={220} style={[s.menu, { top: hh + 6, right: Math.max(14, (width - 760) / 2 + 14) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={user.role === 'company' ? user.companyName : user.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[s.userName, font, { maxWidth: 200 }]}>{user.role === 'company' ? user.companyName : user.name}</Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 3 }}><Chip tone="brand" text={ROLE_LABEL[user.role]} /></View>
              </View>
            </View>
            <Btn kind="warn" small title="Log out" onPress={logout} />
          </FadeIn>
        </>
      )}

      <TopFab show={far} onPress={() => scroller.current && scroller.current.scrollTo({ y: 0, animated: true })} />
      <Toast toast={toast} />

      <ScrollView ref={scroller} onScroll={(e) => { const n = e.nativeEvent; const y = n.contentOffset.y; setScrolled(y > 4); setFar(y > 320); prog.setValue(Math.min(1, y / Math.max(1, n.contentSize.height - n.layoutMeasurement.height))); }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        <FadeIn style={s.col} from={dir} dist={dir === 'bottom' ? 22 : 14} dur={dir === 'bottom' ? 560 : 400} key={`${user ? user.role : role || 'out'}-${top ? top.name + (top.id || '') : 'root'}`}>
          {!ready && <Loading />}
          {ready && !user && !role && <Welcome onPick={(r) => { setDir('right'); setRole(r); }} />}
          {ready && !user && role && <Auth key={role} role={role} onAuth={(u) => { setDir('bottom'); setUser(u); }} />}
          {user && top && top.name === 'task' && <TaskDetail key={top.id} id={top.id} user={user} chat={openChat} />}
          {user && top && top.name === 'chat' && <Chat key={top.id} id={top.id} user={user} />}
          {user && top && top.name === 'post' && <PostJob user={user} done={pop} />}
          {user && !top && user.role === 'student' && <Student user={user} open={(id) => push({ name: 'task', id })} chat={openChat} />}
          {user && !top && user.role === 'company' && <Company user={user} open={(id) => push({ name: 'task', id })} post={() => push({ name: 'post' })} chat={openChat} />}
          {user && !top && user.role === 'admin' && <Admin chat={openChat} />}

          {ready && (
            <FootFade on={!user && !role}>
            <Small style={{ textAlign: 'center', marginTop: 28 }}>
              Student Income Platform · Payments are handled by our team
              {!user && !role ? (
                <>
                  <Text>{'\u00A0\u00A0\u00A0\u00A0'}</Text>
                  <Text accessibilityRole="link" onPress={() => { setDir('right'); setRole('admin'); }} style={{ color: C.brand, fontWeight: '700', textDecorationLine: 'underline' }}>Admin login</Text>
                </>
              ) : null}
            </Small>
            </FootFade>
          )}
        </FadeIn>
      </ScrollView>
    </View>
  );
}

/* Round "back to top" button that springs in once you've scrolled a screen or so. */
function TopFab({ show, onPress }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: show ? 1 : 0, useNativeDriver: Platform.OS !== 'web', friction: 6, tension: 140 }).start();
  }, [show]);
  return (
    <Animated.View pointerEvents={show ? 'auto' : 'none'} style={{ position: 'absolute', right: 16, bottom: 24, zIndex: 45, opacity: v, transform: [{ scale: v }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to top" onPress={onPress}
        style={({ hovered }) => [{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.brandFill, alignItems: 'center', justifyContent: 'center' }, shadow(2), hovered && Platform.OS === 'web' && { transform: [{ translateY: -2 }] }]}>
        <Text style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>↑</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = sheet(() => ({
  screen: { flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : C.bg },
  header: { zIndex: 40, backgroundColor: C.surface, paddingTop: Platform.OS === 'web' ? 0 : 44, borderBottomWidth: 1, borderBottomColor: C.line, ...Platform.select({ web: { backgroundColor: C.glass, backdropFilter: 'blur(14px)', transition: 'box-shadow .25s' }, default: {} }) },
  headerShadow: Platform.select({ web: { boxShadow: `0 8px 24px rgba(${C.shadowRgb},.12)` }, default: { elevation: 6 } }),
  headerInner: { width: '100%', maxWidth: 760, alignSelf: 'center', minHeight: 64, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  logo: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FF8A5C', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg,#FF8A5C,#4F46E5)' }, default: {} }) },
  logoText: { color: C.white, fontWeight: '900', fontSize: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: C.brand, fontSize: 28, lineHeight: 30, marginTop: -2, fontWeight: '700' },
  brand: { color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  brandSub: { color: C.mute, fontSize: 12, fontWeight: '600', marginTop: 1 },
  themeBtn: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  themeIcon: { color: C.brand, fontSize: 18, lineHeight: 22 },
  userBox: { flexDirection: 'row', alignItems: 'center', padding: 4, paddingRight: 10, borderRadius: 99, borderWidth: 1, borderColor: C.line },
  userName: { color: C.ink, fontSize: 13, fontWeight: '700', maxWidth: 140 },
  userRole: { color: C.mute, fontSize: 11, fontWeight: '600' },
  chev: { color: C.mute, fontSize: 11, marginLeft: 8 },
  menu: { position: 'absolute', zIndex: 60, width: 270, backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line, ...Platform.select({ web: { boxShadow: `0 18px 44px rgba(${C.shadowRgb},.28)` }, default: { elevation: 12 } }) },
  scroll: { alignItems: 'center', padding: 14, paddingTop: 16, paddingBottom: 48 },
  col: { width: '100%', maxWidth: 720 },
}));