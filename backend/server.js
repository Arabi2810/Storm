require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  MONGODB_URI = 'mongodb://127.0.0.1:27017/student_income',
  JWT_SECRET = 'change-this-secret',
  PORT = 5000,
  ADMIN_SETUP_CODE = '',
  PAY_BKASH = '', PAY_NAGAD = '', PAY_ROCKET = '', PAY_BANK = '',
} = process.env;
const COMMISSION = Number(process.env.COMMISSION || 0.12);

/* ---------- Models ---------- */
const ref = (m) => ({ type: mongoose.Schema.Types.ObjectId, ref: m });

const User = mongoose.model('User', new mongoose.Schema({
  role: { type: String, enum: ['student', 'company', 'admin'], required: true },
  name: String,
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: String,
  status: { type: String, default: 'active' }, // active | pending | rejected | suspended
  university: String, department: String, year: Number, studentId: String, hoursPerWeek: Number, portfolio: String,
  level: { type: String, default: 'learner' }, // learner | verified | trusted
  verifiedSkills: [{ skill: String, score: Number, rating: Number }],
  completed: { type: Number, default: 0 },
  ratingSum: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  companyName: String, industry: String, website: String, licenseNo: String, city: String,
  warnings: [{ reason: String, at: { type: Date, default: Date.now } }],
  payout: { method: String, account: String, holder: String }, // where the student wants to be paid
}, { timestamps: true }));

// requested -> ready (admin wrote the test) -> submitted -> scored
const Skill = mongoose.model('Skill', new mongoose.Schema({
  student: ref('User'), name: String, key: String,
  status: { type: String, default: 'requested' },
  prompt: String, answer: String, score: Number, rating: Number, feedback: String,
}, { timestamps: true }));

// pending -> open -> assigned -> funded -> submitted <-> revision -> accepted -> paid   (or rejected)
const Task = mongoose.model('Task', new mongoose.Schema({
  company: ref('User'), student: ref('User'),
  title: String, description: String, skill: String, skillKey: String,
  budget: Number, fee: Number, payout: Number, deadline: Date,
  revisions: { type: Number, default: 1 }, revisionsUsed: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  paymentState: { type: String, default: 'none' }, // none | review | rejected | confirmed (company deposit)
  comments: [{ user: ref('User'), text: String, at: { type: Date, default: Date.now } }],
  studentAcceptedAt: Date,
  submission: { text: String, at: Date },
  feedback: String,
  rating: { score: Number, comment: String },
}, { timestamps: true }));


// Private chat between the company and the chosen student (admin can read and join).
const messageSchema = new mongoose.Schema({
  task: ref('Task'), sender: ref('User'), text: String,
  readBy: [ref('User')],
}, { timestamps: true });
messageSchema.index({ task: 1, createdAt: 1 });
const Message = mongoose.model('Message', messageSchema);

// Every money movement. deposit = company -> platform, payout = platform -> student.
// deposit: pending -> confirmed | rejected (admin checks the TrxID). payout: recorded as confirmed by admin.
const Txn = mongoose.model('Txn', new mongoose.Schema({
  task: ref('Task'), user: ref('User'), // user = the company (deposit) or the student (payout)
  type: { type: String, enum: ['deposit', 'payout'], required: true },
  amount: Number, fee: Number, gross: Number,
  method: String, account: String, trxId: String,
  status: { type: String, default: 'pending' }, // pending | confirmed | rejected
  reason: String, reviewedBy: ref('User'), reviewedAt: Date,
}, { timestamps: true }));

/* ---------- Helpers ---------- */
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const sign = (u) => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => { const o = u.toObject(); delete o.password; return o; };
const same = (a, b) => String(a) === String(b);
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const clean = (v) => String(v || '').trim();
const ACTIVE_JOB = ['assigned', 'funded', 'submitted', 'revision'];
const CHAT_OK = ['assigned', 'funded', 'submitted', 'revision', 'accepted', 'paid']; // chat is open once a student is chosen
const HELD = ['funded', 'submitted', 'revision', 'accepted']; // company money is held by the platform
const METHODS = ['bkash', 'nagad', 'rocket', 'bank'];
const MOBILE = ['bkash', 'nagad', 'rocket'];
const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const maybeTrust = (u) => {
  if (u.level === 'verified' && u.completed >= 3 && u.ratingCount > 0 && u.ratingSum / u.ratingCount >= 4) u.level = 'trusted';
};

