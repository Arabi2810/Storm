import { Platform } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';

/* If you test on a real phone, put your laptop's Wi-Fi IP here, e.g. '192.168.0.105' */
const LAN_IP = '';
const HOST = LAN_IP || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

/* After you deploy the backend (for example on Render), paste its link here, with no slash at the end:
   'https://student-income-api.onrender.com'. Leave it empty while testing on your own computer. */
const PROD_API = 'https://storm-tebd.onrender.com';
const onLocalWeb = Platform.OS === 'web' && typeof location !== 'undefined' && /^(localhost|127\.)/.test(location.hostname);
export const API = PROD_API && !onLocalWeb ? `${PROD_API}/api` : `http://${HOST}:5000/api`;

let TOKEN = null;
export const setToken = (t) => { TOKEN = t; };

export const store = Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage : null;

/* The app registers a toast function here; everything else just calls notify(). */
let toast = () => {};
export const bindToast = (fn) => { toast = fn; };
export const notify = (message, kind = 'info') => toast(message, kind);

export async function api(path, method = 'GET', body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const friendly = (m) => (m === 'Network request failed' || m === 'Failed to fetch' ? 'Cannot reach the server. Check that the backend is running.' : m);

/* Runs an action, shows a success toast or a readable error. Returns true on success. */
export const run = async (fn, ok) => {
  try { await fn(); if (ok) notify(ok, 'success'); return true; }
  catch (e) { notify(friendly(e.message), 'error'); return false; }
};

export function useLoad(path, fallback = []) {
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    api(path).then(setData).catch((e) => { notify(friendly(e.message), 'error'); setData(fallback); });
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
}

/* Like useLoad, but refreshes itself every few seconds (used for chat and the inbox). */
export function usePoll(path, ms = 5000) {
  const [data, setData] = useState(null);
  const warned = useRef(false);
  const load = useCallback(() => {
    return api(path).then((d) => { warned.current = false; setData(d); }).catch((e) => {
      if (!warned.current) { warned.current = true; notify(friendly(e.message), 'error'); }
    });
  }, [path]);
  useEffect(() => {
    load();
    const id = setInterval(load, ms);
    return () => clearInterval(id);
  }, [load, ms]);
  return [data, load];
}

export const METHODS = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', bank: 'Bank' };
export const methodLabel = (m) => METHODS[m] || m || '';
export const timeOf = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export const money = (n) => `৳${Number(n || 0).toLocaleString('en-US')}`;
export const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
export const norm = (x) => String(x || '').trim().toLowerCase().replace(/\s+/g, ' ');
export const initials = (name) => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const daysLeft = (d) => Math.ceil((new Date(d) - Date.now()) / 86400000);
