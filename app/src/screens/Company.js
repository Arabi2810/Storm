import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { C, FONT } from '../theme';
import { H1, Title, Body, Small, Card, Tap, Btn, Field, Chip, StatusChip, Row, Avatar, Empty, Loading, Section, Banner, Tabs, FadeIn, useTabDir } from '../components/ui';
import { api, run, useLoad, money } from '../api';
import { Inbox, useUnread } from './Chat';
import { Wallet } from './Money';

export function PostJob({ user, done }) {
  const [f, setF] = useState({ deadlineDays: '7' });
  const [errs, setErrs] = useState({});
  const [pop] = useLoad('/skills/popular');
  const set = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); setErrs((e) => ({ ...e, [k]: undefined })); };

  if (user.status !== 'active') {
    return <Empty icon="⏳" title="Waiting for approval" text="An admin is reviewing your company. You can post jobs as soon as you’re approved." />;
  }

  const send = () => {
    const e = {};
    if (!(f.title || '').trim()) e.title = 'Give your job a title';
    if (!(f.description || '').trim()) e.description = 'Describe what the student should deliver';
    if (!(f.skill || '').trim()) e.skill = 'Choose the skill needed';
    if (!(Number(f.budget) >= 300)) e.budget = 'The minimum budget is ৳300';
    if (!(Number(f.deadlineDays) >= 1)) e.deadlineDays = 'Enter at least 1 day';
    setErrs(e);
    if (Object.keys(e).length) return;
    return run(async () => { await api('/tasks', 'POST', f); done(); }, 'Job sent to admin. It goes live after approval.');
  };

  const budget = Number(f.budget) || 0;
  return (
    <Card style={{ padding: 20 }}>
      <H1>Post a job</H1>
      <Small style={{ marginTop: 2 }}>Clear jobs get better applicants. An admin reviews every job before it goes live.</Small>
      <Field label="Job title" placeholder="Write 20 product descriptions" value={f.title || ''} onChangeText={set('title')} error={errs.title} />
      <Field label="Description" multiline placeholder="What exactly should the student deliver? Add quantity, format, language and rules." value={f.description || ''} onChangeText={set('description')} error={errs.description} />
      <Field label="Skill needed" placeholder="Content Writing" value={f.skill || ''} onChangeText={set('skill')} error={errs.skill} />
      {pop && pop.length > 0 && (
        <View>
          <Small style={{ marginTop: 8 }}>Popular skills</Small>
          <Row>{pop.map((k) => (
            <Pressable key={k} accessibilityRole="button" onPress={() => set('skill')(k)}>
              <Chip tone={(f.skill || '') === k ? 'brand' : 'grey'} text={k} />
            </Pressable>
          ))}</Row>
        </View>
      )}
      <Row style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <View style={{ flex: 1.3 }}><Field label="Budget (৳)" hint="Minimum ৳300" keyboardType="numeric" value={f.budget || ''} onChangeText={set('budget')} error={errs.budget} /></View>
        <View style={{ flex: 1 }}><Field label="Days to finish" keyboardType="numeric" value={f.deadlineDays || ''} onChangeText={set('deadlineDays')} error={errs.deadlineDays} /></View>
      </Row>
      {budget >= 300 && (
        <View style={{ backgroundColor: C.brandSoft, padding: 12, borderRadius: 10, marginTop: 14 }}>
          <Body style={{ color: C.brandDark, fontSize: 14 }}>You pay {money(budget)}. Payment is held until you accept the work.</Body>
        </View>
      )}
      <Btn title="Submit job for approval" onPress={send} />
    </Card>
  );
}

export function Company({ user, open, post, chat }) {
  const [tasks] = useLoad('/tasks/mine');
  const [tab, setTab] = useState('My jobs');
  const tdir = useTabDir(['My jobs', 'Messages', 'Payments'], tab);
  const unread = useUnread();
  const active = user.status === 'active';
  return (
    <>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Banner />
        <View style={{ padding: 20, paddingTop: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -32 }}>
          <View style={{ borderWidth: 4, borderColor: C.surface, borderRadius: 40 }}><Avatar name={user.companyName} size={64} tone="brand" /></View>
          <View style={{ paddingBottom: 6 }}><StatusChip status={active ? 'active' : 'pending'} label={active ? 'Approved' : 'Waiting for approval'} /></View>
        </View>
        <H1 style={{ fontSize: 22, lineHeight: 28, marginTop: 10 }}>{user.companyName}</H1>
        <Small style={{ marginTop: 2 }}>{user.industry} · {user.city}</Small>
        {active
          ? <Btn pulse title="Post a new job" icon="+" onPress={post} />
          : <Body style={{ marginTop: 12 }}>An admin is verifying your company. This page updates by itself once you’re approved.</Body>}
        </View>
      </Card>

      {active && <Tabs items={['My jobs', 'Messages', 'Payments']} tab={tab} setTab={setTab} badges={{ Messages: unread }} />}
      <FadeIn key={tab} from={tdir} dist={14} dur={360}>
      {tab === 'Messages' && active && <Inbox open={chat} />}
      {tab === 'Payments' && active && <Wallet user={user} />}
      {(tab === 'My jobs' || !active) && (
      <Section title="My jobs" count={tasks ? tasks.length : undefined}>
        {!tasks ? <Loading /> : !tasks.length ? (
          <Empty icon="📝" title="No jobs yet" text="Post your first job and verified students will start commenting." />
        ) : tasks.map((t) => (
          <Tap key={t._id} onPress={() => open(t._id)} label={t.title}>
            <Row between style={{ marginTop: 0 }}>
              <StatusChip status={t.status} />
              <Text style={{ fontWeight: '800', color: C.ink }}>{money(t.budget)}</Text>
            </Row>
            <Title>{t.title}</Title>
            <Row style={{ marginBottom: 0 }}>
              <Chip text={`${t.commentCount} comment${t.commentCount === 1 ? '' : 's'}`} />
              {t.status === 'open' && t.commentCount > 0 && <Chip tone="green" text="Choose a student" />}
              {t.status === 'submitted' && <Chip tone="gold" text="Review the work" />}
            </Row>
          </Tap>
        ))}
      </Section>
      )}
      </FadeIn>
    </>
  );
}