const auth = (...roles) => async (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
    const u = await User.findById(id);
    if (!u) return res.status(401).json({ error: 'Please log in again' });
    if (u.status === 'suspended') return res.status(403).json({ error: 'Your account is suspended' });
    if (u.status === 'rejected') return res.status(403).json({ error: 'Your application was rejected' });
    if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'Not allowed' });
    req.user = u;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please log in again' });
  }
};

const ownedTask = async (req) => {
  const t = await Task.findById(req.params.id);
  if (!t || !same(t.company, req.user._id)) throw fail(404, 'Job not found');
  return t;
};
const assignedTask = async (req) => {
  const t = await Task.findById(req.params.id);
  if (!t || !same(t.student, req.user._id)) throw fail(404, 'Job not found');
  return t;
};

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));

/* ---------- Auth ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?88)?01[3-9]\d{8}$/;
const parseSkills = (text) => [...new Set(String(text || '').split(',').map((x) => x.trim()).filter((x) => x.length >= 2 && x.length <= 40))].slice(0, 5);

app.post('/api/auth/register', h(async (req, res) => {
  const b = req.body;
  const role = b.role;
  const email = clean(b.email).toLowerCase();
  const phone = clean(b.phone).replace(/[\s-]/g, '');
  if (!['student', 'company', 'admin'].includes(role)) throw fail(400, 'Choose how you want to sign up');
  if (clean(b.name).length < 2) throw fail(400, 'Enter your full name');
  if (!EMAIL_RE.test(email)) throw fail(400, 'Enter a valid email address');
  if (!PHONE_RE.test(phone)) throw fail(400, 'Enter a valid Bangladeshi mobile number, like 01712345678');
  if (!b.password || b.password.length < 8) throw fail(400, 'Password needs at least 8 characters');

  const data = { role, name: clean(b.name), email, phone, status: 'active' };
  let skills = [];
  if (role === 'student') {
    const year = Number(b.year);
    const hours = Number(b.hoursPerWeek);
    skills = parseSkills(b.skills);
    if (!clean(b.university) || !clean(b.department)) throw fail(400, 'Enter your university and department');
    if (!(year >= 1 && year <= 6)) throw fail(400, 'Enter your academic year (1 to 6)');
    if (!clean(b.studentId)) throw fail(400, 'Enter your student ID');
    if (!skills.length) throw fail(400, 'Enter at least one skill, separated by commas (e.g. Content Writing, Graphic Design)');
    if (!(hours >= 1 && hours <= 60)) throw fail(400, 'Enter how many hours per week you can work (1 to 60)');
    Object.assign(data, { university: clean(b.university), department: clean(b.department), year, studentId: clean(b.studentId), hoursPerWeek: hours, portfolio: clean(b.portfolio) });
  }
  if (role === 'company') {
    if (!clean(b.companyName) || !clean(b.industry) || !clean(b.city)) throw fail(400, 'Enter company name, industry and city');
    if (!clean(b.website)) throw fail(400, 'Enter your website or Facebook page so we can verify your business');
    Object.assign(data, { companyName: clean(b.companyName), industry: clean(b.industry), city: clean(b.city), website: clean(b.website), licenseNo: clean(b.licenseNo), status: 'pending' });
  }
  if (role === 'admin' && (!ADMIN_SETUP_CODE || clean(b.setupCode) !== ADMIN_SETUP_CODE))
    throw fail(403, ADMIN_SETUP_CODE ? 'Wrong admin setup code' : 'Admin sign-up is turned off. Set ADMIN_SETUP_CODE in backend/.env');

  if (await User.findOne({ email })) throw fail(400, 'This email is already registered');
  const u = await User.create({ ...data, password: await bcrypt.hash(b.password, 10) });
  if (skills.length) await Skill.insertMany(skills.map((name) => ({ student: u._id, name, key: norm(name) })));
  res.json({ token: sign(u), user: pub(u) });
}));

app.post('/api/auth/login', h(async (req, res) => {
  const u = await User.findOne({ email: clean(req.body.email).toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) throw fail(400, 'Wrong email or password');
  if (req.body.role && u.role !== req.body.role) throw fail(400, `This email belongs to a ${u.role} account. Go back and choose "${u.role}".`);
  if (u.status === 'suspended') throw fail(403, 'Your account is suspended');
  if (u.status === 'rejected') throw fail(403, 'Your application was rejected. Contact support.');
  res.json({ token: sign(u), user: pub(u) });
}));

app.get('/api/me', auth(), (req, res) => res.json(pub(req.user)));

/* ---------- Skills ---------- */
app.get('/api/skills/mine', auth('student'), h(async (req, res) => {
  res.json(await Skill.find({ student: req.user._id }).sort('createdAt'));
}));

