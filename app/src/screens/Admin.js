import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, FONT } from '../theme';
import { H1, Title, Body, Small, Card, Tap, Btn, Field, Chip, StatusChip, Row, Avatar, Empty, Loading, Tabs, Seg, Section, Stat, FadeIn } from '../components/ui';
import { api, run, useLoad, money, stars, norm } from '../api';
import { suggest } from './Student';
import { Inbox, useUnread } from './Chat';
import { AdminPayments } from './Money';

function Overview({ go }) {
  const [o] = useLoad('/admin/overview', {});
  if (!o) return <Loading rows={2} />;
  const todo = [
    ['Companies to approve', o.pendingCompanies, 'Companies'],
    ['Skills needing a test', o.toArrange, 'Skill tests'],
    ['Tests to score', o.toScore, 'Skill tests'],
    ['Jobs to publish', o.toPublish, 'Jobs'],
    ['Payments to confirm', o.toFund, 'Payments'],
    ['Student payouts due', o.toPay, 'Payments'],
  ];
  const total = todo.reduce((a, [, n]) => a + (n || 0), 0);
  return (
    <>
      <Section title="Needs your action" count={total}>
        {total === 0 && <Card accent="green"><Title>All caught up</Title><Body>Nothing is waiting for you right now.</Body></Card>}
        <Row style={{ alignItems: 'stretch' }}>
          {todo.map(([label, n, tab]) => <Stat key={label} label={label} value={n} tone="alert" onPress={() => go(tab)} />)}
        </Row>
      </Section>
      <Section title="Platform">
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Students" value={o.students} onPress={() => go('Students')} />
          <Stat label="Approved companies" value={o.companies} onPress={() => go('Companies')} />
          <Stat label="Open jobs" value={o.openJobs} onPress={() => go('Jobs')} />
          <Stat label="Paid jobs" value={o.paidJobs} onPress={() => go('Jobs')} />
        </Row>
      </Section>
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
        { key: 'pending', label: `Pending ${count('pending')}` }, { key: 'active', label: `Approved ${count('active')}` },
        { key: 'other', label: `Rejected or suspended ${count('rejected') + count('suspended')}` }, { key: 'all', label: `All ${list.length}` },
      ]} />
      {!shown.length && <Empty icon="🏢" title="No companies here" text="Companies that match this filter will appear here." />}
      {shown.map((u) => (
        <Card key={u._id}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar name={u.companyName} tone="blue" />
            <View style={{ flex: 1 }}>
              <Title>{u.companyName}</Title>
              <Small>{u.industry} · {u.city}</Small>
            </View>
            <StatusChip status={u.status} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Small>Contact: {u.name} · {u.phone}</Small>
            <Small>{u.email}</Small>
            <Small>{u.website}{u.licenseNo ? ` · Licence ${u.licenseNo}` : ''}</Small>
          </View>
          {u.status === 'pending' && (
            <Row style={{ flexWrap: 'nowrap', marginBottom: 0 }}>
              <View style={{ flex: 1 }}><Btn title="Approve" onPress={() => setStatus(u, 'active', `${u.companyName} approved`)} /></View>
              <View style={{ flex: 1 }}><Btn kind="warn" title="Reject" onPress={() => setStatus(u, 'rejected', 'Company rejected')} /></View>
            </Row>
          )}
          {u.status === 'active' && <Btn small full={false} kind="warn" title="Suspend" onPress={() => setStatus(u, 'suspended', 'Company suspended')} />}
          {['rejected', 'suspended'].includes(u.status) && <Btn small full={false} title="Approve and restore" onPress={() => setStatus(u, 'active', `${u.companyName} approved`)} />}
        </Card>
      ))}
    </>
  );
}

