import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { C, R, T, shadow, FONT } from '../theme';
import { H1, H2, Body, Small, Card, Btn, Field, Tabs, Row, Divider, FadeIn, Float } from '../components/ui';
import { api, run, setToken, store } from '../api';

const font = FONT ? { fontFamily: FONT } : null;

const ROLES = [
  { id: 'student', icon: '🎓', title: 'I’m a student', text: 'List your skills, pass a short test, apply to real jobs and get paid.', tone: 'brand' },
  { id: 'company', icon: '🏢', title: 'I’m a company', text: 'Post jobs, review comments from verified students and hire who you like.', tone: 'blue' },
  { id: 'admin', icon: '🛡️', title: 'I’m an admin', text: 'Approve companies, score tests, publish jobs and record payments.', tone: 'gold' },
];

const STEPS = [
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
          <Text style={[font, { color: C.white, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, marginTop: 14 }]}>Earn while{'\n'}you study.</Text>
          <Text style={[font, { color: '#C9CBFF', fontSize: 16, lineHeight: 24, marginTop: 10 }]}>Verified students find paid work. Companies find reliable talent.</Text>
        </View>
      </FadeIn>

      <View style={{ marginTop: 14 }}>
        {ROLES.map((r, i) => (
          <FadeIn key={r.id} delay={300 + i * 120}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={r.title}
            onPress={() => onPick(r.id)}
            style={({ hovered, pressed }) => [
              { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 14 },
              shadow(1),
              hovered && Platform.OS === 'web' && { borderColor: C[r.tone] },
              pressed && { opacity: 0.85 },
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
          </Pressable>
          </FadeIn>
        ))}
      </View>

      <FadeIn delay={700}><Card style={{ marginTop: 8, backgroundColor: C.brandSoft, borderColor: 'transparent' }}>
        <H2 style={{ fontSize: 16 }}>How it works for students</H2>
        <View style={{ marginTop: 10, gap: 10 }}>
          {STEPS.map(([a, b], i) => (
            <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.brandFill, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.white, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
              </View>
              <Text style={[T.body, font, { flex: 1, color: C.ink }]}><Text style={{ fontWeight: '700' }}>{a}.</Text> {b}</Text>
            </View>
          ))}
        </View>
      </Card></FadeIn>
    </>
  );
}

/* Required fields per role, so mistakes are caught before the request is sent. */
const REQUIRED = {
  common: [['email', 'Email'], ['password', 'Password']],
  student: [['name', 'Full name'], ['phone', 'Mobile number'], ['university', 'University'], ['department', 'Department'], ['year', 'Academic year'], ['studentId', 'Student ID'], ['skills', 'At least one skill'], ['hoursPerWeek', 'Weekly hours']],
  company: [['name', 'Full name'], ['phone', 'Mobile number'], ['companyName', 'Company name'], ['industry', 'Industry'], ['city', 'City'], ['website', 'Website or Facebook page']],
  admin: [['name', 'Full name'], ['phone', 'Mobile number'], ['setupCode', 'Admin setup code']],
};

const Group = ({ title, hint, children }) => (
  <View style={{ marginTop: 20 }}>
    <Text style={[T.title, font]}>{title}</Text>
    {hint ? <Small style={{ marginTop: 2 }}>{hint}</Small> : null}
    {children}
  </View>
);

export function Auth({ role, onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({});
  const [errs, setErrs] = useState({});
  const set = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); if (errs[k]) setErrs((e) => ({ ...e, [k]: undefined })); };
  const reg = mode === 'register';
  const v = (k) => f[k] || '';
  const R_ = ROLES.find((r) => r.id === role);

  const validate = () => {
    const e = {};
    const need = reg ? [...REQUIRED[role], ...REQUIRED.common] : REQUIRED.common;
    need.forEach(([k, label]) => { if (!String(f[k] || '').trim()) e[k] = `${label} is required`; });
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (reg) {
      if (f.password && f.password.length < 8) e.password = 'Use at least 8 characters';
      if (f.password !== f.confirm) e.confirm = 'Passwords do not match';
      if (role === 'student' && f.year && !(Number(f.year) >= 1 && Number(f.year) <= 6)) e.year = 'Enter a year from 1 to 6';
    }
    setErrs(e);
    return !Object.keys(e).length;
  };

  const go = () => {
    if (!validate()) return;
    return run(async () => {
      const d = await api(reg ? '/auth/register' : '/auth/login', 'POST', { ...f, email: f.email.trim(), role });
      setToken(d.token);
      if (store) store.setItem('sip_token', d.token);
      onAuth(d.user);
    }, reg && role === 'company' ? 'Account created. An admin will approve your company before you can post jobs.' : undefined);
  };

  const E = (k) => errs[k];
  return (
    <Card style={{ padding: 20 }}>
      <Row style={{ marginTop: 0 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{R_.icon}</Text></View>
        <View style={{ flex: 1 }}>
          <H1 style={{ fontSize: 21, lineHeight: 26 }}>{reg ? `Create your ${role} account` : `Welcome back`}</H1>
          <Small>{reg ? 'It takes about two minutes.' : `Log in as a ${role}.`}</Small>
        </View>
      </Row>

      <Tabs items={['Log in', 'Sign up']} tab={reg ? 'Sign up' : 'Log in'} setTab={(t) => { setErrs({}); setMode(t === 'Sign up' ? 'register' : 'login'); }} />

      {reg && (
        <Group title="About you">
          <Field label="Full name" autoComplete="name" value={v('name')} onChangeText={set('name')} error={E('name')} />
          <Field label="Mobile number" hint="For example 01712345678" keyboardType="phone-pad" autoComplete="tel" value={v('phone')} onChangeText={set('phone')} error={E('phone')} />
        </Group>
      )}

      {reg && role === 'student' && (
        <>
          <Group title="Education">
            <Field label="University" value={v('university')} onChangeText={set('university')} error={E('university')} />
            <Field label="Department" value={v('department')} onChangeText={set('department')} error={E('department')} />
            <Row style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}><Field label="Academic year" hint="1 to 6" keyboardType="numeric" value={v('year')} onChangeText={set('year')} error={E('year')} /></View>
              <View style={{ flex: 1.4 }}><Field label="Student ID" value={v('studentId')} onChangeText={set('studentId')} error={E('studentId')} /></View>
            </Row>
          </Group>
          <Group title="Your work" hint="An admin will arrange a test for each skill. You can add more later.">
            <Field label="Skills" placeholder="Content Writing, Graphic Design, Excel" hint="Separate with commas, up to 5" value={v('skills')} onChangeText={set('skills')} error={E('skills')} />
            <Field label="Hours you can work per week" hint="1 to 60" keyboardType="numeric" value={v('hoursPerWeek')} onChangeText={set('hoursPerWeek')} error={E('hoursPerWeek')} />
            <Field label="Portfolio or LinkedIn (optional)" autoCapitalize="none" value={v('portfolio')} onChangeText={set('portfolio')} />
          </Group>
        </>
      )}

      {reg && role === 'company' && (
        <Group title="Company">
          <Field label="Company name" value={v('companyName')} onChangeText={set('companyName')} error={E('companyName')} />
          <Field label="Industry" placeholder="Clothing, education…" value={v('industry')} onChangeText={set('industry')} error={E('industry')} />
          <Field label="City" value={v('city')} onChangeText={set('city')} error={E('city')} />
          <Field label="Website or Facebook page" hint="Helps us verify your business" autoCapitalize="none" value={v('website')} onChangeText={set('website')} error={E('website')} />
          <Field label="Trade licence number (optional)" value={v('licenseNo')} onChangeText={set('licenseNo')} />
        </Group>
      )}

      {reg && role === 'admin' && (
        <Group title="Admin access">
          <Field label="Admin setup code" secureTextEntry value={v('setupCode')} onChangeText={set('setupCode')} error={E('setupCode')} />
        </Group>
      )}

      <Group title={reg ? 'Sign-in details' : 'Your details'}>
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={v('email')} onChangeText={set('email')} error={E('email')} />
        <Field label="Password" hint={reg ? 'At least 8 characters' : undefined} secureTextEntry autoComplete={reg ? 'new-password' : 'current-password'} value={v('password')} onChangeText={set('password')} error={E('password')}
          onSubmitEditing={reg ? undefined : go} />
        {reg && <Field label="Confirm password" secureTextEntry value={v('confirm')} onChangeText={set('confirm')} error={E('confirm')} onSubmitEditing={go} />}
      </Group>

      <View style={{ marginTop: 10 }}>
        <Btn title={reg ? 'Create account' : 'Log in'} onPress={go} />
      </View>
      <Divider />
      <Pressable onPress={() => setMode(reg ? 'login' : 'register')} accessibilityRole="button">
        <Text style={[T.small, font, { textAlign: 'center' }]}>
          {reg ? 'Already have an account? ' : 'New here? '}<Text style={{ color: C.brand, fontWeight: '700' }}>{reg ? 'Log in' : 'Create an account'}</Text>
        </Text>
      </Pressable>
    </Card>
  );
}
