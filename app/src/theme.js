import { Platform, Appearance, StyleSheet } from 'react-native';
import { useSyncExternalStore } from 'react';
import { store } from './api';

/* ---------- Palettes ----------
   Same token names in both, so screens never care which mode is active. */
const LIGHT = {
  bg: '#F5F6FD',
  surface: '#FFFFFF',
  ink: '#141A33',
  inkSoft: '#3F4766',
  mute: '#6A7191',
  line: '#E4E6F4',
  lineStrong: '#CDD1E8',
  field: '#FAFAFE',
  placeholder: '#93A2A8',

  brand: '#4F46E5',       // accent for text, borders, links
  brandFill: '#4F46E5',   // filled backgrounds that carry white text
  brandDark: '#1E1B6B',   // text on brandSoft
  brandSoft: '#E9E8FF',
  brandHover: '#D9D7FF',
  deep: '#1E1B6B',        // hero panels: dark in both modes

  gold: '#C98A12', goldSoft: '#FCF1D6', goldText: '#7A4F0C',
  green: '#1B7A4B', greenSoft: '#DDF2E6', greenText: '#115A36',
  red: '#B3261E', redSoft: '#FBE4E2', redText: '#8C1D17', redLine: '#E6B7B3',
  blue: '#2B5FA8', blueSoft: '#E1ECF9', blueText: '#1D4579',
  grey: '#52646C', greySoft: '#EAEFED',
  white: '#FFFFFF',

  glass: 'rgba(255,255,255,.82)',
  shadowRgb: '30,27,107',
  page1: '#E2E0FF',
  page2: '#FFE8DF',
};

const DARK = {
  bg: '#0D0F1F',
  surface: '#171A2F',
  ink: '#EEF0FB',
  inkSoft: '#C5C9E3',
  mute: '#8D94B9',
  line: '#272B4A',
  lineStrong: '#383D63',
  field: '#101328',
  placeholder: '#6C7399',

  brand: '#9B94FF',
  brandFill: '#4F46E5',
  brandDark: '#D3D0FF',
  brandSoft: '#262858',
  brandHover: '#33357A',
  deep: '#1E1B6B',

  gold: '#E3AC42', goldSoft: '#3A2E13', goldText: '#F2C877',
  green: '#4CC38A', greenSoft: '#123729', greenText: '#86E3B2',
  red: '#FF7B72', redSoft: '#40191A', redText: '#FFAAA3', redLine: '#6E3532',
  blue: '#71A5EA', blueSoft: '#172D49', blueText: '#A2C7F6',
  grey: '#9DADB5', greySoft: '#23273D',
  white: '#FFFFFF',

  glass: 'rgba(23,26,47,.82)',
  shadowRgb: '0,0,0',
  page1: '#1A1A4A',
  page2: '#2A1A28',
};

/* C is one shared object. Switching theme overwrites its values in place. */
export const C = { ...LIGHT };

/* ---------- Theme state: 'system' | 'light' | 'dark' ---------- */
const KEY = 'sip_theme';
const listeners = new Set();
let pref = 'system';
let scheme = 'light';
let version = 0;

const systemScheme = () => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

const apply = () => {
  scheme = pref === 'system' ? systemScheme() : pref;
  Object.assign(C, scheme === 'dark' ? DARK : LIGHT);
  version += 1;
  listeners.forEach((fn) => fn());
};

try {
  const saved = store && store.getItem(KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') pref = saved;
} catch (e) { /* storage blocked: stay on system */ }
scheme = pref === 'system' ? systemScheme() : pref;
Object.assign(C, scheme === 'dark' ? DARK : LIGHT);

Appearance.addChangeListener(() => { if (pref === 'system') apply(); });

export const setThemePref = (p) => {
  pref = p;
  try { store && store.setItem(KEY, p); } catch (e) { /* ignore */ }
  apply();
};

/* Call once near the top of the app: re-renders it whenever the theme changes. */
export function useTheme() {
  useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => version);
  return { pref, scheme, dark: scheme === 'dark', setPref: setThemePref };
}

/* Styles that depend on colours are built lazily and rebuilt after a theme change.
   Use `themed(() => ({...}))` for plain objects and `sheet(() => ({...}))` for StyleSheets. */
export function themed(make) {
  let cache = null;
  let at = -1;
  return new Proxy({}, {
    get: (_, key) => {
      if (at !== version) { cache = make(); at = version; }
      return cache[key];
    },
  });
}
export const sheet = (make) => themed(() => StyleSheet.create(make()));

export const R = { sm: 8, md: 14, lg: 20, pill: 999 };
export const SP = { xs: 4, sm: 8, md: 14, lg: 20, xl: 24, xxl: 32 };

export const FONT = Platform.select({
  web: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', 'Noto Sans Bengali', system-ui, -apple-system, Roboto, sans-serif",
  default: undefined,
});

export const T = themed(() => ({
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.1 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: C.ink },
  body: { fontSize: 15, lineHeight: 22, color: C.inkSoft },
  small: { fontSize: 13, lineHeight: 18, color: C.mute },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: C.ink },
}));

export const shadow = (level = 1) => {
  const dark = scheme === 'dark';
  return Platform.select({
    web: { boxShadow: level === 1
      ? `0 1px 2px rgba(${C.shadowRgb},${dark ? 0.4 : 0.05}), 0 8px 24px rgba(${C.shadowRgb},${dark ? 0.35 : 0.06})`
      : `0 14px 40px rgba(${C.shadowRgb},${dark ? 0.6 : 0.18})` },
    default: { shadowColor: dark ? '#000000' : '#141A33', shadowOpacity: level === 1 ? (dark ? 0.35 : 0.07) : (dark ? 0.5 : 0.16), shadowRadius: level === 1 ? 6 : 14, shadowOffset: { width: 0, height: level === 1 ? 2 : 6 }, elevation: level === 1 ? 2 : 8 },
  });
};

/* Status → label + colour, so every status looks the same everywhere. */
export const STATUS = {
  pending: ['Waiting for approval', 'gold'],
  open: ['Open', 'green'],
  assigned: ['Student chosen', 'blue'],
  funded: ['In progress', 'blue'],
  revision: ['Revision needed', 'gold'],
  submitted: ['Under review', 'blue'],
  accepted: ['Accepted', 'green'],
  paid: ['Paid', 'green'],
  rejected: ['Rejected', 'red'],
  suspended: ['Suspended', 'red'],
  active: ['Approved', 'green'],
  applied: ['Applied', 'grey'],
};