function Students() {
  const [list, reload] = useLoad('/admin/users?role=student');
  const [q, setQ] = useState('');
  if (!list) return <Loading />;
  if (!list.length) return <Empty icon="🎓" title="No students yet" text="Students will appear here once they sign up." />;
  const setStatus = (u, status, ok) => run(async () => { await api(`/admin/users/${u._id}/status`, 'POST', { status }); reload(); }, ok);
  const k = norm(q);
  const shown = list.filter((u) => !k || norm(`${u.name} ${u.university} ${u.department} ${u.email} ${u.studentId}`).includes(k));
  return (
    <>
      <Field placeholder="Search by name, university, email or ID" value={q} onChangeText={setQ} style={{ marginBottom: 8 }} />
      <Small style={{ marginVertical: 8 }}>{shown.length} of {list.length} students</Small>
      {shown.map((u) => (
        <Card key={u._id}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar name={u.name} />
            <View style={{ flex: 1 }}>
              <Title>{u.name}</Title>
              <Small>{u.university} · {u.department} · year {u.year}</Small>
            </View>
            <Chip tone="brand" text={u.level} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Small>ID {u.studentId} · {u.hoursPerWeek} h/week · {u.completed} job{u.completed === 1 ? '' : 's'} completed</Small>
            <Small>{u.email} · {u.phone}</Small>
          </View>
          <Row>
            {u.status === 'suspended' && <Chip tone="red" text="Suspended" />}
            {(u.skills || []).map((s) => <Chip key={s.name} tone={s.status === 'scored' && s.score >= 70 ? 'green' : 'grey'} text={s.status === 'scored' ? `${s.name} ${s.score}/100` : `${s.name}: ${s.status}`} />)}
          </Row>
          {u.status === 'suspended'
            ? <Btn small full={false} kind="ghost" title="Restore" onPress={() => setStatus(u, 'active', 'Student restored')} />
            : <Btn small full={false} kind="warn" title="Suspend" onPress={() => setStatus(u, 'suspended', 'Student suspended')} />}
        </Card>
      ))}
    </>
  );
}

function ArrangeBox({ k, reload }) {
  const [prompt, setPrompt] = useState(suggest(k.name));
  return (
    <Card accent="gold">
      <Title>{k.name}</Title>
      <Small>{k.student && k.student.name} · {k.student && k.student.university}</Small>
      <Field label="Test for the student" multiline value={prompt} onChangeText={setPrompt} />
      <Btn title="Send test to student" onPress={() => run(async () => { await api(`/admin/skills/${k._id}/arrange`, 'POST', { prompt }); reload(); }, 'Test sent')} />
    </Card>
  );
}

function ScoreBox({ k, reload }) {
  const [score, setScore] = useState('');
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const n = Number(score);
  return (
    <Card accent="blue">
      <Title>{k.name} · {k.student && k.student.name}</Title>
      <Small style={{ marginTop: 6 }}>Test given</Small>
      <Body style={{ backgroundColor: C.bg, padding: 10, borderRadius: 8 }}>{k.prompt}</Body>
      <Small style={{ marginTop: 8 }}>Student’s answer</Small>
      <Body style={{ backgroundColor: C.bg, padding: 10, borderRadius: 8 }}>{k.answer}</Body>
      <Field label="Score" hint={score !== '' && !isNaN(n) ? (n >= 70 ? 'This will verify the student' : 'Below 70: the student can ask for a retest') : '0 to 100. 70 or more passes.'} keyboardType="numeric" value={score} onChangeText={setScore} />
      <Small style={{ marginTop: 12, color: C.ink, fontWeight: '600' }}>Rating</Small>
      <Row>
        {[1, 2, 3, 4, 5].map((r) => (
          <Pressable key={r} accessibilityRole="button" onPress={() => setRating(r)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: rating === r ? C.brand : C.lineStrong, backgroundColor: rating === r ? C.brandFill : C.surface }}>
            <Text style={{ fontWeight: '700', color: rating === r ? C.white : C.inkSoft }}>{r} ★</Text>
          </Pressable>
        ))}
      </Row>
      <Field label="Feedback" placeholder="Short feedback for the student" value={feedback} onChangeText={setFeedback} />
      <Btn title="Save score and rating" onPress={() => run(async () => {
        if (score === '' || isNaN(n) || n < 0 || n > 100) throw new Error('Enter a score from 0 to 100');
        await api(`/admin/skills/${k._id}/score`, 'POST', { score, rating, feedback }); reload();
      }, 'Score saved')} />
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
      <Section title="Arrange tests" count={req.length}>
        {!req.length && <Card><Body>No skills are waiting for a test.</Body></Card>}
        {req.map((k) => <ArrangeBox key={k._id} k={k} reload={reload} />)}
      </Section>
      <Section title="Score answers" count={sub.length}>
        {!sub.length && <Card><Body>No answers are waiting to be scored.</Body></Card>}
        {sub.map((k) => <ScoreBox key={k._id} k={k} reload={reload} />)}
      </Section>
    </>
  );
}

