# Student Income Platform

A marketplace where **verified students** find paid work and **companies** hire them.
One codebase runs as a **website**, an **Android app** and an **iOS app**.

```
student-income-platform/
├── backend/   Node.js + Express + MongoDB REST API
└── app/       React Native (Expo) frontend
    ├── App.js              app shell, header, account menu, navigation
    └── src/
        ├── theme.js        colours, spacing, fonts (change the look here)
        ├── api.js          API address, helpers, formatters
        ├── components/ui.js  buttons, fields, cards, chips, toast, animations
        └── screens/        Auth, Student, Company, Admin, TaskDetail
```

## 1. Requirements
- **Node.js 20+**
- **MongoDB**: install it locally, or use a free MongoDB Atlas cluster (paste its connection string into `backend/.env` as `MONGODB_URI`)

## 2. Start the backend (Terminal 1)
```
cd backend
npm install
npm start
```
`backend/.env` is already included. You should see: `API running on http://localhost:5000`.
An admin account is created on the first run: **admin@example.com / admin1234**
(`ADMIN_SETUP_CODE` in `.env` is the code needed to sign up as an extra admin).

## 3. Start the app (Terminal 2)
```
cd app
npm install
npx expo start
```
- Press **w** to open the website in your browser.
- Press **a** for an Android emulator, or scan the QR code with **Expo Go** on your phone.
- **On a real phone:** open `app/src/api.js` and set `LAN_IP` to your laptop's Wi-Fi IP (e.g. `'192.168.0.105'`). The phone and the laptop must be on the same Wi-Fi.

## 4. Try the whole flow (about 5 minutes)
1. Sign up as a **student** and add a skill under **My skills**. Sign up as a **company** in another browser or an incognito window.
2. Log in as **admin**: approve the company (**Companies**), send the student a test and score it (**Skill tests**, 70 or more passes).
3. Company: **Post a new job**. Admin: **Jobs → Publish job**.
4. Student: open the job and post a comment. Company: **Choose** the student.
5. Student: **Accept terms**. Admin: **Payment received, start work**.
6. Student: **Submit work**. Company: **Accept work** and rate the student.
7. Admin: **Mark as paid**.

## Notes
- Payments are recorded manually by the admin in this MVP. Student payout = budget minus commission (12%, set `COMMISSION` in `.env`).
- **Before going live:** set a strong `JWT_SECRET` and `ADMIN_SETUP_CODE`, change the default admin password, deploy the API (Render, Railway), use MongoDB Atlas, and set the deployed URL in `app/src/api.js`.
- `backend/.env` contains secrets. Do not upload it to GitHub or share it publicly.
