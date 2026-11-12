import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { C, FONT } from '../theme';
import { H1, Title, Body, Small, Card, Tap, Btn, Field, Chip, StatusChip, Row, Avatar, Empty, Loading, Tabs, Section, Stat, Banner, FadeIn, useTabDir, Glow, Wave, Heart } from '../components/ui';
import { run, api, useLoad, money, day, stars, daysLeft } from '../api';
import { Inbox, useUnread } from './Chat';
import { Wallet } from './Money';

function StudentJobs({ open, goSkills }) {
  const [tasks] = useLoad('/tasks');
  const [saved, setSaved] = useState({});
  if (!tasks) return <Loading />;
  if (!tasks.length) return <Empty icon="🔍" title="No open jobs right now" text="New jobs are published regularly. Check back soon." />;
  return tasks.map((t, i) => {
    const left = daysLeft(t.deadline);
    return (
      <Tap key={t._id} delay={i * 90} onPress={() => open(t._id)} label={t.title}>
        <Row between style={{ marginTop: 0 }}>
          <Chip tone="brand" text={t.skill} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: C.green, fontWeight: '800', fontSize: 16 }}>{money(t.payout)}</Text>
            <Heart on={!!saved[t._id]} onChange={(v) => setSaved((p) => ({ ...p, [t._id]: v }))} />
          </View>
        </Row>
        <Title>{t.title}</Title>
        <Small style={{ marginTop: 2 }}>{t.company && (t.company.companyName || t.company.name)} · due {day(t.deadline)}{left >= 0 ? ` (${left}d left)` : ''}</Small>
        <Body numberOfLines={2} style={{ marginTop: 6 }}>{t.description}</Body>
        <Row style={{ marginBottom: 0 }}>
          <Chip text={`${t.commentCount} comment${t.commentCount === 1 ? '' : 's'}`} />
          {t.canComment ? <Chip tone="green" text="You can apply" /> : <Chip tone="gold" text={`Needs ${t.skill} verification`} />}
        </Row>
      </Tap>
    );
  });
}

const SUGGESTIONS = [
  ['writ', 'Write 5 product descriptions (50-70 words each) for an online clothing store.'],
  ['data', 'Explain step by step how you would clean a spreadsheet with duplicate rows, mixed date formats and blank cells. Name the formulas or tools you would use.'],
  ['excel', 'Explain step by step how you would clean a spreadsheet with duplicate rows, mixed date formats and blank cells. Name the formulas or tools you would use.'],
  ['research', 'List 10 Bangladeshi online clothing shops. For each give the name, website and one source link.'],
  ['design', 'Design 3 social media posts for a clothing sale. Share links to the images and explain your colour and font choices.'],
  ['video', 'Describe how you would edit a 30-second captioned product video and share a link to a sample of your work.'],
];
export const suggest = (name) => {
  const k = String(name || '').toLowerCase();
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
        <Title>Add a skill</Title>
        <Small style={{ marginTop: 2 }}>AI prepares a short test for each skill, different for every student, and scores it right after you submit. Score 70 or more to get verified and apply to jobs in that skill.</Small>
        <Field placeholder="For example, Content Writing" value={name} onChangeText={setName} />
        <Btn title="Add skill" onPress={() => run(async () => { await api('/skills', 'POST', { name }); setName(''); reload(); }, 'Skill added. Your test is ready if it appears below.')} />
      </Card>

      {!skills.length && <Empty icon="✦" title="No skills yet" text="Add your first skill above to start getting verified." />}

      {skills.map((k) => {
        const passed = k.status === 'scored' && k.score >= 70;
        return (
          <Card key={k._id} accent={passed ? 'green' : k.status === 'ready' ? 'gold' : undefined}>
            <Row between style={{ marginTop: 0 }}>
              <Title>{k.name}</Title>
              {k.status === 'requested' && <Chip text="No test yet" />}
              {k.status === 'ready' && <Chip tone="gold" text="Test ready" />}
              {k.status === 'submitted' && <Chip tone="blue" text="Being scored" />}
              {k.status === 'scored' && <Chip tone={passed ? 'green' : 'red'} text={passed ? '✓ Verified' : 'Not passed'} />}
            </Row>
            {k.status === 'requested' && (
              <>
                <Small>Press the button and AI will write a test for this skill. If AI is off, an admin will send it.</Small>
                <Btn title="Generate my test" onPress={() => call(`/skills/${k._id}/generate`, 'POST', {}, 'Your test is ready')} />
              </>
            )}
            {k.status === 'ready' && (
              <>
                <Body style={{ backgroundColor: C.bg, padding: 12, borderRadius: 8, marginTop: 6 }}>{k.prompt}</Body>
                <Field multiline placeholder="Write your answer or paste links to your work" value={ans[k._id] || ''} onChangeText={(x) => setAns({ ...ans, [k._id]: x })} />
                <Btn title="Submit test" onPress={() => call(`/skills/${k._id}/submit`, 'POST', { answer: ans[k._id] }, 'Test submitted')} />
              </>
            )}
            {k.status === 'scored' && (
              <>
                <Body style={{ fontWeight: '700' }}>Score {k.score}/100 <Text style={{ color: C.gold }}>{stars(k.rating)}</Text></Body>
                {k.feedback ? <Body style={{ backgroundColor: C.bg, padding: 10, borderRadius: 8, marginTop: 4 }}>Feedback: {k.feedback}</Body> : null}
                {k.score < 70 && <Btn kind="ghost" title="Request a retest" onPress={() => call(`/skills/${k._id}/retest`, 'POST', {}, 'New test requested')} />}
              </>
            )}
            {k.status !== 'submitted' && <Btn small full={false} kind="warn" title="Remove skill" onPress={() => call(`/skills/${k._id}`, 'DELETE', undefined, 'Skill removed')} />}
          </Card>
        );
      })}
    </>
  );
}