app.get('/api/skills/popular', auth(), h(async (req, res) => {
  const users = await User.find({ role: 'student', 'verifiedSkills.0': { $exists: true } }).select('verifiedSkills').lean();
  const count = {};
  users.forEach((u) => u.verifiedSkills.forEach((v) => { count[v.skill] = (count[v.skill] || 0) + 1; }));
  res.json(Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 12));
}));

app.post('/api/skills', auth('student'), h(async (req, res) => {
  const name = clean(req.body.name);
  if (name.length < 2 || name.length > 40) throw fail(400, 'Enter a skill name (2 to 40 characters)');
  if (await Skill.findOne({ student: req.user._id, key: norm(name) })) throw fail(400, 'You already added this skill');
  if ((await Skill.countDocuments({ student: req.user._id })) >= 8) throw fail(400, 'You can add up to 8 skills');
  res.json(await Skill.create({ student: req.user._id, name, key: norm(name) }));
}));

const mySkill = async (req) => {
  const k = await Skill.findById(req.params.id);
  if (!k || !same(k.student, req.user._id)) throw fail(404, 'Skill not found');
  return k;
};

app.post('/api/skills/:id/submit', auth('student'), h(async (req, res) => {
  const k = await mySkill(req);
  if (k.status !== 'ready') throw fail(400, 'Your test is not ready yet');
  if (clean(req.body.answer).length < 20) throw fail(400, 'Write a fuller answer (at least 20 characters)');
  k.answer = clean(req.body.answer); k.status = 'submitted';
  await k.save();
  res.json(k);
}));

app.post('/api/skills/:id/retest', auth('student'), h(async (req, res) => {
  const k = await mySkill(req);
  if (k.status !== 'scored' || k.score >= 70) throw fail(400, 'Retest is only for tests you did not pass');
  Object.assign(k, { status: 'requested', prompt: undefined, answer: undefined, score: undefined, rating: undefined });
  await k.save();
  res.json(k);
}));

app.delete('/api/skills/:id', auth('student'), h(async (req, res) => {
  const k = await mySkill(req);
  if (k.status === 'submitted') throw fail(400, 'Wait for your test to be scored first');
  await k.deleteOne();
  await User.updateOne({ _id: req.user._id }, { $pull: { verifiedSkills: { skill: k.name } } });
  res.json({ ok: true });
}));

/* ---------- Jobs ---------- */
app.post('/api/tasks', auth('company'), h(async (req, res) => {
  if (req.user.status !== 'active') throw fail(403, 'Your company is waiting for admin approval');
  const { title, description, skill, budget, deadlineDays } = req.body;
  const b = Number(budget);
  if (clean(title).length < 3 || clean(description).length < 20) throw fail(400, 'Add a title and a clear description (at least 20 characters)');
  if (clean(skill).length < 2) throw fail(400, 'Enter the skill needed for this job');
  if (!(b >= 300)) throw fail(400, 'Budget must be at least 300 taka');
  const fee = Math.round(b * COMMISSION);
  res.json(await Task.create({
    company: req.user._id, title: clean(title), description: clean(description), skill: clean(skill), skillKey: norm(skill),
    budget: b, fee, payout: b - fee, deadline: new Date(Date.now() + (Number(deadlineDays) || 7) * 864e5),
  }));
}));

app.get('/api/tasks', auth('student'), h(async (req, res) => {
  const mine = req.user.verifiedSkills.map((v) => norm(v.skill));
  const tasks = await Task.find({ status: 'open' }).populate('company', 'companyName name').sort('-createdAt').lean();
  res.json(tasks.map((t) => ({ ...t, budget: undefined, fee: undefined, comments: undefined, commentCount: t.comments.length, canComment: mine.includes(t.skillKey) })));
}));

