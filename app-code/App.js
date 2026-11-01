import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/* If you test on a real phone, put your laptop's Wi-Fi IP here, e.g. '192.168.0.105' */
const LAN_IP = '';
const HOST = LAN_IP || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const API = `https://storm-tebd.onrender.com/api`;

let TOKEN = null;
let notify = () => {};
const store = Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage : null;

async function api(path, method = 'GET', body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const run = async (fn, ok) => {
  try { await fn(); if (ok) notify(ok); }
  catch (e) { notify(e.message === 'Network request failed' || e.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : e.message); }
};

function useLoad(path, fallback = []) {
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    api(path).then(setData).catch((e) => { notify(e.message); setData(fallback); });
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
}

/* ---------- UI pieces ---------- */
const C = { bg: '#F2F5F3', ink: '#17252B', jade: '#0E6B5B', jadeDark: '#094A3F', amber: '#E3A008', line: '#D8E0DC', mute: '#62767E', red: '#B3261E', white: '#FFFFFF' };

const Btn = ({ title, onPress, kind = 'solid' }) => (
  <TouchableOpacity onPress={onPress} style={[s.btn, kind === 'ghost' && s.btnGhost, kind === 'warn' && s.btnWarn]}>
    <Text style={[s.btnText, kind === 'ghost' && { color: C.jade }, kind === 'warn' && { color: C.red }]}>{title}</Text>
  </TouchableOpacity>
);
const Field = (p) => <TextInput placeholderTextColor={C.mute} style={[s.input, p.multiline && { height: 110, textAlignVertical: 'top' }]} {...p} />;
const L = ({ label, ...p }) => (<View><Text style={s.label}>{label}</Text><Field {...p} /></View>);
const Card = ({ children }) => <View style={s.card}>{children}</View>;
const Tap = ({ onPress, children }) => <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.card}>{children}</TouchableOpacity>;
const Chip = ({ text, tone }) => (
  <View style={[s.chip, tone === 'money' && { backgroundColor: '#FBEFC9' }, tone === 'bad' && { backgroundColor: '#F8DAD7' }, tone === 'ok' && { backgroundColor: '#C9EBDD' }]}>
    <Text style={s.chipText}>{text}</Text>
  </View>
);
const H = ({ children }) => <Text style={s.h2}>{children}</Text>;
const Empty = ({ text }) => <Text style={s.empty}>{text}</Text>;
const Loading = () => <ActivityIndicator color={C.jade} style={{ margin: 24 }} />;
const Row = ({ children }) => <View style={s.row}>{children}</View>;

