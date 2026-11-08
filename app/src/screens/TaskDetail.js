import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, T, FONT } from '../theme';
import { H1, H2, Title, Body, Small, Card, Btn, Field, Chip, StatusChip, Row, Avatar, Empty, Loading, Progress, Section, Divider, CheckPop, Confetti } from '../components/ui';
import { api, run, useLoad, money, day, when, stars, norm, daysLeft } from '../api';
import { PayBox, TxnRow } from './Money';

const font = FONT ? { fontFamily: FONT } : null;

const Fact = ({ label, value, tone }) => (
  <View style={{ flexGrow: 1, flexBasis: 96, paddingVertical: 4 }}>
    <Small>{label}</Small>
    <Text style={[T.title, font, tone && { color: tone }]}>{value}</Text>
  </View>
);

/* A call-out card for "what happens next", so people always know their next step. */
const Next = ({ title, children, tone = 'brand' }) => (
  <Card accent={tone}>
    {title ? <Title>{title}</Title> : null}
    {children}
  </Card>
);

export function TaskDetail({ id, user, chat }) {
  const [t, reload] = useLoad(`/tasks/${id}`, { error: true });
  const [text, setText] = useState('');
  const [work, setWork] = useState('');
  const [note, setNote] = useState('');
  if (!t) return <Loading rows={2} />;
  if (t.error) return <Empty icon="!" title="Could not open this job" text="It may have been removed. Go back and try another job." />;

  const me = t.me;
  const act = (path, body, ok) => run(async () => { await api(`/tasks/${id}/${path}`, 'POST', body); reload(); }, ok);
  const comment = () => run(async () => {
    if (!text.trim()) throw new Error('Write a comment first');
    await api(`/tasks/${id}/comments`, 'POST', { text }); setText(''); reload();
  }, 'Comment posted');
  const who = t.company && (t.company.companyName || t.company.name);
  const left = daysLeft(t.deadline);

  return (
    <>
      <Card style={{ padding: 20 }}>
        <Row style={{ marginTop: 0 }}>
          <StatusChip status={t.status} />
          <Chip tone="brand" text={t.skill} />
        </Row>
        <H1 style={{ marginTop: 4 }}>{t.title}</H1>
        <Small style={{ marginTop: 4 }}>Posted by {who}</Small>
        <Divider />
        <Row style={{ alignItems: 'flex-start', gap: 8 }}>
          {me.isOwner
            ? <Fact label="Budget" value={money(t.budget)} />
            : <Fact label="You earn" value={money(t.payout)} tone={C.green} />}
          <Fact label="Deadline" value={day(t.deadline)} />
          <Fact label="Revisions" value={`${t.revisions} round${t.revisions === 1 ? '' : 's'}`} />
        </Row>
        {t.status === 'open' && left >= 0 && <Small>{left === 0 ? 'Due today' : `${left} day${left === 1 ? '' : 's'} left`}</Small>}
        <Divider />
        <Title>About this job</Title>
        <Body style={{ marginTop: 4 }}>{t.description}</Body>
        <Progress status={t.status} />
      </Card>

      {me.canChat && chat && (
        <Card accent="blue">
          <Row between style={{ marginTop: 0, marginBottom: 0 }}>
            <View style={{ flex: 1 }}>
              <Title>Chat</Title>
              <Small>{me.isOwner ? `Talk with ${t.student && t.student.name} about this job.` : `Talk with ${who} about this job.`}</Small>
            </View>
            <Btn small full={false} title={me.isOwner || me.isAssigned ? 'Open chat' : 'View chat'} onPress={() => chat(id)} />
          </Row>
        </Card>
      )}

      {/* student workflow */}
      {me.isAssigned && t.status === 'assigned' && !t.studentAcceptedAt && (
        <Next title="You were chosen for this job" tone="gold">
          <Body>Deliver “{t.title}” by {day(t.deadline)} with {t.revisions} revision round for {money(t.payout)}.</Body>
          <Btn title="Accept terms and continue" onPress={() => act('accept-terms', {})} />
        </Next>
      )}
      {me.isAssigned && ['assigned', 'funded', 'revision', 'submitted', 'accepted'].includes(t.status) && !(user.payout && user.payout.account) && (
        <Next title="Add your payout details" tone="gold">
          <Body>Tell us where to send your {money(t.payout)}. Open <Text style={{ fontWeight: '700' }}>Earnings</Text> from your dashboard and save your bKash, Nagad, Rocket or bank details.</Body>
        </Next>
      )}
      {me.isAssigned && t.status === 'assigned' && t.studentAcceptedAt && (
        <Next title="Terms accepted" tone="blue"><Body>We’re waiting for the company’s payment to be confirmed. You can start right after.</Body></Next>
      )}
      {me.isAssigned && ['funded', 'revision'].includes(t.status) && (
        <Next title={t.status === 'revision' ? 'Revision requested' : 'Submit your work'} tone={t.status === 'revision' ? 'gold' : 'brand'}>
          {t.status === 'revision' && <Body style={{ backgroundColor: C.goldSoft, padding: 10, borderRadius: 8, marginTop: 6 }}>{t.feedback}</Body>}
          <Field multiline placeholder="Paste your work or a link to it" value={work} onChangeText={setWork} />
          <Btn title="Submit work" onPress={() => act('submit', { text: work }, 'Work submitted')} />
        </Next>
      )}
      {me.isAssigned && t.status === 'submitted' && <Next title="Submitted" tone="blue"><Body>The company is reviewing your work. We’ll show the result here.</Body></Next>}
      {me.isAssigned && ['accepted', 'paid'].includes(t.status) && (
        <Next title={t.status === 'paid' ? 'Paid. Great work!' : 'Work accepted'} tone="green">
          {t.status === 'paid' && <Confetti />}
          <View style={{ alignSelf: 'flex-start', marginVertical: 8 }}><CheckPop size={40} /></View>
          <Body>{t.status === 'paid' ? 'Your payment has been sent. See the receipt below.' : 'An admin will send your payment soon.'}</Body>
          {t.rating && t.rating.score ? <Body style={{ color: C.gold, fontWeight: '700' }}>Company rating: {stars(t.rating.score)}</Body> : null}
        </Next>
      )}

      {/* company workflow */}
      {me.isOwner && t.status === 'pending' && <Next title="Waiting for publication" tone="gold"><Body>An admin is reviewing this job. It goes live as soon as it is approved.</Body></Next>}
      {me.isOwner && t.status === 'rejected' && <Next title="Not published" tone="red"><Body>An admin did not publish this job. Post it again with a clearer description.</Body></Next>}
      {me.isOwner && t.status === 'assigned' && !t.studentAcceptedAt && (
        <Next title={`${t.student && t.student.name} is chosen`} tone="gold">
          <Body>We asked {t.student && t.student.name} to accept the terms. You can pay as soon as they do.</Body>
        </Next>
      )}
      {me.isOwner && t.status === 'assigned' && t.studentAcceptedAt && <PayBox t={t} reload={reload} />}
      {me.isOwner && ['funded', 'revision'].includes(t.status) && (
        <Next title="Payment confirmed. Work in progress" tone="blue"><View style={{ alignSelf: 'flex-start', marginVertical: 8 }}><CheckPop size={36} tone="blue" /></View><Body>Your payment is confirmed and held safely. {t.student && t.student.name} is working on it.</Body></Next>
      )}
      {me.isOwner && t.status === 'accepted' && (
        <Next title="Work accepted" tone="green"><Body>An admin will now send {money(t.payout)} to {t.student && t.student.name}. Thank you!</Body></Next>
      )}
      {me.isOwner && t.status === 'submitted' && (
        <Next title="Review the submitted work">
          <Body style={{ backgroundColor: C.bg, padding: 12, borderRadius: 8, marginTop: 6 }}>{t.submission && t.submission.text}</Body>
          <Btn title="Accept work" onPress={() => act('review', { action: 'accept' }, 'Work accepted')} />
          <Divider />
          <Field label="Need changes?" placeholder="What should change? (one revision allowed)" value={note} onChangeText={setNote} />
          <Btn kind="ghost" title="Request revision" onPress={() => act('review', { action: 'revise', comment: note }, 'Revision requested')} />
        </Next>
      )}
      {me.isOwner && ['accepted', 'paid'].includes(t.status) && !(t.rating && t.rating.score) && (
        <Next title={`How was ${t.student && t.student.name}?`} tone="gold">
          <Small>Your rating helps other companies.</Small>
          <Row>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={{ flex: 1, minWidth: 52 }}><Btn small kind="ghost" title={`${n} ★`} onPress={() => act('rate', { score: n }, 'Thanks for rating')} /></View>
            ))}
          </Row>
        </Next>
      )}

      {t.txns && t.txns.length > 0 && (
        <Section title={me.isOwner ? 'Your payments' : 'Payment receipt'} count={t.txns.length}>
          {t.txns.map((x) => <TxnRow key={x._id} x={x} />)}
        </Section>
      )}

      {/* comments */}
      <Section title="Comments" count={t.comments.length}>
        {!t.comments.length && <Card><Body>No comments yet. {me.canComment ? 'Be the first to say why you’re a good fit.' : ''}</Body></Card>}
        {t.comments.map((c) => {
          const u = c.user;
          if (!u) return null;
          const isStudent = u.role === 'student';
          const verified = isStudent && (u.verifiedSkills || []).some((x) => norm(x.skill) === t.skillKey);
          const chosen = t.student && String(t.student._id) === String(u._id);
          return (
            <Card key={c._id} accent={chosen ? 'gold' : undefined}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Avatar name={u.name} tone={isStudent ? 'brand' : 'blue'} />
                <View style={{ flex: 1 }}>
                  <Row style={{ marginVertical: 0 }}>
                    <Title>{u.name}</Title>
                    <Chip tone={isStudent ? 'grey' : 'blue'} text={isStudent ? u.level : 'Company'} />
                    {verified && <Chip tone="green" text={`✓ Verified in ${t.skill}`} />}
                    {chosen && <Chip tone="gold" text="Chosen" />}
                  </Row>
                  <Small>{when(c.at)}</Small>
                </View>
              </View>
              <Body style={{ marginTop: 10 }}>{c.text}</Body>
              {me.isOwner && t.status === 'open' && isStudent && <Btn small full={false} title={`Choose ${u.name}`} onPress={() => act('select', { studentId: u._id }, `${u.name} chosen`)} />}
            </Card>
          );
        })}
        {me.canComment ? (
          <Card>
            <Field multiline label={me.isOwner ? 'Reply to applicants' : 'Apply with a comment'} placeholder={me.isOwner ? 'Ask a question or reply to applicants' : 'Tell the company why you can do this job'} value={text} onChangeText={setText} />
            <Btn title="Post comment" onPress={comment} />
          </Card>
        ) : user.role === 'student' && t.status === 'open' ? (
          <Card accent="gold">
            <Title>Get verified to apply</Title>
            <Body>To comment on this job you need to be verified in “{t.skill}”. Add it under My skills and pass the test.</Body>
          </Card>
        ) : null}
      </Section>
    </>
  );
}