app.get('/api/tasks/mine', auth('student', 'company'), h(async (req, res) => {
  const id = req.user._id;
  if (req.user.role === 'company') {
    const tasks = await Task.find({ company: id }).sort('-createdAt').populate('student', 'name').lean();
    return res.json(tasks.map((t) => ({ ...t, comments: undefined, commentCount: t.comments.length })));
  }
  const tasks = await Task.find({ $or: [{ student: id }, { 'comments.user': id }] }).sort('-createdAt').populate('company', 'companyName name').lean();
  res.json(tasks.map((t) => ({ ...t, budget: undefined, fee: undefined, comments: undefined, commentCount: t.comments.length, assignedToMe: same(t.student, id) })));
}));

app.get('/api/tasks/:id', auth(), h(async (req, res) => {
  const u = req.user;
  const t = await Task.findById(req.params.id).populate('company', 'companyName name').populate('student', 'name')
    .populate('comments.user', 'name role level verifiedSkills');
  if (!t) throw fail(404, 'Job not found');
  const isOwner = u.role === 'company' && !!t.company && same(t.company._id, u._id);
  const isAssigned = u.role === 'student' && !!t.student && same(t.student._id, u._id);
  const commented = t.comments.some((c) => c.user && same(c.user._id, u._id));
  if (!(isOwner || isAssigned || u.role === 'admin' || commented || (u.role === 'student' && t.status === 'open'))) throw fail(403, 'You cannot view this job');
  const verified = u.role === 'student' && u.verifiedSkills.some((v) => norm(v.skill) === t.skillKey);
  const canComment = u.role === 'student' ? isAssigned || (t.status === 'open' && verified) : isOwner;
  const o = t.toObject();
  if (!isOwner && u.role !== 'admin') { delete o.budget; delete o.fee; }
  let txns = [];
  if (isOwner || isAssigned || u.role === 'admin') {
    txns = await Txn.find({ task: t._id }).sort('createdAt').lean();
    if (isOwner) txns = txns.filter((x) => x.type === 'deposit');
    if (isAssigned) txns = txns.filter((x) => x.type === 'payout' && x.status === 'confirmed');
  }
  if (!isOwner && u.role !== 'admin') delete o.paymentState;
  const canChat = (isOwner || isAssigned || u.role === 'admin') && !!t.student && CHAT_OK.includes(t.status);
  res.json({ ...o, txns, me: { isOwner, isAssigned, verified, canComment, canChat } });
}));

app.post('/api/tasks/:id/comments', auth('student', 'company'), h(async (req, res) => {
  const u = req.user;
  const t = await Task.findById(req.params.id);
  if (!t) throw fail(404, 'Job not found');
  const text = clean(req.body.text);
  if (text.length < 2 || text.length > 600) throw fail(400, 'Write a comment (2 to 600 characters)');
  const isOwner = u.role === 'company' && same(t.company, u._id);
  const isAssigned = u.role === 'student' && same(t.student, u._id);
  if (u.role === 'company' && !isOwner) throw fail(403, 'Not your job');
  if (u.role === 'student' && !isAssigned) {
    if (t.status !== 'open') throw fail(400, 'Comments are closed for this job');
    if (!u.verifiedSkills.some((v) => norm(v.skill) === t.skillKey))
      throw fail(403, `Get verified in "${t.skill}" first: add it under My skills and pass the test`);
    if (!t.comments.some((c) => same(c.user, u._id)) && (await Task.countDocuments({ student: u._id, status: { $in: ACTIVE_JOB } })) >= 3)
      throw fail(400, 'Finish your current jobs first (limit is 3)');
  }
  t.comments.push({ user: u._id, text });
  await t.save();
  res.json({ ok: true });
}));

app.post('/api/tasks/:id/select', auth('company'), h(async (req, res) => {
  const t = await ownedTask(req);
  if (t.status !== 'open') throw fail(400, 'This job is not open');
  if (!t.comments.some((c) => same(c.user, req.body.studentId))) throw fail(400, 'That student has not commented on this job');
  t.student = req.body.studentId;
  t.status = 'assigned';
  await t.save();
  res.json(t);
}));

app.post('/api/tasks/:id/accept-terms', auth('student'), h(async (req, res) => {
  const t = await assignedTask(req);
  if (t.status !== 'assigned') throw fail(400, 'Not available now');
  t.studentAcceptedAt = new Date();
  await t.save();
  res.json(t);
}));

