import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { C, R, FONT, sheet } from '../theme';
import { Title, Body, Small, Card, Btn, Field, Chip, Row, Empty, Loading, Seg, Section, FadeIn, CountUp } from '../components/ui';
import { api, run, useLoad, money, when, methodLabel, METHODS } from '../api';

const font = FONT ? { fontFamily: FONT } : null;
const methodItems = (keys) => keys.map((k) => ({ key: k, label: METHODS[k] }));
const ALL = Object.keys(METHODS);
const acctLabel = (m) => (m === 'bank' ? 'Bank account number' : `${methodLabel(m)} number`);

/* One money movement, written the same way for company, student and admin. */
export function TxnRow({ x, who }) {
  const isDep = x.type === 'deposit';
  const tone = x.status === 'confirmed' ? 'green' : x.status === 'rejected' ? 'red' : 'gold';
  const label = x.status === 'confirmed' ? (isDep ? 'Confirmed' : 'Paid') : x.status === 'rejected' ? 'Rejected' : 'Being checked';
  return (
    <Card accent={tone}>
      <Row between style={{ marginTop: 0, marginBottom: 2 }}>
        <Title>{isDep ? 'Payment to platform' : 'Payout to student'}</Title>
        <Text style={[font, { fontWeight: '800', fontSize: 16, color: isDep ? C.ink : C.green }]}>{isDep ? '' : '+'}{money(x.amount)}</Text>
      </Row>
      {who ? <Small>{who}</Small> : null}
      {x.task && x.task.title ? <Small numberOfLines={1}>{x.task.title}</Small> : null}
      <Small style={{ marginTop: 4 }}>{methodLabel(x.method)} · {x.account} · TrxID <Text style={{ fontWeight: '700', color: C.inkSoft }}>{x.trxId}</Text></Small>
      {x.type === 'payout' && x.fee != null ? <Small>Job budget {money(x.gross)}, platform fee {money(x.fee)}</Small> : null}
      <Row between style={{ marginBottom: 0 }}>
        <Chip tone={tone} text={label} />
        <Small>{when(x.reviewedAt || x.createdAt)}</Small>
      </Row>
      {x.status === 'rejected' && x.reason ? <Body style={{ color: C.red, marginTop: 6, fontSize: 14 }}>Reason: {x.reason}</Body> : null}
    </Card>
  );
}

const Box = ({ label, value, tone }) => (
  <View style={st.box}>
    <Text style={[font, { fontSize: 22, lineHeight: 28, fontWeight: '800', color: tone || C.ink }]}><CountUp value={value} format={money} /></Text>
    <Small style={{ marginTop: 2 }}>{label}</Small>
  </View>
);

/* ---------- Company: pay for a chosen student (shown inside the job) ---------- */
export function PayBox({ t, reload }) {
  const [info] = useLoad('/payment-info');
  const [method, setMethod] = useState('bkash');
  const [account, setAccount] = useState('');
  const [trxId, setTrxId] = useState('');
  const deposits = (t.txns || []).filter((x) => x.type === 'deposit');
  const last = deposits[deposits.length - 1];

  if (t.paymentState === 'review' && last) {
    return (
      <Card accent="blue">
        <Title>Payment is being checked</Title>
        <Body>We received your {methodLabel(last.method)} payment details (TrxID {last.trxId}) for {money(last.amount)}. An admin will confirm it soon and work will start right after.</Body>
      </Card>
    );
  }

  const avail = info && info.length ? info.map((i) => i.method) : ALL;
  const m = avail.includes(method) ? method : avail[0];
  const target = (info || []).find((i) => i.method === m);
  const rejected = t.paymentState === 'rejected' ? [...deposits].reverse().find((x) => x.status === 'rejected') : null;

  return (
    <Card accent="gold">
      <Title>{t.student && t.student.name} accepted. Pay {money(t.budget)} to start</Title>
      <Body style={{ marginTop: 2 }}>The platform holds your money safely and only pays the student after you accept the work.</Body>
      {rejected ? <Body style={{ backgroundColor: C.redSoft, color: C.redText, padding: 10, borderRadius: 8, marginTop: 8, fontSize: 14 }}>Your last payment was not accepted: {rejected.reason}. Please check and send the details again.</Body> : null}

      <Small style={{ marginTop: 14, fontWeight: '700', color: C.ink }}>1. Send {money(t.budget)} from your phone or bank</Small>
      <Seg value={m} onChange={setMethod} items={methodItems(avail)} />
      <View style={st.target}>
        {target
          ? <><Small>{target.label}</Small><Text selectable style={[font, { color: C.brandDark, fontSize: 20, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 }]}>{target.number}</Text></>
          : <Body style={{ color: C.brandDark, fontSize: 14 }}>{info ? 'The platform has not set up this payment method yet. Please contact support.' : 'Loading payment details…'}</Body>}
      </View>

      <Small style={{ marginTop: 14, fontWeight: '700', color: C.ink }}>2. Tell us what you sent</Small>
      <Field label={`Your ${acctLabel(m).toLowerCase()} (the one you sent from)`} placeholder={m === 'bank' ? 'Account number' : '01712345678'} keyboardType={m === 'bank' ? 'default' : 'phone-pad'} value={account} onChangeText={setAccount} />
      <Field label="Transaction ID (TrxID)" placeholder="For example 9AB3KD7XQ2" autoCapitalize="characters" value={trxId} onChangeText={setTrxId} hint="You get it in the confirmation message from your provider." />
      <Btn title={`I sent ${money(t.budget)}`} onPress={() => run(async () => { await api(`/tasks/${t._id}/deposit`, 'POST', { method: m, account, trxId }); setTrxId(''); reload(); }, 'Thanks! An admin will confirm your payment.')} />
    </Card>
  );
}

