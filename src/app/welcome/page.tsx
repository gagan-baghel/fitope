"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, Input, useToast } from "@/components/ui";
import { Activity, Apple, Dumbbell, Moon, TrendingUp } from "lucide-react";

const PILLARS = [
  { icon: Dumbbell, title: "Train with progression", body: "Plans that adapt to what you actually lifted last time." },
  { icon: Apple, title: "Eat, Indian-first", body: "265 everyday foods in katoris, rotis and bowls — not just grams." },
  { icon: Moon, title: "Sleep & recovery", body: "Readiness built from your own sleep, soreness and training load." },
  { icon: TrendingUp, title: "See the trend", body: "Trend weight, strength curves and photos over months, not days." },
];

export default function Welcome() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"signIn" | "signUp">("signUp");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", mode);
    try {
      await signIn("password", form);
      router.replace("/");
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      toast({
        message: msg.includes("InvalidAccountId")
          ? "No account with that email — try creating one."
          : msg.includes("InvalidSecret")
            ? "That password does not match."
            : mode === "signUp"
              ? "Could not create the account. Password needs 8+ characters."
              : "Could not sign in.",
        tone: "var(--rose)",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-10 px-5 py-10 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
      <section className="flex-1 animate-rise">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-ink">
            <Dumbbell className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">FitOpe</span>
        </div>
        <h1 className="max-w-xl text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[54px]">
          Your body,
          <br />
          <span className="text-accent">tracked properly.</span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-2">
          Training, Indian nutrition, sleep and recovery in one place — built around trends that
          actually mean something, not day-to-day noise.
        </p>
        <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface/70 p-4">
              <p.icon className="mb-2.5 h-5 w-5 text-accent" />
              <div className="text-[14px] font-semibold">{p.title}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-muted">{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full animate-rise lg:max-w-sm" style={{ animationDelay: "80ms" }}>
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-accent">
            <Activity className="h-4 w-4" /> {mode === "signUp" ? "Create your account" : "Welcome back"}
          </div>
          <h2 className="text-[22px] font-bold tracking-tight">
            {mode === "signUp" ? "Start in 90 seconds" : "Sign in"}
          </h2>
          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "signUp" && (
              <Field label="Name">
                <Input name="name" placeholder="Your name" autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <Input name="email" type="email" required placeholder="you@email.com" autoComplete="email" />
            </Field>
            <Field label="Password" hint={mode === "signUp" ? "At least 8 characters." : undefined}>
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {mode === "signUp" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <button
            className="mt-4 w-full text-center text-[13px] text-muted transition-colors hover:text-ink"
            onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
          >
            {mode === "signUp" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
          <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
            FitOpe tracks fitness data you enter yourself. It is not a medical device and does not
            diagnose or treat anything.
          </p>
        </Card>
      </section>
    </main>
  );
}