app.post('/api/tasks/:id/submit', auth('student'), h(async (req, res) => {
  const t = await assignedTask(req);
  if (!['funded', 'revision'].includes(t.status)) throw fail(400, 'Work can start only after admin confirms the payment');
  if (!clean(req.body.text)) throw fail(400, 'Add your work or a link to it');
  t.submission = { text: clean(req.body.text), at: new Date() };
  t.status = 'submitted';
  await t.save();
  res.json(t);
}));

app.post('/api/tasks/:id/review', auth('company'), h(async (req, res) => {
  const t = await ownedTask(req);
  if (t.status !== 'submitted') throw fail(400, 'Nothing to review yet');
  if (req.body.action === 'accept') {
    t.status = 'accepted';
  } else if (req.body.action === 'revise') {
    if (!clean(req.body.comment)) throw fail(400, 'Say what needs to change');
    if (t.revisionsUsed >= t.revisions) throw fail(400, 'Revision limit reached. Accept the work or contact admin.');
    t.revisionsUsed += 1; t.status = 'revision'; t.feedback = clean(req.body.comment);
  } else throw fail(400, 'Unknown action');
  await t.save();
  res.json(t);
}));

app.post('/api/tasks/:id/rate', auth('company'), h(async (req, res) => {
  const t = await ownedTask(req);
  const score = Number(req.body.score);
  if (!['accepted', 'paid'].includes(t.status) || (t.rating && t.rating.score)) throw fail(400, 'You cannot rate this job');
  if (!(score >= 1 && score <= 5)) throw fail(400, 'Rating must be 1 to 5');
  t.rating = { score, comment: clean(req.body.comment) };
  await t.save();
  const u = await User.findById(t.student);
  u.ratingSum += score; u.ratingCount += 1; maybeTrust(u);
  await u.save();
  res.json(t);
}));


/* ---------- Chat (company <-> chosen student, admin can join) ---------- */
const chatTask = async (req) => {
  const u = req.user;
  const t = await Task.findById(req.params.id);
  if (!t) throw fail(404, 'Job not found');
  const isOwner = u.role === 'company' && same(t.company, u._id);
  const isAssigned = u.role === 'student' && !!t.student && same(t.student, u._id);
  if (!(isOwner || isAssigned || u.role === 'admin')) throw fail(403, 'You cannot open this chat');
  if (!t.student || !CHAT_OK.includes(t.status)) throw fail(400, 'Chat opens after a student is chosen for the job');
  return t;
};

