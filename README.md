# Student Income Platform: MVP (web + Android + iOS from one codebase)

- `backend/`: Node.js + Express + MongoDB REST API
- `app-code/App.js`: React Native (Expo) source. The same code runs as a website, Android app and iOS app.

## 1. Requirements
- Node.js 20 or newer
- MongoDB: install locally, or create a free MongoDB Atlas cluster and copy its connection string

## 2. Start the backend
```
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm start
```
Edit `.env` first if you use Atlas (set `MONGODB_URI`). You should see "API running on http://localhost:5000".
An admin account is created on first run: **admin@example.com / admin1234** (change it in `.env` before the first run).

## 3. Create and start the app (new terminal, from the project root)
```
npx create-expo-app@latest app --template blank
cd app
npx expo install react-dom react-native-web @expo/metro-runtime
```
Now replace `app/App.js` with the file `app-code/App.js` from this project (copy and overwrite). Then:
```
npx expo start
```
- Press **w** for the website (opens in your browser)
- Press **a** for an Android emulator, or scan the QR code with the **Expo Go** app on your phone
- On a real phone, open `App.js` and set `LAN_IP` to your laptop's Wi-Fi IP (e.g. `192.168.0.105`). Phone and laptop must be on the same Wi-Fi.

## 4. Try the whole flow (about 5 minutes)
1. Sign up as a **student** (Tests tab: submit an answer) and as a **company** (separate browser or incognito window).
2. Log in as **admin**: approve the company, score the student's test (70+ passes), publish the company's task after it is posted.
3. Log in again as the student (so the new level loads): Tasks tab, Apply.
4. Company: My tasks, Select this student.
5. Student: My work, Accept terms. Admin: Payment received.
6. Student: Submit work. Company: Accept work, rate the student.
7. Admin: Mark as paid.

## Notes
- Payments are manual in this MVP (admin records them). Student payout = budget minus commission (12%, set `COMMISSION` in `.env`).
- Before going live: set a strong `JWT_SECRET`, deploy the API (Render/Railway), use Atlas, and change `API` in `App.js` to your deployed URL.