function StudentWork({ open }) {
  const [tasks] = useLoad('/tasks/mine');
  if (!tasks) return <Loading />;
  if (!tasks.length) return <Empty icon="💼" title="Nothing here yet" text="Jobs you comment on will show up here so you can follow their progress." />;
  return tasks.map((t) => (
    <Tap key={t._id} onPress={() => open(t._id)} label={t.title}>
      <Row between style={{ marginTop: 0 }}>
        <StatusChip status={t.assignedToMe ? t.status : 'applied'} />
        <Text style={{ color: C.green, fontWeight: '800' }}>{money(t.payout)}</Text>
      </Row>
      <Title>{t.title}</Title>
    </Tap>
  ));
}

export function Student({ user, open, chat }) {
  const [tab, setTab] = useState('Jobs');
  const tdir = useTabDir(['Jobs', 'My skills', 'My work', 'Messages', 'Earnings'], tab);
  const unread = useUnread();
  const verified = user.verifiedSkills || [];
  return (
    <>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Banner />
        <View style={{ padding: 20, paddingTop: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -32 }}>
          <Glow size={72}><View style={{ borderWidth: 4, borderColor: C.surface, borderRadius: 40 }}><Avatar name={user.name} size={64} /></View></Glow>
          <View style={{ paddingBottom: 6 }}><Chip tone="brand" text={user.level} /></View>
        </View>
        <Row style={{ marginTop: 10, marginBottom: 0 }}><Small style={{ fontWeight: '700', color: C.brand }}>Welcome back</Small><Wave /></Row>
        <H1 style={{ fontSize: 22, lineHeight: 28 }}>{user.name}</H1>
        <Small style={{ marginTop: 2 }}>{user.university} · {user.department}</Small>
        {verified.length > 0 ? (
          <Row>{verified.map((v) => <Chip key={v.skill} tone="green" text={`✓ ${v.skill} ${v.score}/100`} />)}</Row>
        ) : (
          <View style={{ backgroundColor: C.goldSoft, padding: 12, borderRadius: 10, marginTop: 14 }}>
            <Body style={{ color: C.goldText, fontSize: 14 }}>You’re not verified yet. Open <Text style={{ fontWeight: '700' }}>My skills</Text> and take your tests to start applying.</Body>
          </View>
        )}
        </View>
      </Card>
      <Tabs items={['Jobs', 'My skills', 'My work', 'Messages', 'Earnings']} tab={tab} setTab={setTab} badges={{ Messages: unread }} />
      <FadeIn key={tab} from={tdir} dist={14} dur={360}>
        {tab === 'Jobs' && <StudentJobs open={open} />}
        {tab === 'My skills' && <MySkills />}
        {tab === 'My work' && <StudentWork open={open} />}
        {tab === 'Messages' && <Inbox open={chat} />}
        {tab === 'Earnings' && <Wallet user={user} />}
      </FadeIn>
    </>
  );
}