app.get('/api/tasks/:id/messages', auth(), h(async (req, res) => {
  const t = await chatTask(req);
  const msgs = await Message.find({ task: t._id }).sort('-createdAt').limit(200).populate('sender', 'name role companyName').lean();
  msgs.reverse();
  await Message.updateMany({ task: t._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  const [co, st] = await Promise.all([User.findById(t.company).select('companyName name'), User.findById(t.student).select('name')]);
  res.json({
    task: { _id: t._id, title: t.title, status: t.status },
    company: co && (co.companyName || co.name), student: st && st.name,
    messages: msgs.map((m) => ({ _id: m._id, text: m.text, at: m.createdAt, mine: !!m.sender && same(m.sender._id, req.user._id), role: m.sender && m.sender.role, name: m.sender && (m.sender.role === 'company' ? m.sender.companyName || m.sender.name : m.sender.name) })),
  });
}));

app.post('/api/tasks/:id/messages', auth(), h(async (req, res) => {
  const t = await chatTask(req);
  const text = clean(req.body.text);
  if (!text) throw fail(400, 'Write a message first');
  if (text.length > 1000) throw fail(400, 'Messages can be up to 1000 characters');
  const m = await Message.create({ task: t._id, sender: req.user._id, text, readBy: [req.user._id] });
  res.json({ _id: m._id, at: m.createdAt });
}));

// Inbox: one row per job conversation, with the last message and how many you have not read.
app.get('/api/chats', auth(), h(async (req, res) => {
  const u = req.user;
  let tasks;
  if (u.role === 'admin') {
    const ids = await Message.distinct('task');
    tasks = await Task.find({ _id: { $in: ids } });
  } else {
    const q = u.role === 'company' ? { company: u._id, student: { $ne: null } } : { student: u._id };
    tasks = await Task.find({ ...q, status: { $in: CHAT_OK } });
  }
  const stats = await Message.aggregate([
    { $match: { task: { $in: tasks.map((t) => t._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$task', last: { $first: '$$ROOT' }, unread: { $sum: { $cond: [{ $in: [u._id, '$readBy'] }, 0, 1] } } } },
  ]);
  const by = {};
  stats.forEach((x) => { by[String(x._id)] = x; });
  const people = await User.find({ _id: { $in: [...tasks.map((t) => t.company), ...tasks.map((t) => t.student)].filter(Boolean) } }).select('name companyName').lean();
  const nameOf = (id) => { const p = people.find((x) => same(x._id, id)); return p ? p.companyName || p.name : ''; };
  const rows = tasks.map((t) => {
    const s = by[String(t._id)];
    return {
      task: t._id, title: t.title, status: t.status,
      other: u.role === 'company' ? nameOf(t.student) : u.role === 'student' ? nameOf(t.company) : `${nameOf(t.company)} and ${nameOf(t.student)}`,
      last: s ? { text: s.last.text, at: s.last.createdAt, mine: same(s.last.sender, u._id) } : null,
      unread: s ? s.unread : 0,
    };
  });
  rows.sort((a, b) => new Date(b.last ? b.last.at : 0) - new Date(a.last ? a.last.at : 0));
  res.json(rows);
}));

/* ---------- Payments ---------- */
const checkAccount = (method, account) => {
  if (!METHODS.includes(method)) throw fail(400, 'Choose a payment method');
  const acc = clean(account).replace(/[\s-]/g, '');
  if (MOBILE.includes(method) && !PHONE_RE.test(acc)) throw fail(400, 'Enter a valid mobile number, like 01712345678');
  if (!MOBILE.includes(method) && acc.length < 4) throw fail(400, 'Enter the bank account number');
  return acc;
};
const checkTrx = async (method, trxId) => {
  const trx = clean(trxId).toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9]{6,24}$/.test(trx)) throw fail(400, 'Enter the transaction ID (6 to 24 letters or numbers)');
  if (await Txn.findOne({ method, trxId: trx, status: { $ne: 'rejected' } })) throw fail(400, 'This transaction ID was already used');
  return trx;
};

// Where companies should send money (set in backend/.env).
app.get('/api/payment-info', auth(), (req, res) => {
  const all = [['bkash', 'bKash (send money)', PAY_BKASH], ['nagad', 'Nagad (send money)', PAY_NAGAD], ['rocket', 'Rocket', PAY_ROCKET], ['bank', 'Bank transfer', PAY_BANK]];
  res.json(all.filter((x) => x[2]).map(([method, label, number]) => ({ method, label, number })));
});

// Student chooses where to be paid.
app.put('/api/me/payout', auth('student'), h(async (req, res) => {
  const method = clean(req.body.method);
  const account = checkAccount(method, req.body.account);
  if (method === 'bank' && clean(req.body.holder).length < 2) throw fail(400, 'Enter the account holder name');
  req.user.payout = { method, account, holder: clean(req.body.holder) };
  await req.user.save();
  res.json(pub(req.user));
}));

// Company reports the money it sent. Admin checks the TrxID, then work can start.
app.post('/api/tasks/:id/deposit', auth('company'), h(async (req, res) => {
  const t = await ownedTask(req);
  if (t.status !== 'assigned') throw fail(400, 'Payment is not needed for this job now');
  if (!t.studentAcceptedAt) throw fail(400, 'Wait until the student accepts the terms, then pay');
  if (await Txn.findOne({ task: t._id, type: 'deposit', status: 'pending' })) throw fail(400, 'Your payment is already waiting for admin to confirm');
  const method = clean(req.body.method);
  const account = checkAccount(method, req.body.account);
  const trxId = await checkTrx(method, req.body.trxId);
  const x = await Txn.create({ task: t._id, user: req.user._id, type: 'deposit', amount: t.budget, method, account, trxId });
  t.paymentState = 'review';
  await t.save();
  res.json(x);
}));

app.get('/api/txns/mine', auth('student', 'company'), h(async (req, res) => {
  const u = req.user;
  const isCo = u.role === 'company';
  const txns = await Txn.find({ user: u._id, type: isCo ? 'deposit' : 'payout' }).sort('-createdAt').populate('task', 'title').lean();
  const tasks = await Task.find(isCo ? { company: u._id, student: { $ne: null } } : { student: u._id }).select('budget payout status').lean();
  const summary = isCo ? {
    held: sum(tasks.filter((t) => HELD.includes(t.status)), (t) => t.budget),
    spent: sum(tasks.filter((t) => t.status === 'paid'), (t) => t.budget),
    pending: sum(txns.filter((x) => x.status === 'pending'), (x) => x.amount),
  } : {
    earned: sum(tasks.filter((t) => t.status === 'paid'), (t) => t.payout),
    working: sum(tasks.filter((t) => ['funded', 'submitted', 'revision'].includes(t.status)), (t) => t.payout),
    awaiting: sum(tasks.filter((t) => t.status === 'accepted'), (t) => t.payout),
  };
  res.json({ txns, summary, payout: u.payout || null });
}));

/* ---------- Admin ---------- */
app.get('/api/admin/overview', auth('admin'), h(async (req, res) => {
  const c = (q) => Task.countDocuments(q);
  const [students, companies, pendingCompanies, toArrange, toScore, toPublish, toFund, toPay, openJobs, paidJobs] = await Promise.all([
    User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'company', status: 'active' }),
    User.countDocuments({ role: 'company', status: 'pending' }),
    Skill.countDocuments({ status: 'requested' }), Skill.countDocuments({ status: 'submitted' }),
    c({ status: 'pending' }), Txn.countDocuments({ type: 'deposit', status: 'pending' }), c({ status: 'accepted' }), c({ status: 'open' }), c({ status: 'paid' }),
  ]);
  res.json({ students, companies, pendingCompanies, toArrange, toScore, toPublish, toFund, toPay, openJobs, paidJobs });
}));

app.get('/api/admin/users', auth('admin'), h(async (req, res) => {
  const role = req.query.role === 'company' ? 'company' : 'student';
  const users = await User.find({ role }).select('-password').sort('-createdAt').lean();
  if (role === 'student') {
    const sk = await Skill.find({ student: { $in: users.map((u) => u._id) } }).lean();
    users.forEach((u) => { u.skills = sk.filter((k) => same(k.student, u._id)).map((k) => ({ name: k.name, status: k.status, score: k.score, rating: k.rating })); });
  }
  res.json(users);
}));

app.post('/api/admin/users/:id/status', auth('admin'), h(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === 'admin') throw fail(404, 'User not found');
  if (!['active', 'pending', 'rejected', 'suspended'].includes(req.body.status)) throw fail(400, 'Unknown status');
  u.status = req.body.status;
  if (req.body.reason) u.warnings.push({ reason: req.body.reason });
  await u.save();
  res.json({ ok: true });
}));

