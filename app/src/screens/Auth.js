import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { C, R, T, shadow, FONT } from '../theme';
import { H1, H2, Title, Body, Small, Card, Btn, Row, Divider, FadeIn, Float, Tabs, Press, Shake, FloatField, PasswordMeter, Stepper, CheckPop } from '../components/ui';
import { api, run, setToken, store } from '../api';

const font = FONT ? { fontFamily: FONT } : null;

const ROLES = [
  { id: 'student', icon: '🎓', title: 'I’m a student', text: 'List your skills, pass a short test, apply to real jobs and get paid.', tone: 'brand' },
  { id: 'company', icon: '🏢', title: 'I’m a company', text: 'Post jobs, review comments from verified students and hire who you like.', tone: 'blue' },
  { id: 'admin', icon: '🛡️', title: 'I’m an admin', text: 'Approve companies, score tests, publish jobs and record payments.', tone: 'gold' },
];

/* Web only: the hero lines type in with animation-timing-function: steps(10, end).
   It is plain CSS (injected once) so the browser runs it directly; the text is matched by id. */
const heroLine = { color: C.white, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, alignSelf: 'flex-start' };
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('sip-steps-css')) {
  const st = document.createElement('style');
  st.id = 'sip-steps-css';
  /* One loop (8s): type in (1.2s) -> read it (5s) -> type out (1.2s) -> short pause -> again. */
  st.textContent = `
    @keyframes sipLoop {
      0%    { clip-path: inset(0 100% 0 0); }
      15%   { clip-path: inset(0 0% 0 0); }
      77.5% { clip-path: inset(0 0% 0 0); }
      92.5% { clip-path: inset(0 100% 0 0); }
      100%  { clip-path: inset(0 100% 0 0); }
    }
    #sip-hero-1, #sip-hero-2 { clip-path: inset(0 100% 0 0); animation: sipLoop 8s steps(10, end) infinite both; }
    #sip-hero-2 { animation-delay: .6s; }
    @media (prefers-reduced-motion: reduce) { #sip-hero-1, #sip-hero-2 { animation: none; clip-path: none; } }`;
  document.head.appendChild(st);
}

/* On web the hero lines type in first (about 2.5s); everything else then fades up one after another. */
export const HOME_T0 = Platform.OS === 'web' ? 2500 : 300;
const SOFT = { dist: 10, dur: 400 };

const HOW = [
  ['Verify', 'Pass a short skill test'],
  ['Apply', 'Comment on jobs you can do'],
  ['Earn', 'Get paid after the work is accepted'],
];

