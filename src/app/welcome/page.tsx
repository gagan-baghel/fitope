"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Input, Logo, Segmented, useToast } from "@/components/ui";
import { InstallCard } from "@/components/install";
import { Apple, Dumbbell, Eye, EyeOff, Lock, Mail, Moon, TrendingUp, User } from "lucide-react";

const PILLARS = [
  { icon: Dumbbell, title: "Train", body: "Plans that adapt to what you actually lifted last time." },
  { icon: Apple, title: "Eat Indian", body: "265 everyday foods in katoris, rotis and bowls." },
  { icon: Moon, title: "Recover", body: "Readiness from your own sleep, soreness and load." },
  { icon: TrendingUp, title: "Progress", body: "Trend weight, strength curves and photos over months." },
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
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pt-[calc(var(--safe-top)_+_1rem)] pb-8 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
      {/* Brand + pitch. On phones this is two short lines so the form is on the first screen. */}
      <section className="lg:flex-1">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="text-[17px] font-bold tracking-tight">FitOpe</span>
        </div>
        <h1 className="mt-5 text-[26px] font-bold leading-[1.1] tracking-tight sm:text-[40px] lg:mt-8 lg:text-[54px]">
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

      <section className="mt-5 w-full animate-rise lg:mt-0 lg:max-w-sm">
        {invited && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3">
            <span className="text-[26px] leading-none">👨‍👩‍👧‍👦</span>
            <span className="text-[13.5px] font-semibold">You&apos;re invited to a family. Sign in or create an account to join.</span>
          </div>
        )}
        <div className="card p-4 sm:p-6">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "signIn", label: "Sign in" },
              { value: "signUp", label: "Create account" },
            ]}
          />
          <form onSubmit={submit} className="mt-4 space-y-3">
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
          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-muted">
            Not a medical device. Your data is private to you and the family you choose.
          </p>
        </div>

        <InstallCard className="mt-3" />

        {/* Phones: what the app does, as a compact strip under the form. */}
        <div className="mt-5 grid grid-cols-2 gap-2 lg:hidden">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface/70 p-3">
              <p.icon className="h-5 w-5 shrink-0 text-accent" />
              <span className="text-[13px] font-semibold">{p.title}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
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