app.get('/api/admin/skills', auth('admin'), h(async (req, res) => {
  const [requested, submitted] = await Promise.all([
    Skill.find({ status: 'requested' }).sort('createdAt').populate('student', 'name university department'),
    Skill.find({ status: 'submitted' }).sort('updatedAt').populate('student', 'name university department'),
  ]);
  res.json({ requested, submitted });
}));

app.post('/api/admin/skills/:id/arrange', auth('admin'), h(async (req, res) => {
  const k = await Skill.findById(req.params.id);
  if (!k || k.status !== 'requested') throw fail(400, 'This skill is not waiting for a test');
  if (clean(req.body.prompt).length < 20) throw fail(400, 'Write the test instructions (at least 20 characters)');
  k.prompt = clean(req.body.prompt); k.status = 'ready';
  await k.save();
  res.json(k);
}));

app.post('/api/admin/skills/:id/score', auth('admin'), h(async (req, res) => {
  const k = await Skill.findById(req.params.id);
  const score = Number(req.body.score);
  const rating = Number(req.body.rating);
  if (!k || k.status !== 'submitted') throw fail(400, 'This test is not waiting for a score');
  if (!(score >= 0 && score <= 100) || !(rating >= 1 && rating <= 5)) throw fail(400, 'Enter a score (0 to 100) and a rating (1 to 5)');
  Object.assign(k, { score, rating, feedback: clean(req.body.feedback), status: 'scored' });
  await k.save();
  if (score >= 70) {
    const u = await User.findById(k.student);
    const entry = { skill: k.name, score, rating };
    const i = u.verifiedSkills.findIndex((v) => norm(v.skill) === k.key);
    if (i >= 0) u.verifiedSkills.set(i, entry); else u.verifiedSkills.push(entry);
    if (u.level === 'learner') u.level = 'verified';
    await u.save();
  }
  res.json({ ok: true });
}));