export function Welcome({ onPick }) {
  return (
    <>
      <FadeIn>
        <View style={[{ borderRadius: 28, padding: 26, overflow: 'hidden', backgroundColor: C.deep }, Platform.OS === 'web' && { backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(255,107,74,.5), transparent 45%), linear-gradient(135deg,#1E1B6B,#4F46E5)' }, shadow(2)]}>
          <Float style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,.08)' }} />
          <Float dy={-14} dur={5200} style={{ position: 'absolute', right: 50, bottom: -45, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,138,92,.3)' }} />
          <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.14)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }}>
            <Text style={[font, { color: '#DAD9FF', fontSize: 12, fontWeight: '700' }]}>For students in Bangladesh</Text>
          </View>
          <View style={{ marginTop: 14 }}>
            <Text id="sip-hero-1" style={[font, heroLine]}>Earn while</Text>
            <Text id="sip-hero-2" style={[font, heroLine]}>you study.</Text>
          </View>
          <FadeIn delay={HOME_T0} {...SOFT}>
            <Text style={[font, { color: '#C9CBFF', fontSize: 16, lineHeight: 24, marginTop: 10 }]}>Verified students find paid work. Companies find reliable talent.</Text>
          </FadeIn>
        </View>
      </FadeIn>

      <FadeIn delay={HOME_T0 + 100} {...SOFT}>
        <Small style={{ marginTop: 18, marginBottom: 2, fontWeight: '700' }}>Choose how you want to continue</Small>
      </FadeIn>
      <View style={{ marginTop: 8 }}>
        {ROLES.filter((r) => r.id !== 'admin').map((r, i) => (
          <FadeIn key={r.id} delay={HOME_T0 + 200 + i * 120} {...SOFT}>
            <Press
              label={r.title}
              onPress={() => onPick(r.id)}
              style={({ hovered }) => [
                { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 14 },
                shadow(1),
                hovered && Platform.OS === 'web' && { borderColor: C[r.tone], transform: [{ translateY: -2 }], boxShadow: `0 14px 34px rgba(${C.shadowRgb},.16)`, transition: 'all .2s ease' },
              ]}
            >
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{r.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.title, font]}>{r.title}</Text>
                <Body style={{ marginTop: 2, fontSize: 14, lineHeight: 20 }}>{r.text}</Body>
              </View>
              <Text style={{ fontSize: 22, color: C.mute }}>›</Text>
            </Press>
          </FadeIn>
        ))}
      </View>

      <FadeIn delay={HOME_T0 + 500} {...SOFT}>
        <Card style={{ marginTop: 8, backgroundColor: C.brandSoft, borderColor: 'transparent' }}>
          <H2 style={{ fontSize: 16 }}>How it works for students</H2>
          <View style={{ marginTop: 10, gap: 10 }}>
            {HOW.map(([a, b], i) => (
              <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.brandFill, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.white, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
                </View>
                <Text style={[T.body, font, { flex: 1, color: C.ink }]}><Text style={{ fontWeight: '700' }}>{a}.</Text> {b}</Text>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>
    </>
  );
}

/* ---------- Form definition ----------
   Sign-up is split into short steps. Every field is described once here; the screen renders and validates from it. */
const EMAIL = { k: 'email', label: 'Email', props: { autoCapitalize: 'none', keyboardType: 'email-address', autoComplete: 'email' } };
const ACCOUNT = {
  title: 'Account', sub: 'This is how you’ll log in.',
  fields: [
    EMAIL,
    { k: 'password', label: 'Password', secure: true, meter: true, props: { autoComplete: 'new-password' } },
    { k: 'confirm', label: 'Confirm password', secure: true, props: { autoComplete: 'new-password' } },
  ],
};
const ABOUT = {
  title: 'About you', sub: 'So everyone knows who they’re working with.',
  fields: [
    { k: 'name', label: 'Full name', props: { autoComplete: 'name' } },
    { k: 'phone', label: 'Mobile number', hint: 'For example 01712345678', props: { keyboardType: 'phone-pad', autoComplete: 'tel' } },
  ],
};
const FLOW = {
  student: [
    ACCOUNT, ABOUT,
    { title: 'Education', sub: 'Companies see this on your profile.', fields: [
      { k: 'university', label: 'University' },
      { k: 'department', label: 'Department' },
      { k: 'year', label: 'Academic year', hint: '1 to 6', half: 1, props: { keyboardType: 'numeric' } },
      { k: 'studentId', label: 'Student ID', half: 1.3 },
    ] },
    { title: 'Skills', sub: 'An admin will arrange a test for each skill. You can add more later.', fields: [
      { k: 'skills', label: 'Skills', hint: 'Separate with commas, up to 5. For example: Content Writing, Excel', props: { placeholder: 'Content Writing, Graphic Design' } },
      { k: 'hoursPerWeek', label: 'Hours you can work per week', hint: '1 to 60', props: { keyboardType: 'numeric' } },
      { k: 'portfolio', label: 'Portfolio or LinkedIn', opt: true, props: { autoCapitalize: 'none' } },
    ] },
  ],
  company: [
    ACCOUNT, ABOUT,
    { title: 'Company', sub: 'An admin checks these details before you can post jobs.', fields: [
      { k: 'companyName', label: 'Company name' },
      { k: 'industry', label: 'Industry', props: { placeholder: 'Clothing, education…' } },
      { k: 'city', label: 'City' },
      { k: 'website', label: 'Website or Facebook page', hint: 'Helps us verify your business', props: { autoCapitalize: 'none' } },
      { k: 'licenseNo', label: 'Trade licence number', opt: true },
    ] },
  ],
  admin: [
    ACCOUNT, ABOUT,
    { title: 'Access', sub: 'Ask the owner of the platform for this code.', fields: [
      { k: 'setupCode', label: 'Admin setup code', secure: true },
    ] },
  ],
};
const LOGIN = {
  fields: [EMAIL, { k: 'password', label: 'Password', secure: true, props: { autoComplete: 'current-password' } }],
};

const MAIL = /^\S+@\S+\.\S+$/;
const check = (fd, val, f) => {
  const s = String(val || '').trim();
  if (!s && !fd.opt) return `${fd.label} is required`;
  if (fd.k === 'email' && s && !MAIL.test(s)) return 'Enter a valid email address';
  if (fd.k === 'password' && f.__reg && val && val.length < 8) return 'Use at least 8 characters';
  if (fd.k === 'confirm' && s && val !== f.password) return 'Passwords do not match';
  if (fd.k === 'year' && s && !(Number(s) >= 1 && Number(s) <= 6)) return 'Enter a year from 1 to 6';
  if (fd.k === 'hoursPerWeek' && s && !(Number(s) >= 1 && Number(s) <= 60)) return 'Enter hours from 1 to 60';
  if (fd.k === 'skills' && s.split(',').filter((x) => x.trim()).length > 5) return 'Add up to 5 skills';
  return '';
};

const AFTER = {
  student: 'Next: add a skill and take a short test to get verified.',
  company: 'An admin will approve your company before you can post jobs.',
  admin: 'Taking you to your console…',
};

export function Auth({ role, onAuth }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('right');
  const [f, setF] = useState({});
  const [errs, setErrs] = useState({});
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState(null);
  const refs = useRef({});

  const reg = mode === 'register';
  const flow = FLOW[role];
  const cur = reg ? flow[step] : LOGIN;
  const last = !reg || step === flow.length - 1;
  const R_ = ROLES.find((r) => r.id === role);
  const v = (k) => f[k] || '';

  const set = (k) => (val) => { setF((p) => ({ ...p, [k]: val })); if (errs[k]) setErrs((e) => ({ ...e, [k]: undefined })); };
  const ctx = () => ({ ...f, __reg: reg });
  const onBlurCheck = (fd) => () => {
    if (!v(fd.k)) return; // don't scold a field the person has only just passed through
    const m = check(fd, f[fd.k], ctx());
    setErrs((e) => ({ ...e, [fd.k]: m || undefined }));
  };

  const validateStep = () => {
    const e = {};
    let first = null;
    cur.fields.forEach((fd) => {
      const m = check(fd, f[fd.k], ctx());
      e[fd.k] = m || undefined;
      if (m && !first) first = fd.k;
    });
    setErrs((p) => ({ ...p, ...e }));
    if (first) {
      setShake((n) => n + 1);
      const el = refs.current[first];
      if (el && el.focus) el.focus();
      return false;
    }
    return true;
  };

  const next = () => { if (validateStep()) { setDir('right'); setStep((s) => s + 1); } return false; };
  const prev = () => { setDir('left'); setStep((s) => Math.max(0, s - 1)); };
  const switchMode = (m) => { setErrs({}); setStep(0); setDir('right'); setMode(m); };

  const go = async () => {
    if (!validateStep()) return false;
    const { __reg, ...body } = f;
    const ok = await run(async () => {
      const d = await api(reg ? '/auth/register' : '/auth/login', 'POST', { ...body, email: f.email.trim(), role });
      setToken(d.token);
      if (store) store.setItem('sip_token', d.token);
      if (reg) { setDone(d.user); setTimeout(() => onAuth(d.user), 1500); } else onAuth(d.user);
    }, reg && role === 'company' ? 'Account created. An admin will approve your company before you can post jobs.' : undefined);
    if (!ok) { setShake((n) => n + 1); return false; }
  };
  const submit = last ? go : next;

  /* ----- success moment after sign-up ----- */
  if (done) {
    return (
      <Card style={{ padding: 28 }}>
        <FadeIn>
          <View style={{ alignItems: 'center', paddingVertical: 14 }}>
            <CheckPop size={68} />
            <H1 style={{ marginTop: 22, textAlign: 'center' }}>{`You’re in${done.name ? `, ${String(done.name).split(' ')[0]}` : ''}!`}</H1>
            <Body style={{ marginTop: 6, textAlign: 'center', maxWidth: 320 }}>{AFTER[role]}</Body>
          </View>
        </FadeIn>
      </Card>
    );
  }

  const okFor = (fd) => (fd.k === 'email' ? MAIL.test(v('email').trim()) : fd.k === 'confirm' ? !!v('confirm') && v('confirm') === v('password') : false);

  const field = (fd) => {
    const idx = cur.fields.indexOf(fd);
    const isLast = idx === cur.fields.length - 1;
    return (
      <View key={fd.k} style={fd.half ? { flex: fd.half } : null}>
        <FloatField
          ref={(r) => { refs.current[fd.k] = r; }}
          label={fd.opt ? `${fd.label} (optional)` : fd.label}
          value={v(fd.k)}
          onChangeText={set(fd.k)}
          error={errs[fd.k]}
          hint={fd.hint}
          ok={!errs[fd.k] && okFor(fd)}
          secure={fd.secure}
          onBlur={onBlurCheck(fd)}
          returnKeyType={isLast ? 'done' : 'next'}
          blurOnSubmit={isLast}
          onSubmitEditing={isLast ? submit : () => { const n = cur.fields[idx + 1]; const el = n && refs.current[n.k]; if (el && el.focus) el.focus(); }}
          {...(fd.props || {})}
        />
        {fd.meter && reg ? <PasswordMeter value={v('password')} /> : null}
      </View>
    );
  };

  const body = [];
  for (let i = 0; i < cur.fields.length; i++) {
    const fd = cur.fields[i];
    const nx = cur.fields[i + 1];
    if (fd.half && nx && nx.half) {
      body.push(<View key={fd.k} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>{field(fd)}{field(nx)}</View>);
      i++;
    } else body.push(field(fd));
  }

  return (
    <Shake trigger={shake}>
      <Card style={{ padding: 20 }}>
        <Row style={{ marginTop: 0 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{R_.icon}</Text></View>
          <View style={{ flex: 1 }}>
            <H1 style={{ fontSize: 21, lineHeight: 26 }}>{reg ? `Create your ${role} account` : 'Welcome back'}</H1>
            <Small>{reg ? `Step ${step + 1} of ${flow.length} · about two minutes` : `Log in as a ${role}.`}</Small>
          </View>
        </Row>

        <Tabs items={['Log in', 'Sign up']} tab={reg ? 'Sign up' : 'Log in'} setTab={(t) => switchMode(t === 'Sign up' ? 'register' : 'login')} />
        {reg ? <Stepper steps={flow.map((s) => s.title)} index={step} /> : null}

        <FadeIn key={`${mode}-${step}`} from={dir} dist={14} dur={380}>
          {reg ? (
            <View style={{ marginTop: 14 }}>
              <Title>{cur.title}</Title>
              {cur.sub ? <Small style={{ marginTop: 2 }}>{cur.sub}</Small> : null}
            </View>
          ) : null}
          {body}
        </FadeIn>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'flex-start' }}>
          {reg && step > 0 ? <View style={{ flex: 0.8 }}><Btn kind="ghost" title="Back" onPress={prev} /></View> : null}
          <View style={{ flex: 1.6 }}><Btn title={reg ? (last ? 'Create account' : 'Continue') : 'Log in'} onPress={submit} /></View>
        </View>

        <Divider />
        <Pressable onPress={() => switchMode(reg ? 'login' : 'register')} accessibilityRole="button">
          <Text style={[T.small, font, { textAlign: 'center' }]}>
            {reg ? 'Already have an account? ' : 'New here? '}<Text style={{ color: C.brand, fontWeight: '700' }}>{reg ? 'Log in' : 'Create an account'}</Text>
          </Text>
        </Pressable>
      </Card>
    </Shake>
  );
}