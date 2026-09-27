import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = { title: "Privacy & terms — FitOpe" };

const CONTACT = "aka@gmail.com";
const UPDATED = "27 September 2026";

const SECTIONS: [string, React.ReactNode][] = [
  [
    "What we store",
    <>
      Your email, name and a scrambled (hashed) password. If you turn on fingerprint sign-in, also a public key
      for that device — never your fingerprint or face, which stay on your phone. Then whatever you choose to log: profile details like
      height, weight, birth year and goal; workouts, meals, water, sleep, check-ins, body measurements, goals and
      reminders; your time zone; and, if you turn on notifications, your browser&apos;s push address.
    </>,
  ],
  [
    "Why",
    <>
      Only to run the app for you: work out your targets, show your history and trends, and send the family
      nudges you ask for. No ads, no tracking scripts, no analytics, and we never sell or rent your data.
    </>,
  ],
  [
    "Where it lives",
    <>
      In our database on Convex (servers in Ireland, EU), served through Vercel. These companies process data for us and don&apos;t use it for anything else. On your device we
      keep only your sign-in session and small settings like theme.
    </>,
  ],
  [
    "Family circles",
    <>
      Nothing is shared unless you join a circle. Inside one, members only see the categories you switch on —
      meals, water, workouts, sleep or body — and you can change that or leave at any time. Circles never see
      each other.
    </>,
  ],
  [
    "Your control",
    <>
      In <b>Me → Your data</b> you can export everything as a file, delete all your logs, or delete your account.
      Deleting is permanent and removes your data from our database. Sign-ins expire after 30 days, or 14 days
      without use.
    </>,
  ],
  [
    "Not medical advice",
    <>
      Calorie, macro and readiness numbers are estimates from public formulas and food tables. FitOpe doesn&apos;t
      diagnose or treat anything. Talk to a doctor or dietitian before big changes, especially if you have a
      health condition, are pregnant, or are under 18.
    </>,
  ],
  [
    "Using FitOpe",
    <>
      Keep your password to yourself and use the app fairly. We may suspend accounts that abuse it or other
      people. The app is provided as is, and we may change or improve it over time. If these terms change in a
      way that matters, we&apos;ll say so in the app.
    </>,
  ],
  [
    "Contact",
    <>
      Questions, corrections or data requests:{" "}
      <a href={`mailto:${CONTACT}`} className="font-semibold text-accent underline underline-offset-2">
        {CONTACT}
      </a>
    </>,
  ],
];

export default function Privacy() {
  return (
    <main className="gutter-x mx-auto max-w-2xl pt-[calc(var(--safe-top)_+_1rem)] pb-10">
      <Link href="/" className="-m-1.5 inline-flex items-center gap-1 rounded-xl p-3 text-[13px] font-semibold text-muted">
        <ChevronLeft className="h-4 w-4" /> FitOpe
      </Link>
      <h1 className="mt-2 text-[24px] font-bold tracking-tight">Privacy & terms</h1>
      <p className="mt-1 text-[12.5px] text-muted">Plain words, updated {UPDATED}.</p>
      <div className="mt-5 space-y-4">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