app.get('/api/admin/tasks', auth('admin'), h(async (req, res) => {
  res.json(await Task.find().sort('-createdAt').populate('company', 'companyName').populate('student', 'name'));
}));

app.get('/api/admin/finance', auth('admin'), h(async (req, res) => {
  const [tasks, pending, due, ledger, paidTx] = await Promise.all([
    Task.find({ student: { $ne: null } }).select('budget fee payout status').lean(),
    Txn.find({ type: 'deposit', status: 'pending' }).sort('createdAt').populate('user', 'companyName name phone').populate('task', 'title budget').lean(),
    Task.find({ status: 'accepted' }).sort('updatedAt').populate('student', 'name phone payout').populate('company', 'companyName').lean(),
    Txn.find({ status: { $ne: 'pending' } }).sort('-updatedAt').limit(60).populate('user', 'companyName name').populate('task', 'title').lean(),
    Txn.find({ type: 'payout', status: 'confirmed' }).select('amount').lean(),
  ]);
  res.json({
    summary: {
      held: sum(tasks.filter((t) => HELD.includes(t.status)), (t) => t.budget),
      commission: sum(tasks.filter((t) => t.status === 'paid'), (t) => t.fee),
      paidOut: sum(paidTx, (x) => x.amount),
      pendingAmount: sum(pending, (x) => x.amount),
    },
    pending, due, ledger,
  });
}));

app.post('/api/admin/txns/:id/:action', auth('admin'), h(async (req, res) => {
  const x = await Txn.findById(req.params.id);
  if (!x || x.type !== 'deposit' || x.status !== 'pending') throw fail(400, 'This payment is not waiting for review');
  const t = await Task.findById(x.task);
  if (!t) throw fail(404, 'Job not found');
  if (req.params.action === 'confirm') {
    if (t.status !== 'assigned') throw fail(400, 'This job is not waiting for payment');
    x.status = 'confirmed'; t.status = 'funded'; t.paymentState = 'confirmed';
  } else if (req.params.action === 'reject') {
    if (clean(req.body.reason).length < 3) throw fail(400, 'Tell the company why the payment was not accepted');
    x.status = 'rejected'; x.reason = clean(req.body.reason); t.paymentState = 'rejected';
  } else throw fail(400, 'Unknown action');
  x.reviewedBy = req.user._id; x.reviewedAt = new Date();
  await x.save(); await t.save();
  res.json(x);
}));

// Admin sent the student's money: record how, with the TrxID, and close the job.
app.post('/api/admin/tasks/:id/pay', auth('admin'), h(async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t || t.status !== 'accepted') throw fail(400, 'Not possible at this stage');
  const u = await User.findById(t.student);
  const method = clean(req.body.method) || (u.payout && u.payout.method);
  const account = checkAccount(method, req.body.account || (u.payout && u.payout.account));
  const trxId = await checkTrx(method, req.body.trxId);
  await Txn.create({ task: t._id, user: u._id, type: 'payout', amount: t.payout, fee: t.fee, gross: t.budget, method, account, trxId, status: 'confirmed', reviewedBy: req.user._id, reviewedAt: new Date() });
  t.status = 'paid';
  await t.save();
  u.completed += 1; maybeTrust(u);
  await u.save();
  res.json(t);
}));

const STEP = { approve: ['pending', 'open'], reject: ['pending', 'rejected'] };
app.post('/api/admin/tasks/:id/:action', auth('admin'), h(async (req, res) => {
  const step = STEP[req.params.action];
  const t = await Task.findById(req.params.id);
  if (!step || !t || t.status !== step[0]) throw fail(400, 'Not possible at this stage');
  t.status = step[1];
  await t.save();
  res.json(t);
}));

app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

/* ---------- Start ---------- */
mongoose.connect(MONGODB_URI).then(async () => {
  await User.deleteOne({ email: 'admin@example.com', role: 'admin' }); // removes the demo admin from the first version
  if (!ADMIN_SETUP_CODE) console.log('Note: set ADMIN_SETUP_CODE in backend/.env to allow admin sign-up.');
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}).catch((e) => { console.error('Could not connect to MongoDB:', e.message); process.exit(1); });