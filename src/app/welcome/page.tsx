"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Input, Logo, Segmented, useToast } from "@/components/ui";
import { InstallCard } from "@/components/install";
import { Apple, Dumbbell, Eye, EyeOff, KeyRound, Lock, Mail, Moon, TrendingUp, User } from "lucide-react";

const PILLARS = [
  { icon: Dumbbell, title: "Train", body: "Plans that adapt to what you actually lifted last time." },
  { icon: Apple, title: "Eat Indian", body: "265 everyday foods in katoris, rotis and bowls." },
  { icon: Moon, title: "Recover", body: "Readiness from your own sleep, soreness and load." },
  { icon: TrendingUp, title: "Progress", body: "Trend weight, and strength curves over months." },
];

export default function Welcome() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  // Set by /join/CODE when the invite link was opened signed out. Server render: false.
  const invited = useSyncExternalStore(noSubscribe, readInvited, () => false);
  // Invited people are almost always new, so default them to Create account.
  const [chosen, setMode] = useState<"signIn" | "signUp" | null>(null);
  const mode = chosen ?? (invited ? "signUp" : "signIn");
  const resetOn = useQuery(api.auth.resetEnabled, {});
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/home");
  }, [isAuthenticated, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", mode);
    form.set("email", String(form.get("email") ?? "").trim().toLowerCase());
    try {
      await signIn("password", form);
      // New accounts go straight to onboarding instead of bouncing through Home.
      router.replace(mode === "signUp" ? "/onboarding" : "/home");
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      toast({
        // One message for unknown email and wrong password, so the form can't be used to
        // discover who has an account.
        message: typeof err?.data === "string"
          ? err.data // our own validation (weak password, bad email) — safe to show as is
          : msg.includes("TooManyFailedAttempts")
          ? "Too many tries. Wait a few minutes and try again."
          : mode === "signUp"
            ? "Could not create the account. Use a valid email and 8+ character password, or sign in."
            : "Email or password is wrong.",
        tone: "var(--rose)",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-3 pt-[calc(var(--safe-top)_+_0.75rem)] pb-6 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
      {/* Brand + pitch. On phones this is two short lines so the form is on the first screen. */}
      <section className="lg:flex-1">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="text-[17px] font-bold tracking-tight">FitOpe</span>
        </div>
        <h1 className="mt-3 text-[22px] font-bold leading-[1.1] tracking-tight sm:text-[40px] lg:mt-8 lg:text-[54px]">
          Your body, <span className="text-muted lg:block lg:text-accent">tracked properly.</span>
        </h1>
        <p className="mt-4 hidden max-w-md text-[15px] leading-relaxed text-ink-2 lg:block">
          Training, Indian nutrition, sleep and recovery in one place — built around trends that
          actually mean something, not day-to-day noise.
        </p>
        <div className="mt-9 hidden max-w-xl grid-cols-2 gap-3 lg:grid">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface/70 p-4">
              <p.icon className="mb-2.5 h-5 w-5 text-accent" />
              <div className="text-[14px] font-semibold">{p.title}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-muted">{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 w-full animate-rise lg:mt-0 lg:max-w-sm">
        {invited && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-mint/30 bg-mint/10 px-3 py-2.5">
            <span className="shrink-0 text-[20px] leading-none">👨‍👩‍👧‍👦</span>
            <span className="min-w-0 text-[12.5px] font-semibold">You&apos;re invited to a family — sign in or create an account to join.</span>
          </div>
        )}
        <div className="card p-3 sm:p-6">
          {resetting ? (
            <ResetForm onBack={() => setResetting(false)} />
          ) : (
          <>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "signIn", label: "Sign in" },
              { value: "signUp", label: "Create account" },
            ]}
          />
          <form onSubmit={submit} className="mt-3 space-y-2.5">
            {mode === "signUp" && (
              <IconInput icon={User}>
                <Input name="name" placeholder="Your name" autoComplete="name" maxLength={60} className="pl-11" aria-label="Name" />
              </IconInput>
            )}
            <IconInput icon={Mail}>
              <Input
                name="email"
                type="email"
                required
                maxLength={254}
                placeholder="you@email.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                className="pl-11"
                aria-label="Email"
              />
            </IconInput>
            <IconInput icon={Lock}>
              <Input
                name="password"
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                placeholder={mode === "signUp" ? "Password (8+ characters)" : "Password"}
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                className="px-11"
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted hover:text-ink"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </IconInput>
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {mode === "signUp" ? "Create account" : "Sign in"}
            </Button>
          </form>
          {mode === "signIn" && resetOn && (
            <button type="button" onClick={() => setResetting(true)} className="mt-2 w-full py-2 text-center text-[12.5px] font-semibold text-accent">
              Forgot password?
            </button>
          )}
          </>
          )}
          <p className="mt-3 text-center text-[11px] leading-snug text-muted">
            Not a medical device. Your data stays private to you.{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
          </p>
        </div>

        <InstallCard className="mt-2" />

        {/* Phones: what the app does, as a compact strip under the form. */}
        <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex min-w-0 items-center gap-2 rounded-2xl border border-line bg-surface/70 px-2.5 py-2">
              <p.icon className="h-4 w-4 shrink-0 text-accent" />
              <span className="truncate text-[12.5px] font-semibold">{p.title}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/** Email a code, then set a new password with it. Signs the user in on success. */
function ResetForm({ onBack }: { onBack: () => void }) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState<string | null>(null); // set once a code is on its way
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      if (!email) {
        const address = String(form.get("email") ?? "").trim().toLowerCase();
        try {
          await signIn("password", { flow: "reset", email: address });
        } catch (err: any) {
          // Our own errors (send failed) carry a message. Anything else is almost always "no
          // such account", which we don't reveal: the next step reads the same either way.
          if (typeof err?.data === "string") throw err;
        }
        setEmail(address);
      } else {
        await signIn("password", {
          flow: "reset-verification",
          email,
          code: String(form.get("code") ?? "").trim(),
          newPassword: String(form.get("newPassword") ?? ""),
        });
        router.replace("/home");
      }
    } catch (err: any) {
      toast({ message: typeof err?.data === "string" ? err.data : "That code is wrong or has expired.", tone: "var(--rose)" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="text-[15px] font-bold">Reset your password</div>
      {!email ? (
        <>
          <p className="text-[12.5px] leading-snug text-muted">We&apos;ll email you an 8-digit code.</p>
          <IconInput key="email" icon={Mail}>
            <Input name="email" type="email" required maxLength={254} placeholder="you@email.com" autoComplete="email" inputMode="email" autoCapitalize="none" className="pl-11" aria-label="Email" />
          </IconInput>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Email me a code</Button>
        </>
      ) : (
        <>
          <p className="text-[12.5px] leading-snug text-muted">
            If <span className="font-semibold text-ink">{email}</span> has an account, a code is on its way. Check spam too.
          </p>
          {/* Keyed so the email field's typed value isn't carried over into this one. */}
          <IconInput key="code" icon={KeyRound}>
            <Input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} placeholder="8-digit code" className="pl-11 tabular tracking-widest" aria-label="Code" />
          </IconInput>
          <IconInput icon={Lock}>
            <Input name="newPassword" type={showPw ? "text" : "password"} required minLength={8} maxLength={128} placeholder="New password (8+)" autoComplete="new-password" className="px-11" aria-label="New password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted hover:text-ink" aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </IconInput>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Set new password</Button>
        </>
      )}
      <button type="button" onClick={onBack} className="w-full py-2 text-center text-[12.5px] font-semibold text-muted">
        Back to sign in
      </button>
    </form>
  );
}

const noSubscribe = () => () => {};
function readInvited() {
  try {
    return !!localStorage.getItem("fitope-join");
  } catch {
    return false;
  }
}

function IconInput({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      {children}
    </div>
  );
}