/* ---------- Student: where to get paid ---------- */
function PayoutCard({ saved, onSaved }) {
  const [method, setMethod] = useState((saved && saved.method) || 'bkash');
  const [account, setAccount] = useState((saved && saved.account) || '');
  const [holder, setHolder] = useState((saved && saved.holder) || '');
  return (
    <Card accent={saved ? 'green' : 'gold'}>
      <Row between style={{ marginTop: 0 }}>
        <Title>Where should we pay you?</Title>
        {saved ? <Chip tone="green" text="✓ Saved" /> : <Chip tone="gold" text="Needed" />}
      </Row>
      <Small>After a company accepts your work, an admin sends your money here.</Small>
      <Seg value={method} onChange={setMethod} items={methodItems(ALL)} />
      <Field label={acctLabel(method)} placeholder={method === 'bank' ? 'Account number' : '01712345678'} keyboardType={method === 'bank' ? 'default' : 'phone-pad'} value={account} onChangeText={setAccount} />
      {method === 'bank' ? <Field label="Account holder name" value={holder} onChangeText={setHolder} /> : null}
      <Btn title={saved ? 'Update payout details' : 'Save payout details'} onPress={() => run(async () => { await api('/me/payout', 'PUT', { method, account, holder }); onSaved(); }, 'Payout details saved')} />
    </Card>
  );
}

/* ---------- Student "Earnings" tab and company "Payments" tab ---------- */
export function Wallet({ user }) {
  const [d, reload] = useLoad('/txns/mine', {});
  if (!d) return <Loading rows={2} />;
  if (!d.summary) return <Empty icon="!" title="Could not load payments" text="Check your connection and try again." />;
  const isCo = user.role === 'company';
  const s = d.summary;
  return (
    <>
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        {isCo ? (
          <>
            <Box label="Held for your jobs" value={s.held} tone={C.brand} />
            <Box label="Paid to students" value={s.spent} />
            <Box label="Waiting to be checked" value={s.pending} tone={s.pending ? C.gold : undefined} />
          </>
        ) : (
          <>
            <Box label="Earned" value={s.earned} tone={C.green} />
            <Box label="In progress" value={s.working} />
            <Box label="Waiting for payout" value={s.awaiting} tone={s.awaiting ? C.gold : undefined} />
          </>
        )}
      </Row>

      {!isCo ? <PayoutCard saved={d.payout} onSaved={reload} /> : null}

      <Section title={isCo ? 'Your payments' : 'Your payouts'} count={d.txns.length}>
        {!d.txns.length && (
          <Empty icon="৳" title={isCo ? 'No payments yet' : 'No payouts yet'}
            text={isCo ? 'When you choose a student, you will pay here. Money is held until you accept the work.' : 'Finish a job and get it accepted. Your payout and receipt will show up here.'} />
        )}
        {d.txns.map((x, i) => <FadeIn key={x._id} delay={Math.min(i, 8) * 70}><TxnRow x={x} /></FadeIn>)}
      </Section>
    </>
  );
}

