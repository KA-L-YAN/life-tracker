# Life Tracker

A private log for what you ate, habits you're building or quitting, your daily route, study time, steps, sleep, water, and how the day felt — one Expo app that runs as a website, an installable iOS/iPad PWA, and a real sideloadable Android app. A short plan setup (name, goals, daily study minutes, reminder time) runs on first sign-in and can be changed any time from **You → Adjust my plan**. Today draws everything on a 24-hour dial you can drag around to replay the day, under a sky that follows the real hour; **This week** turns the last seven days into charts and a few plain sentences; each habit has a six-month heatmap; the year view colours every day by mood, habits or steps; on Android, steps and sleep come from Health Connect (Samsung Health, Google Fit, the phone's own counter, a watch) and sync to the website; deletes can be undone for five seconds. Phones get a bottom bar, tablets two columns, desktops a side rail. Free stack: Supabase (DB + auth), Vercel (web hosting), EAS Build (Android APK), OpenStreetMap tiles + Leaflet (maps, no API key ever).

## 1. One-time Supabase setup

1. Create a free project at [supabase.com](https://supabase.com) (no card required).
2. In the dashboard, go to **SQL Editor → New query** and run each file in [`supabase/migrations/`](supabase/migrations) in number order (001 → 007). They create the tables (food, habits + habit logs, study, location, profile) with row-level security so each account only ever reads its own data, plus in-app account deletion (003), the "no account with that email" check for password resets (004), the nightly route clean-up (005), the daily mood check-in (006), and steps, sleep, water and daily goals (007).
3. Sign-up with an emailed code (the app's "Create an account" and "Forgot password?" flows):
   - **Authentication → Emails → SMTP Settings**: enable custom SMTP. This project uses a dedicated Gmail with an app password (`smtp.gmail.com`, port 465). Supabase's built-in sender only manages a couple of emails an hour and won't reach people outside your team.
   - **Authentication → Emails → Templates**: in *Confirm sign up* and *Reset password*, show `{{ .Token }}` (the code) instead of the link. The app asks for the code; links would open a browser instead of the app.
   - **Authentication → Sign In / Providers**: turn on "Allow new users to sign up" and "Confirm email"; under *Email*, set the OTP length to 6.
   - Every account only ever sees its own rows (row-level security).
4. To keep the app private instead, turn sign-ups off and add people from **Authentication → Users → Add user**.
5. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.

## 2. Local setup

```bash
cp .env.example .env
# paste your Supabase URL/anon key into .env
npm install
npx expo start --web       # website, at http://localhost:8081
npx expo run:android       # first native Android build (needs Android Studio/emulator or a USB device)
```

Background location (`expo-task-manager`), reminders (`expo-notifications`) and the map WebView (`react-native-webview`) are native modules, so past this point you're running a **dev client**, not Expo Go — `expo run:android` builds and installs that dev client for you automatically.

## 3. Deploy the website (Vercel, free)

```bash
npx expo export -p web --clear   # outputs to dist/; --clear stops a stale cache baking in old env values
npx vercel deploy dist --prod
```

Or connect the GitHub repo in the Vercel dashboard: build command `npx expo export -p web`, output directory `dist`, and set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as Vercel environment variables (they're baked in at build time).

**On your iPhone/iPad**: open the deployed URL in Safari, tap Share → **Add to Home Screen**. That gives you a full-screen app icon — no App Store, no $99/year Apple Developer account. The trade-off: iOS won't track your location in the true background, so a location point is captured each time you open the app instead of continuously.

## 4. Build the Android app (EAS, free tier)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

This produces a real, installable `.apk` (not a Play Store listing — just download and sideload it on your phone). EAS's free tier includes a limited number of builds/month, which is plenty for occasional rebuilds.

## Notes

- Retention: route points are deleted nightly once they're 30 days old (pg_cron job from migration 005; the app's copy of the number is `ROUTE_KEEP_DAYS` in `src/lib/location/config.ts`). Meals, habits and focus sessions are kept until the user deletes them.
- Capacity on the free plan: the 500 MB database is the limit, not sign-ins (50k monthly active users). Routes were the only fast-growing data (~10–15 MB per all-day tracker per year); with 30-day retention that's about 1 MB each, so several hundred active users fit.
- A free Supabase project pauses after ~7 days with zero activity; opening the app again auto-resumes it with no data loss.
- Background location on Android uses a foreground-service notification (Android requires this) with 5-minute/100-meter update cadence — see `src/lib/location/config.ts` to tune it.
- Daily reminders are Android-only; browsers and the iOS home-screen app don't get them.
- Maps use OpenStreetMap's public tiles (fine for one person's use; see their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/)). Dark mode is a CSS filter over the same tiles. To swap providers, change `TILE_URL` in `src/components/map/tiles.ts`.
- `npm run check` runs the self-check for the streak / days-clean maths.