function Jobs({ chat }) {
  const [list, reload] = useLoad('/admin/tasks');
  if (!list) return <Loading />;
  const act = (t, action, ok) => run(async () => { await api(`/admin/tasks/${t._id}/${action}`, 'POST', {}); reload(); }, ok);
  const by = (st) => list.filter((t) => t.status === st);
  const co = (t) => (t.company && t.company.companyName) || '';
  const rest = list.filter((t) => t.status !== 'pending');
  const chatOk = ['assigned', 'funded', 'submitted', 'revision', 'accepted', 'paid'];
  return (
    <>
      <Section title="To publish" count={by('pending').length}>
        {!by('pending').length && <Card><Body>No jobs are waiting to be published.</Body></Card>}
        {by('pending').map((t) => (
          <Card key={t._id} accent="gold">
            <Title>{t.title}</Title>
            <Small>{co(t)} · {t.skill} · {money(t.budget)}</Small>
            <Body style={{ marginTop: 6 }}>{t.description}</Body>
            <Row style={{ flexWrap: 'nowrap', marginBottom: 0 }}>
              <View style={{ flex: 1 }}><Btn title="Publish job" onPress={() => act(t, 'approve', 'Job published')} /></View>
              <View style={{ flex: 1 }}><Btn kind="warn" title="Reject" onPress={() => act(t, 'reject', 'Job rejected')} /></View>
            </Row>
          </Card>
        ))}
      </Section>
      <Section title="All other jobs" count={rest.length}>
        {rest.map((t) => (
          <Card key={t._id}>
            <Row between style={{ marginTop: 0 }}><StatusChip status={t.status} /><Small>{co(t)}</Small></Row>
            <Title>{t.title}</Title>
            {t.student && <Small>Student: {t.student.name}</Small>}
            {t.student && chatOk.includes(t.status) && chat ? <Btn small full={false} kind="ghost" title="Open chat" onPress={() => chat(t._id)} /> : null}
          </Card>
        ))}
      </Section>
    </>
  );
}

export function Admin({ chat }) {
  const [tab, setTab] = useState('Overview');
  const [o] = useLoad('/admin/overview', {});
  const unread = useUnread();
  const badges = o ? {
    Companies: o.pendingCompanies,
    'Skill tests': (o.toArrange || 0) + (o.toScore || 0),
    Jobs: o.toPublish || 0,
    Payments: (o.toFund || 0) + (o.toPay || 0),
    Messages: unread,
  } : { Messages: unread };
  return (
    <>
      <Tabs items={['Overview', 'Payments', 'Jobs', 'Messages', 'Companies', 'Students', 'Skill tests']} tab={tab} setTab={setTab} badges={badges} />
      <FadeIn key={tab}>
      {tab === 'Overview' && <Overview go={setTab} />}
      {tab === 'Payments' && <AdminPayments chat={chat} />}
      {tab === 'Jobs' && <Jobs chat={chat} />}
      {tab === 'Messages' && <Inbox open={chat} />}
      {tab === 'Companies' && <Companies />}
      {tab === 'Students' && <Students />}
      {tab === 'Skill tests' && <SkillTests />}
      </FadeIn>
    </>
  );
}