/* ---------- Admin: verify deposits, pay students, see the ledger ---------- */
function VerifyCard({ x, reload }) {
  const [reason, setReason] = useState('');
  const co = (x.user && (x.user.companyName || x.user.name)) || 'Company';
  return (
    <Card accent="blue">
      <Row between style={{ marginTop: 0, marginBottom: 2 }}>
        <Title>{co}</Title>
        <Text style={[font, { fontWeight: '800', fontSize: 16, color: C.ink }]}>{money(x.amount)}</Text>
      </Row>
      <Small numberOfLines={1}>{x.task && x.task.title}</Small>
      <View style={st.target}>
        <Small>{methodLabel(x.method)} from {x.account}</Small>
        <Text selectable style={[font, { color: C.brandDark, fontSize: 18, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 }]}>TrxID {x.trxId}</Text>
        <Small style={{ marginTop: 4 }}>Open your {methodLabel(x.method)} app and check this ID shows {money(x.amount)}.</Small>
      </View>
      <Btn title="Money received. Start the work" onPress={() => run(async () => { await api(`/admin/txns/${x._id}/confirm`, 'POST', {}); reload(); }, 'Payment confirmed. Work can start.')} />
      <Field label="Not received? Tell the company why" placeholder="For example: amount is less, or TrxID not found" value={reason} onChangeText={setReason} />
      <Btn kind="warn" small full={false} title="Reject payment" onPress={() => run(async () => { await api(`/admin/txns/${x._id}/reject`, 'POST', { reason }); reload(); }, 'Payment rejected. The company can try again.')} />
    </Card>
  );
}

function PayCard({ t, reload }) {
  const saved = t.student && t.student.payout;
  const [method, setMethod] = useState((saved && saved.method) || 'bkash');
  const [account, setAccount] = useState((saved && saved.account) || '');
  const [trxId, setTrxId] = useState('');
  return (
    <Card accent="green">
      <Row between style={{ marginTop: 0, marginBottom: 2 }}>
        <Title>{t.student && t.student.name}</Title>
        <Text style={[font, { fontWeight: '800', fontSize: 16, color: C.green }]}>{money(t.payout)}</Text>
      </Row>
      <Small numberOfLines={1}>{t.title} · {t.company && t.company.companyName}</Small>
      <Small>Job budget {money(t.budget)}, platform keeps {money(t.fee)}</Small>
      {saved ? <Chip tone="green" text={`Student wants ${methodLabel(saved.method)} ${saved.account}`} /> : <Chip tone="gold" text="Student has not saved payout details. Ask in chat." />}
      <Small style={{ marginTop: 10, fontWeight: '700', color: C.ink }}>Record how you paid</Small>
      <Seg value={method} onChange={setMethod} items={methodItems(ALL)} />
      <Field label={`Sent to ${acctLabel(method).toLowerCase()}`} keyboardType={method === 'bank' ? 'default' : 'phone-pad'} value={account} onChangeText={setAccount} />
      <Field label="Your TrxID for this payout" autoCapitalize="characters" value={trxId} onChangeText={setTrxId} />
      <Btn title="Payout sent. Close the job" onPress={() => run(async () => { await api(`/admin/tasks/${t._id}/pay`, 'POST', { method, account, trxId }); reload(); }, 'Payout recorded')} />
    </Card>
  );
}

export function AdminPayments({ chat }) {
  const [f, reload] = useLoad('/admin/finance', {});
  if (!f) return <Loading />;
  if (!f.summary) return <Empty icon="!" title="Could not load payments" text="Check your connection and try again." />;
  const s = f.summary;
  return (
    <>
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        <Box label="Held for jobs" value={s.held} tone={C.brand} />
        <Box label="Paid to students" value={s.paidOut} />
        <Box label="Platform fees earned" value={s.commission} tone={C.green} />
      </Row>

      <Section title="Verify company payments" count={f.pending.length}>
        {!f.pending.length && <Card><Body>No company payments are waiting to be checked.</Body></Card>}
        {f.pending.map((x) => <VerifyCard key={x._id} x={x} reload={reload} />)}
      </Section>

      <Section title="Pay students" count={f.due.length}>
        {!f.due.length && <Card><Body>No student payouts are due.</Body></Card>}
        {f.due.map((t) => (
          <View key={t._id}>
            <PayCard t={t} reload={reload} />
            {chat ? <Btn small full={false} kind="ghost" title="Open chat" onPress={() => chat(t._id)} /> : null}
          </View>
        ))}
      </Section>

      <Section title="Recent transactions" count={f.ledger.length}>
        {!f.ledger.length && <Card><Body>Confirmed and rejected payments will be listed here.</Body></Card>}
        {f.ledger.map((x, i) => <FadeIn key={x._id} delay={Math.min(i, 8) * 50}><TxnRow x={x} who={x.user && (x.user.companyName || x.user.name)} /></FadeIn>)}
      </Section>
    </>
  );
}

const st = sheet(() => ({
  box: { flexGrow: 1, flexBasis: 100, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 14 },
  target: { backgroundColor: C.brandSoft, borderRadius: 12, padding: 12, marginTop: 4 },
}));
