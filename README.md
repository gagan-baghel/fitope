# FitOpe

A personal fitness, nutrition, sleep and body-transformation tracker. Training with real
progression, Indian food logging in katoris and rotis, sleep and recovery, and analytics built
from what you actually logged.

Next.js (App Router) + Convex + Tailwind v4.

## Run it

```bash
npm install
```

Two processes, two terminals:

```bash
npm run dev:convex
```

```bash
npm run dev
```

`dev:convex` uses Convex's anonymous local backend (no account needed) and writes
`NEXT_PUBLIC_CONVEX_URL` into `.env.local` on first run. To use a hosted Convex project instead,
run `npx convex login && npx convex dev`.

Auth needs three deployment env vars. Generate them once:

```bash
npx @convex-dev/auth
```

or set them by hand with `npx convex env set JWT_PRIVATE_KEY …`, `JWKS`, and
`SITE_URL=http://localhost:3000`.

The shared exercise and food libraries seed themselves on first sign-in; `npm run seed` forces it.

```bash
npm run check   # asserts the nutrition/strength math and the seed data
```

## What's in it

**Onboarding** collects only what changes the maths — age, height, weight, goal, experience,
activity, schedule, equipment, diet, sleep window — and every step is skippable. It ends by showing
the calorie and macro estimate it derived, labelled as an estimate, before anything is saved.

**Training.** A generator turns the profile into a 2–6 day split from a 105-exercise library,
picking movements that match the equipment you actually have. Sessions are logged set by set with
the previous session's weights prefilled, a rest timer, per-exercise history, and estimated-1RM
personal records. Plans are fully editable: reorder, retitle, change sets/reps/rest, duplicate,
activate, or build one from scratch. Partial and skipped sessions are first-class.

**Nutrition.** 265 Indian foods with real serving units — roti, katori, bowl, glass, piece — and
raw vs cooked kept distinct where it matters. Custom foods, multi-ingredient recipes with automatic
per-serving maths, saved meals, recents, favourites, repeat-yesterday, and a free-text quick add.
Protein and fiber are the two macros given visual priority.

**Body, sleep and recovery.** Weight with an exponentially-weighted trend line (so a heavy dinner
does not read as fat gain), tape measurements, private progress photos, manual sleep logging with a
consistency score, and a readiness score built from sleep, soreness, energy, stress and recent
training load.

**Analytics.** Weekly volume, strength curves, muscle-group balance, protein and fiber adherence,
sleep averages, derived milestones, plus deterministic written insights that read the data and say
something specific.

**Reminders** are in-app only: a due reminder shows on the home screen and disappears the moment
the thing it is nudging you about is logged. Nothing is pushed or emailed.

**Units.** Body weight and measurements can be shown in kg/cm or lb/in; training loads stay in kg
because that is how plates are marked.

## Design notes

- Data model separates *planned* from *performed*. Program days are templates; workouts, exercises
  and sets are what happened.
- Meal entries snapshot their nutrients. Editing a food later never rewrites history.
- Targets are versioned by `effectiveFrom`, so changing a goal does not retroactively alter whether
  past days "hit target".
- Everything is scoped by `userId` and every mutation re-checks ownership.
- The insight engine (`convex/analytics.ts`) is deliberately deterministic. It is the seam an AI
  coaching layer plugs into later — the data it reads is already shaped for that.

## Not a medical device

Calorie, macro and readiness figures are estimates from public formulas and composition tables.
The app does not diagnose, treat or advise on health conditions.