const Tabs = ({ items, tab, setTab }) => (
  <View style={s.tabs}>
    {items.map((t) => (
      <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
        <Text style={[s.tabText, tab === t && { color: C.white }]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
const Seg = ({ items, value, onChange }) => (
  <View style={s.tabs}>
    {items.map((i) => (
      <TouchableOpacity key={i.key} onPress={() => onChange(i.key)} style={[s.tab, value === i.key && s.tabOn]}>
        <Text style={[s.tabText, value === i.key && { color: C.white }]}>{i.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const money = (n) => `৳${n}`;
const day = (d) => new Date(d).toDateString();
const when = (d) => new Date(d).toLocaleString();
const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
const norm = (x) => String(x || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* ---------- Welcome + Auth ---------- */
const ROLES = [
  { id: 'student', title: 'I am a student', text: 'Add your skills, take skill tests, comment on jobs and get hired.' },
  { id: 'company', title: 'I am a company', text: 'Post jobs, read comments from verified students and choose who you want.' },
  { id: 'admin', title: 'I am an admin', text: 'Approve companies, arrange and score skill tests, publish jobs and handle payments.' },
];

function Welcome({ onPick }) {
  return (
    <>
      <Text style={s.h1}>How do you want to continue?</Text>
      <Text style={s.mute}>Earn while you learn. Pick your role to log in or create an account.</Text>
      {ROLES.map((r) => (
        <TouchableOpacity key={r.id} onPress={() => onPick(r.id)} style={s.roleCard}>
          <Text style={s.roleTitle}>{r.title}</Text>
          <Text style={s.body}>{r.text}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

function Auth({ role, onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({});
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const reg = mode === 'register';
  const v = (k) => f[k] || '';
  const go = () => run(async () => {
    if (reg && f.password !== f.confirm) throw new Error('Passwords do not match');
    const d = await api(reg ? '/auth/register' : '/auth/login', 'POST', { ...f, role });
    TOKEN = d.token;
    if (store) store.setItem('sip_token', d.token);
    onAuth(d.user);
  }, reg && role === 'company' ? 'Account created. Admin will approve your company before you can post jobs.' : undefined);

  return (
    <Card>
      <Text style={s.h1}>{reg ? `Create ${role} account` : `Log in as ${role}`}</Text>
      <Tabs items={['Log in', 'Sign up']} tab={reg ? 'Sign up' : 'Log in'} setTab={(t) => setMode(t === 'Sign up' ? 'register' : 'login')} />
      {reg && <L label="Full name" value={v('name')} onChangeText={set('name')} />}
      <L label="Email" autoCapitalize="none" keyboardType="email-address" value={v('email')} onChangeText={set('email')} />
      {reg && <L label="Mobile number (e.g. 01712345678)" keyboardType="phone-pad" value={v('phone')} onChangeText={set('phone')} />}

      {reg && role === 'student' && (
        <>
          <L label="University" value={v('university')} onChangeText={set('university')} />
          <L label="Department" value={v('department')} onChangeText={set('department')} />
          <L label="Academic year (1 to 6)" keyboardType="numeric" value={v('year')} onChangeText={set('year')} />
          <L label="Student ID" value={v('studentId')} onChangeText={set('studentId')} />
          <L label="Your skills (separate with commas, up to 5)" placeholder="Content Writing, Graphic Design, Excel" value={v('skills')} onChangeText={set('skills')} />
          <Text style={s.mute}>Admin will arrange a test for each skill. You can add more skills later.</Text>
          <L label="Hours you can work per week" keyboardType="numeric" value={v('hoursPerWeek')} onChangeText={set('hoursPerWeek')} />
          <L label="Portfolio or LinkedIn link (optional)" autoCapitalize="none" value={v('portfolio')} onChangeText={set('portfolio')} />
        </>
      )}
      {reg && role === 'company' && (
        <>
          <L label="Company name" value={v('companyName')} onChangeText={set('companyName')} />
          <L label="Industry (e.g. clothing, education)" value={v('industry')} onChangeText={set('industry')} />
          <L label="City" value={v('city')} onChangeText={set('city')} />
          <L label="Website or Facebook page" autoCapitalize="none" value={v('website')} onChangeText={set('website')} />
          <L label="Trade licence number (optional)" value={v('licenseNo')} onChangeText={set('licenseNo')} />
        </>
      )}
      {reg && role === 'admin' && <L label="Admin setup code" secureTextEntry value={v('setupCode')} onChangeText={set('setupCode')} />}
      <L label={reg ? 'Password (8+ characters)' : 'Password'} secureTextEntry value={v('password')} onChangeText={set('password')} />
      {reg && <L label="Confirm password" secureTextEntry value={v('confirm')} onChangeText={set('confirm')} />}
      <Btn title={reg ? 'Create account' : 'Log in'} onPress={go} />
    </Card>
  );
}

/* ---------- Job detail (shared) ---------- */
function TaskDetail({ id, user }) {
  const [t, reload] = useLoad(`/tasks/${id}`, { error: true });
  const [text, setText] = useState('');
  const [work, setWork] = useState('');
  const [note, setNote] = useState('');
  if (!t) return <Loading />;
  if (t.error) return <Empty text="Could not open this job." />;
  const me = t.me;
  const act = (path, body, ok) => run(async () => { await api(`/tasks/${id}/${path}`, 'POST', body); reload(); }, ok);
  const comment = () => run(async () => { await api(`/tasks/${id}/comments`, 'POST', { text }); setText(''); reload(); });
  const who = t.company && (t.company.companyName || t.company.name);

  return (
    <>
      <Card>
        <Text style={s.h1}>{t.title}</Text>
        <Text style={s.mute}>{who} · needs {t.skill} · due {day(t.deadline)}</Text>
        <Row>
          <Chip text={t.status} />
          {me.isOwner ? <Chip tone="money" text={`Budget ${money(t.budget)}`} /> : <Chip tone="money" text={`You earn ${money(t.payout)}`} />}
        </Row>
        <Text style={s.body}>{t.description}</Text>
      </Card>

      {/* student workflow */}
      {me.isAssigned && t.status === 'assigned' && !t.studentAcceptedAt && (
        <Card>
          <Text style={s.title}>You were chosen for this job</Text>
          <Text style={s.body}>Deliver "{t.title}" by {day(t.deadline)} with {t.revisions} revision round for {money(t.payout)}.</Text>
          <Btn title="Accept terms" onPress={() => act('accept-terms', {})} />
        </Card>
      )}
      {me.isAssigned && t.status === 'assigned' && t.studentAcceptedAt && <Card><Text style={s.body}>Waiting for admin to confirm the company's payment. You can start right after.</Text></Card>}
      {me.isAssigned && ['funded', 'revision'].includes(t.status) && (
        <Card>
          <Text style={s.title}>Submit your work</Text>
          {t.status === 'revision' && <Text style={s.body}>Revision requested: {t.feedback}</Text>}
          <Field multiline placeholder="Paste your work or a link to it" value={work} onChangeText={setWork} />
          <Btn title="Submit work" onPress={() => act('submit', { text: work }, 'Work submitted')} />
        </Card>
      )}
      {me.isAssigned && t.status === 'submitted' && <Card><Text style={s.body}>Submitted. Waiting for the company to review.</Text></Card>}
      {me.isAssigned && ['accepted', 'paid'].includes(t.status) && <Card><Text style={s.body}>{t.status === 'paid' ? 'Paid. Great work!' : 'Accepted. Admin will send your payment.'} {t.rating && t.rating.score ? `Company rating: ${stars(t.rating.score)}` : ''}</Text></Card>}

      {/* company workflow */}
      {me.isOwner && t.status === 'pending' && <Card><Text style={s.body}>Waiting for admin to publish this job.</Text></Card>}
      {me.isOwner && t.status === 'rejected' && <Card><Text style={s.body}>Admin did not publish this job. Post it again with a clearer description.</Text></Card>}
      {me.isOwner && t.status === 'assigned' && (
        <Card>
          <Text style={s.title}>{t.student && t.student.name} is chosen</Text>
          <Text style={s.body}>Send {money(t.budget)} to the platform's bKash/Nagad number. Work starts after admin confirms your payment.</Text>
        </Card>
      )}
      {me.isOwner && t.status === 'submitted' && (
        <Card>
          <Text style={s.title}>Submitted work</Text>
          <Text style={s.body}>{t.submission && t.submission.text}</Text>
          <Btn title="Accept work" onPress={() => act('review', { action: 'accept' }, 'Work accepted')} />
          <Field placeholder="What should change? (one revision allowed)" value={note} onChangeText={setNote} />
          <Btn kind="ghost" title="Request revision" onPress={() => act('review', { action: 'revise', comment: note }, 'Revision requested')} />
        </Card>
      )}
      {me.isOwner && ['accepted', 'paid'].includes(t.status) && !(t.rating && t.rating.score) && (
        <Card>
          <Text style={s.title}>Rate {t.student && t.student.name}</Text>
          <Row>{[1, 2, 3, 4, 5].map((n) => <Btn key={n} kind="ghost" title={`${n} ★`} onPress={() => act('rate', { score: n }, 'Thanks for rating')} />)}</Row>
        </Card>
      )}

      {/* comments */}
      <H>Comments ({t.comments.length})</H>
      {!t.comments.length && <Text style={s.mute}>No comments yet.</Text>}
      {t.comments.map((c) => {
        const u = c.user;
        if (!u) return null;
        const isStudent = u.role === 'student';
        const verified = isStudent && (u.verifiedSkills || []).some((x) => norm(x.skill) === t.skillKey);
        const chosen = t.student && String(t.student._id) === String(u._id);
        return (
          <Card key={c._id}>
            <Row>
              <Text style={s.title}>{u.name}</Text>
              <Chip text={isStudent ? u.level : 'company'} />
              {verified && <Chip tone="ok" text={`Verified in ${t.skill}`} />}
              {chosen && <Chip tone="money" text="Chosen" />}
            </Row>
            <Text style={s.body}>{c.text}</Text>
            <Text style={s.mute}>{when(c.at)}</Text>
            {me.isOwner && t.status === 'open' && isStudent && <Btn title={`Choose ${u.name}`} onPress={() => act('select', { studentId: u._id }, `${u.name} chosen`)} />}
          </Card>
        );
      })}
      {me.canComment ? (
        <Card>
          <Field multiline placeholder={me.isOwner ? 'Ask a question or reply to applicants' : 'Tell the company why you can do this job'} value={text} onChangeText={setText} />
          <Btn title="Post comment" onPress={comment} />
        </Card>
      ) : user.role === 'student' && t.status === 'open' ? (
        <Card><Text style={s.body}>To comment on this job you need to be verified in "{t.skill}". Add it under My skills and pass the test.</Text></Card>
      ) : null}
    </>
  );
}

/* ---------- Student ---------- */
const SUGGESTIONS = [
  ['writ', 'Write 5 product descriptions (50-70 words each) for an online clothing store.'],
  ['data', 'Explain step by step how you would clean a spreadsheet with duplicate rows, mixed date formats and blank cells. Name the formulas or tools you would use.'],
  ['excel', 'Explain step by step how you would clean a spreadsheet with duplicate rows, mixed date formats and blank cells. Name the formulas or tools you would use.'],
  ['research', 'List 10 Bangladeshi online clothing shops. For each give the name, website and one source link.'],
  ['design', 'Design 3 social media posts for a clothing sale. Share links to the images and explain your colour and font choices.'],
  ['video', 'Describe how you would edit a 30-second captioned product video and share a link to a sample of your work.'],
];
const suggest = (name) => {
  const k = norm(name);
  const hit = SUGGESTIONS.find(([w]) => k.includes(w));
  return hit ? hit[1] : `Describe your experience in ${name}. Then complete a small task a client could ask for in ${name}, explain your steps and share links to related work.`;
};

function MySkills() {
  const [skills, reload] = useLoad('/skills/mine');
  const [name, setName] = useState('');
  const [ans, setAns] = useState({});
  if (!skills) return <Loading />;
  const call = (path, method, body, ok) => run(async () => { await api(path, method, body); reload(); }, ok);
  return (
    <>
      <Card>
        <Text style={s.title}>Add a skill</Text>
        <Text style={s.mute}>Admin arranges a test for each skill. Pass it (70+) to get verified and apply for jobs in that skill.</Text>
        <Field placeholder="e.g. Content Writing" value={name} onChangeText={setName} />
        <Btn title="Add skill" onPress={() => run(async () => { await api('/skills', 'POST', { name }); setName(''); reload(); }, 'Skill added. Admin will arrange your test.')} />
      </Card>
      {skills.map((k) => (
        <Card key={k._id}>
          <Row>
            <Text style={s.title}>{k.name}</Text>
            {k.status === 'requested' && <Chip text="Waiting for admin to arrange test" />}
            {k.status === 'ready' && <Chip tone="money" text="Test ready" />}
            {k.status === 'submitted' && <Chip text="Submitted, being scored" />}
            {k.status === 'scored' && <Chip tone={k.score >= 70 ? 'ok' : 'bad'} text={k.score >= 70 ? 'Verified' : 'Not passed'} />}
          </Row>
          {k.status === 'ready' && (
            <>
              <Text style={s.body}>{k.prompt}</Text>
              <Field multiline placeholder="Write your answer or paste links to your work" value={ans[k._id] || ''} onChangeText={(x) => setAns({ ...ans, [k._id]: x })} />
              <Btn title="Submit test" onPress={() => call(`/skills/${k._id}/submit`, 'POST', { answer: ans[k._id] }, 'Test submitted')} />
            </>
          )}
          {k.status === 'scored' && (
            <>
              <Text style={s.body}>Score {k.score}/100 · Rating {stars(k.rating)}</Text>
              {k.feedback ? <Text style={s.mute}>Admin feedback: {k.feedback}</Text> : null}
              {k.score < 70 && <Btn kind="ghost" title="Request a retest" onPress={() => call(`/skills/${k._id}/retest`, 'POST', {}, 'Retest requested')} />}
            </>
          )}
          {k.status !== 'submitted' && <Btn kind="warn" title="Remove skill" onPress={() => call(`/skills/${k._id}`, 'DELETE', undefined, 'Skill removed')} />}
        </Card>
      ))}
    </>
  );
}

function StudentJobs({ open }) {
  const [tasks] = useLoad('/tasks');
  if (!tasks) return <Loading />;
  if (!tasks.length) return <Empty text="No open jobs right now. Check back soon." />;
  return tasks.map((t) => (
    <Tap key={t._id} onPress={() => open(t._id)}>
      <Text style={s.title}>{t.title}</Text>
      <Text style={s.mute}>{t.company && (t.company.companyName || t.company.name)} · {t.skill} · due {day(t.deadline)}</Text>
      <Text style={s.body} numberOfLines={2}>{t.description}</Text>
      <Row>
        <Chip tone="money" text={`You earn ${money(t.payout)}`} />
        <Chip text={`${t.commentCount} comments`} />
        {t.canComment ? <Chip tone="ok" text="You can apply" /> : <Chip tone="bad" text={`Needs ${t.skill} test`} />}
      </Row>
    </Tap>
  ));
}

function StudentWork({ open }) {
  const [tasks] = useLoad('/tasks/mine');
  if (!tasks) return <Loading />;
  if (!tasks.length) return <Empty text="Jobs you comment on will show up here." />;
  return tasks.map((t) => (
    <Tap key={t._id} onPress={() => open(t._id)}>
      <Text style={s.title}>{t.title}</Text>
      <Row><Chip text={t.assignedToMe ? t.status : 'applied'} /><Chip tone="money" text={money(t.payout)} /></Row>
    </Tap>
  ));
}

function Student({ user, open }) {
  const [tab, setTab] = useState('Jobs');
  return (
    <>
      <Card>
        <Text style={s.title}>{user.name}</Text>
        <Text style={s.mute}>{user.university} · {user.department}</Text>
        <Row>
          <Chip text={user.level} />
          {user.verifiedSkills.map((v) => <Chip key={v.skill} tone="ok" text={`${v.skill} ${v.score}/100 ${stars(v.rating)}`} />)}
        </Row>
        {!user.verifiedSkills.length && <Text style={s.mute}>Open My skills and take your tests to get verified and start applying.</Text>}
      </Card>
      <Tabs items={['Jobs', 'My skills', 'My work']} tab={tab} setTab={setTab} />
      {tab === 'Jobs' && <StudentJobs open={open} />}
      {tab === 'My skills' && <MySkills />}
      {tab === 'My work' && <StudentWork open={open} />}
    </>
  );
}

/* ---------- Company ---------- */
function PostJob({ user, done }) {
  const [f, setF] = useState({ deadlineDays: '7' });
  const [pop] = useLoad('/skills/popular');
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  if (user.status !== 'active') return <Card><Text style={s.body}>Your company is waiting for admin approval. You can post jobs as soon as you are approved.</Text></Card>;
  return (
    <Card>
      <Text style={s.h1}>Post a job</Text>
      <L label="Job title" placeholder="e.g. Write 20 product descriptions" value={f.title || ''} onChangeText={set('title')} />
      <L label="Description" multiline placeholder="What exactly should the student deliver? Add quantity, format, language and rules." value={f.description || ''} onChangeText={set('description')} />
      <L label="Skill needed" placeholder="e.g. Content Writing" value={f.skill || ''} onChangeText={set('skill')} />
      {pop && pop.length > 0 && (
        <Row>{pop.map((k) => <TouchableOpacity key={k} onPress={() => set('skill')(k)}><Chip text={k} /></TouchableOpacity>)}</Row>
      )}
      <L label="Budget in taka (minimum 300)" keyboardType="numeric" value={f.budget || ''} onChangeText={set('budget')} />
      <L label="Days to finish" keyboardType="numeric" value={f.deadlineDays || ''} onChangeText={set('deadlineDays')} />
      <Btn title="Submit job for approval" onPress={() => run(async () => { await api('/tasks', 'POST', f); done(); }, 'Job sent to admin. It goes live after approval.')} />
    </Card>
  );
}

function Company({ user, open }) {
  const [tasks] = useLoad('/tasks/mine');
  return (
    <>
      <Card>
        <Text style={s.title}>{user.companyName}</Text>
        <Chip tone={user.status === 'active' ? 'ok' : 'money'} text={user.status === 'active' ? 'Approved' : 'Waiting for admin approval'} />
        {user.status === 'active' && <Text style={s.mute}>Tap the + button to post a new job.</Text>}
      </Card>
      <H>My jobs</H>
      {!tasks ? <Loading /> : !tasks.length ? <Empty text="You have not posted any jobs yet." /> : tasks.map((t) => (
        <Tap key={t._id} onPress={() => open(t._id)}>
          <Text style={s.title}>{t.title}</Text>
          <Row>
            <Chip text={t.status} />
            <Chip tone="money" text={money(t.budget)} />
            <Chip text={`${t.commentCount} comments`} />
            {t.status === 'open' && t.commentCount > 0 && <Chip tone="ok" text="Choose a student" />}
          </Row>
        </Tap>
      ))}
    </>
  );
}

/* ---------- Admin ---------- */
function Overview({ go }) {
  const [o] = useLoad('/admin/overview', {});
  if (!o) return <Loading />;
  const Item = ({ label, n, tab, hot }) => (
    <Tap onPress={() => go(tab)}>
      <Row><Text style={[s.big, hot && n > 0 && { color: C.red }]}>{n || 0}</Text><Text style={s.body}>{label}</Text></Row>
    </Tap>
  );
  return (
    <>
      <H>Needs your action</H>
      <Item label="companies waiting for approval" n={o.pendingCompanies} tab="Companies" hot />
      <Item label="skills waiting for a test" n={o.toArrange} tab="Skill tests" hot />
      <Item label="tests waiting to be scored" n={o.toScore} tab="Skill tests" hot />
      <Item label="jobs waiting to be published" n={o.toPublish} tab="Jobs" hot />
      <Item label="jobs waiting for company payment confirmation" n={o.toFund} tab="Jobs" hot />
      <Item label="student payouts due" n={o.toPay} tab="Jobs" hot />
      <H>Platform</H>
      <Item label="students" n={o.students} tab="Students" />
      <Item label="approved companies" n={o.companies} tab="Companies" />
      <Item label="open jobs" n={o.openJobs} tab="Jobs" />
      <Item label="paid jobs" n={o.paidJobs} tab="Jobs" />
    </>
  );
}

function Companies() {
  const [list, reload] = useLoad('/admin/users?role=company');
  const [filter, setFilter] = useState('pending');
  if (!list) return <Loading />;
  const count = (st) => list.filter((u) => u.status === st).length;
  const shown = list.filter((u) => filter === 'all' || (filter === 'other' ? ['rejected', 'suspended'].includes(u.status) : u.status === filter));
  const setStatus = (u, status, ok) => run(async () => { await api(`/admin/users/${u._id}/status`, 'POST', { status }); reload(); }, ok);
  return (
    <>
      <Seg value={filter} onChange={setFilter} items={[
        { key: 'pending', label: `Pending (${count('pending')})` }, { key: 'active', label: `Approved (${count('active')})` },
        { key: 'other', label: `Rejected/Suspended (${count('rejected') + count('suspended')})` }, { key: 'all', label: `All (${list.length})` },
      ]} />
      {!shown.length && <Empty text="No companies here." />}
      {shown.map((u) => (
        <Card key={u._id}>
          <Row><Text style={s.title}>{u.companyName}</Text><Chip tone={u.status === 'active' ? 'ok' : u.status === 'pending' ? 'money' : 'bad'} text={u.status === 'active' ? 'approved' : u.status} /></Row>
          <Text style={s.mute}>{u.name} · {u.email} · {u.phone}</Text>
          <Text style={s.mute}>{u.industry} · {u.city}</Text>
          <Text style={s.mute}>{u.website}{u.licenseNo ? ` · Licence ${u.licenseNo}` : ''}</Text>
          {u.status === 'pending' && <><Btn title="Approve company" onPress={() => setStatus(u, 'active', `${u.companyName} approved`)} /><Btn kind="warn" title="Reject" onPress={() => setStatus(u, 'rejected', 'Company rejected')} /></>}
          {u.status === 'active' && <Btn kind="warn" title="Suspend" onPress={() => setStatus(u, 'suspended', 'Company suspended')} />}
          {['rejected', 'suspended'].includes(u.status) && <Btn title="Approve / restore" onPress={() => setStatus(u, 'active', `${u.companyName} approved`)} />}
        </Card>
      ))}
    </>
  );
}

function Students() {
  const [list, reload] = useLoad('/admin/users?role=student');
  if (!list) return <Loading />;
  if (!list.length) return <Empty text="No students have signed up yet." />;
  const setStatus = (u, status, ok) => run(async () => { await api(`/admin/users/${u._id}/status`, 'POST', { status }); reload(); }, ok);
  return (
    <>
      <Text style={s.mute}>{list.length} students</Text>
      {list.map((u) => (
        <Card key={u._id}>
          <Row><Text style={s.title}>{u.name}</Text><Chip tone="ok" text={u.level} />{u.status === 'suspended' && <Chip tone="bad" text="suspended" />}</Row>
          <Text style={s.mute}>{u.university} · {u.department} · year {u.year} · ID {u.studentId}</Text>
          <Text style={s.mute}>{u.email} · {u.phone} · {u.hoursPerWeek} h/week</Text>
          <Row>{(u.skills || []).map((k) => <Chip key={k.name} tone={k.status === 'scored' && k.score >= 70 ? 'ok' : undefined} text={k.status === 'scored' ? `${k.name} ${k.score}/100 ${stars(k.rating)}` : `${k.name}: ${k.status}`} />)}</Row>
          <Text style={s.mute}>Completed jobs: {u.completed}</Text>
          {u.status === 'suspended'
            ? <Btn kind="ghost" title="Restore" onPress={() => setStatus(u, 'active', 'Restored')} />
            : <Btn kind="warn" title="Suspend" onPress={() => setStatus(u, 'suspended', 'Suspended')} />}
        </Card>
      ))}
    </>
  );
}

function ArrangeBox({ k, reload }) {
  const [prompt, setPrompt] = useState(suggest(k.name));
  return (
    <Card>
      <Text style={s.title}>{k.name}</Text>
      <Text style={s.mute}>{k.student && k.student.name} · {k.student && k.student.university}</Text>
      <Field multiline value={prompt} onChangeText={setPrompt} />
      <Btn title="Send test to student" onPress={() => run(async () => { await api(`/admin/skills/${k._id}/arrange`, 'POST', { prompt }); reload(); }, 'Test sent')} />
    </Card>
  );
}

function ScoreBox({ k, reload }) {
  const [score, setScore] = useState('');
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  return (
    <Card>
      <Text style={s.title}>{k.name} · {k.student && k.student.name}</Text>
      <Text style={s.mute}>Test: {k.prompt}</Text>
      <Text style={s.body}>{k.answer}</Text>
      <Field placeholder="Score 0-100 (70 passes)" keyboardType="numeric" value={score} onChangeText={setScore} />
      <Text style={s.label}>Rating</Text>
      <Row>{[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} onPress={() => setRating(n)} style={[s.tab, rating === n && s.tabOn]}><Text style={[s.tabText, rating === n && { color: C.white }]}>{n} ★</Text></TouchableOpacity>)}</Row>
      <Field placeholder="Short feedback for the student" value={feedback} onChangeText={setFeedback} />
      <Btn title="Save score and rating" onPress={() => run(async () => { await api(`/admin/skills/${k._id}/score`, 'POST', { score, rating, feedback }); reload(); }, 'Saved')} />
    </Card>
  );
}

function SkillTests() {
  const [d, reload] = useLoad('/admin/skills', {});
  if (!d) return <Loading />;
  const req = d.requested || [];
  const sub = d.submitted || [];
  return (
    <>
      <H>Arrange tests ({req.length})</H>
      {!req.length && <Text style={s.mute}>No skills are waiting for a test.</Text>}
      {req.map((k) => <ArrangeBox key={k._id} k={k} reload={reload} />)}
      <H>Score answers ({sub.length})</H>
      {!sub.length && <Text style={s.mute}>No answers are waiting to be scored.</Text>}
      {sub.map((k) => <ScoreBox key={k._id} k={k} reload={reload} />)}
    </>
  );
}

function Jobs() {
  const [list, reload] = useLoad('/admin/tasks');
  if (!list) return <Loading />;
  const act = (t, action, ok) => run(async () => { await api(`/admin/tasks/${t._id}/${action}`, 'POST', {}); reload(); }, ok);
  const by = (st) => list.filter((t) => t.status === st);
  const co = (t) => (t.company && t.company.companyName) || '';
  const rest = list.filter((t) => !['pending', 'assigned', 'accepted'].includes(t.status));
  return (
    <>
      <H>To publish ({by('pending').length})</H>
      {by('pending').map((t) => (
        <Card key={t._id}><Text style={s.title}>{t.title}</Text><Text style={s.mute}>{co(t)} · {t.skill} · {money(t.budget)}</Text><Text style={s.body}>{t.description}</Text>
          <Btn title="Publish job" onPress={() => act(t, 'approve', 'Job published')} /><Btn kind="warn" title="Reject" onPress={() => act(t, 'reject', 'Job rejected')} /></Card>
      ))}
      <H>Confirm company payment ({by('assigned').length})</H>
      {by('assigned').map((t) => (
        <Card key={t._id}><Text style={s.title}>{t.title}</Text>
          <Text style={s.mute}>{co(t)} pays {money(t.budget)} · student {t.student && t.student.name} · {t.studentAcceptedAt ? 'terms accepted' : 'student has not accepted terms yet'}</Text>
          <Btn title="Payment received, start work" onPress={() => act(t, 'fund', 'Work can start')} /></Card>
      ))}
      <H>Pay students ({by('accepted').length})</H>
      {by('accepted').map((t) => (
        <Card key={t._id}><Text style={s.title}>{t.title}</Text>
          <Text style={s.mute}>Send {money(t.payout)} to {t.student && t.student.name} (platform keeps {money(t.fee)})</Text>
          <Btn title="Mark as paid" onPress={() => act(t, 'pay', 'Marked as paid')} /></Card>
      ))}
      <H>All other jobs ({rest.length})</H>
      {rest.map((t) => (
        <Card key={t._id}><Text style={s.title}>{t.title}</Text><Row><Chip text={t.status} /><Chip text={co(t)} />{t.student && <Chip text={t.student.name} />}</Row></Card>
      ))}
    </>
  );
}

function Admin() {
  const [tab, setTab] = useState('Overview');
  return (
    <>
      <Tabs items={['Overview', 'Companies', 'Students', 'Skill tests', 'Jobs']} tab={tab} setTab={setTab} />
      {tab === 'Overview' && <Overview go={setTab} />}
      {tab === 'Companies' && <Companies />}
      {tab === 'Students' && <Students />}
      {tab === 'Skill tests' && <SkillTests />}
      {tab === 'Jobs' && <Jobs />}
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [stack, setStack] = useState([]); // open screens on top of the dashboard
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('');
  notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  const push = (screen) => setStack((st) => [...st, screen]);
  const pop = () => setStack((st) => st.slice(0, -1));
  const canBack = user ? stack.length > 0 : !!role;
  const back = () => { if (user) pop(); else setRole(null); };

  useEffect(() => {
    const saved = store && store.getItem('sip_token');
    if (!saved) { setReady(true); return; }
    TOKEN = saved;
    api('/me').then(setUser).catch(() => { TOKEN = null; store.removeItem('sip_token'); }).finally(() => setReady(true));
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

  const logout = () => { TOKEN = null; if (store) store.removeItem('sip_token'); setUser(null); setRole(null); setStack([]); };
  const top = stack[stack.length - 1];

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <View style={s.header}>
        <View style={s.headerLeft}>
          {canBack && <TouchableOpacity onPress={back}><Text style={s.backText}>‹ Back</Text></TouchableOpacity>}
          <Text style={s.brand}>Student Income Platform</Text>
        </View>
        {user && <TouchableOpacity onPress={logout}><Text style={s.logout}>Log out</Text></TouchableOpacity>}
      </View>
      {msg ? <View style={s.toast}><Text style={s.toastText}>{msg}</Text></View> : null}
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.col}>
          {!ready && <Loading />}
          {ready && !user && !role && <Welcome onPick={setRole} />}
          {ready && !user && role && <Auth key={role} role={role} onAuth={setUser} />}
          {user && top && top.name === 'task' && <TaskDetail key={top.id} id={top.id} user={user} />}
          {user && top && top.name === 'post' && <PostJob user={user} done={pop} />}
          {user && !top && user.role === 'student' && <Student user={user} open={(id) => push({ name: 'task', id })} />}
          {user && !top && user.role === 'company' && <Company user={user} open={(id) => push({ name: 'task', id })} />}
          {user && !top && user.role === 'admin' && <Admin />}
        </View>
      </ScrollView>
      {user && user.role === 'company' && !top && (
        <TouchableOpacity style={s.fab} onPress={() => push({ name: 'post' })}><Text style={s.fabText}>+</Text></TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.jadeDark, paddingTop: Platform.OS === 'web' ? 14 : 48, paddingBottom: 14, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  brand: { color: C.white, fontSize: 18, fontWeight: '700' },
  backText: { color: '#BFE6DC', fontSize: 16, fontWeight: '700' },
  logout: { color: '#BFE6DC', fontSize: 14 },
  scroll: { alignItems: 'center', padding: 14, paddingBottom: 100 },
  col: { width: '100%', maxWidth: 720 },
  card: { backgroundColor: C.white, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 8 },
  roleCard: { backgroundColor: C.white, borderRadius: 10, padding: 18, marginTop: 12, borderWidth: 1, borderColor: C.line, borderLeftWidth: 5, borderLeftColor: C.jade },
  roleTitle: { fontSize: 18, fontWeight: '700', color: C.jadeDark },
  h1: { fontSize: 22, fontWeight: '700', color: C.ink, marginBottom: 10 },
  h2: { fontSize: 16, fontWeight: '700', color: C.jadeDark, marginTop: 14, marginBottom: 8 },
  big: { fontSize: 28, fontWeight: '800', color: C.jadeDark, minWidth: 44 },
  title: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 4 },
  body: { fontSize: 14, color: C.ink, lineHeight: 20, marginVertical: 4 },
  mute: { fontSize: 13, color: C.mute, marginVertical: 4 },
  empty: { textAlign: 'center', color: C.mute, marginTop: 30, fontSize: 15 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 10, fontSize: 15, color: C.ink, backgroundColor: '#FBFCFB', marginVertical: 5 },
  btn: { backgroundColor: C.jade, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', marginVertical: 5 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.jade },
  btnWarn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.red },
  btnText: { color: C.white, fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginVertical: 4 },
  chip: { backgroundColor: '#DDEFE9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 12, color: C.ink, fontWeight: '600' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: C.jade },
  tabOn: { backgroundColor: C.jade },
  tabText: { color: C.jade, fontWeight: '600', fontSize: 14 },
  toast: { backgroundColor: C.ink, paddingVertical: 10, paddingHorizontal: 16 },
  toastText: { color: C.white, textAlign: 'center', fontSize: 14 },
  fab: { position: 'absolute', right: 22, bottom: 26, width: 60, height: 60, borderRadius: 30, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabText: { fontSize: 34, color: C.ink, marginTop: -3, fontWeight: '600' },
});