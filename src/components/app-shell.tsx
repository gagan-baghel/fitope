"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { cn, deviceTimezone } from "@/lib/utils";
import {
  Activity,
  Apple,
  Droplets,
  Dumbbell,
  HeartPulse,
  House,
  ChevronRight,
  Menu,
  Moon,
  Scale,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Logo, Sheet, Skeleton, useToast } from "@/components/ui";
import { NudgeBanner } from "@/components/family";
import { CheckinSheet, SleepSheet, WeightSheet } from "@/components/quick-log";

const TABS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/train", label: "Train", icon: Dumbbell },
  { href: "/eat", label: "Eat", icon: Apple },
  { href: "/recover", label: "Recover", icon: Moon },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

// Phones get four tabs; the rest opens from the avatar in the top bar.
const MOBILE_TABS = TABS.filter((t) => t.href !== "/recover");
const MORE_PAGES = [
  { href: "/recover", label: "Recover", icon: Moon },
  { href: "/family", label: "Family", icon: Users },
  { href: "/timeline", label: "Timeline", icon: Activity },
];
// Task screens bring their own sticky header with a back button.
const FOCUS_ROUTES = ["/eat/add", "/train/session"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const router = useRouter();
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState<null | "weight" | "sleep" | "checkin">(null);
  const logWater = useMutation(api.nutrition.logWater);
  const toast = useToast();
  const focus = FOCUS_ROUTES.some((r) => pathname.startsWith(r));
  const initial = (me?.profile?.name ?? me?.email ?? "?").slice(0, 1).toUpperCase();

  // Top bar slides away while scrolling down and returns on any scroll up.
  const [barHidden, setBarHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setBarHidden(y > last && y > 56);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/welcome");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (me && !me.profile?.onboardingComplete) router.replace("/onboarding");
  }, [me, router]);

  // Top the shared exercise/food library up when the deployment is behind the current seed
  // version. Guarded by a ref so a re-render mid-flight cannot fire it twice.
  const ensureLibrary = useMutation(api.seed.ensureLibrary);
  const seeding = useRef(false);
  useEffect(() => {
    if (!me?.libraryStale || seeding.current) return;
    seeding.current = true;
    ensureLibrary({}).catch(() => {
      seeding.current = false;
    });
  }, [me?.libraryStale, ensureLibrary]);

  // "Today" is computed server-side in this zone; keep it current (travel, new device).
  const setTimezone = useMutation(api.profiles.setTimezone);
  useEffect(() => {
    const tz = deviceTimezone();
    if (me?.profile && me.profile.timezone !== tz) setTimezone({ timezone: tz }).catch(() => {});
  }, [me?.profile, setTimezone]);

  // An invite link opened while signed out is resumed once the user is set up.
  useEffect(() => {
    if (!me?.profile?.onboardingComplete) return;
    try {
      const code = localStorage.getItem("fitope-join");
      if (code) {
        localStorage.removeItem("fitope-join");
        router.replace(`/family?join=${code}`);
      }
    } catch {}
  }, [me, router]);

  // Only auth gates rendering: the profile and the page's own queries load in parallel
  // instead of one after the other (each hop is a full round trip to the backend).
  if (isLoading || !isAuthenticated) {
    return (
      <div className="gutter-x mx-auto max-w-lg space-y-3 pt-[calc(var(--safe-top)_+_1.25rem)] pb-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="lg:flex">
      <NudgeBanner />
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
          <Logo size={36} />
          <span className="text-[17px] font-bold tracking-tight">FitOpe</span>
        </Link>
        <nav className="space-y-1">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium transition-colors",
                  active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink"
                )}
              >
                <t.icon className={cn("h-[18px] w-[18px]", active && "text-accent")} />
                {t.label}
              </Link>
            );
          })}
          <Link
            href="/family"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium transition-colors",
              pathname.startsWith("/family") ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink"
            )}
          >
            <Users className={cn("h-[18px] w-[18px]", pathname.startsWith("/family") && "text-accent")} />
            Family
          </Link>
          <Link
            href="/timeline"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium transition-colors",
              pathname.startsWith("/timeline") ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink"
            )}
          >
            <Activity className={cn("h-[18px] w-[18px]", pathname.startsWith("/timeline") && "text-accent")} />
            Timeline
          </Link>
        </nav>
        <div className="mt-auto">
          <Link
            href="/me"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
              pathname.startsWith("/me") ? "bg-surface-2" : "hover:bg-surface-2/60"
            )}
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-3 text-[13px] font-bold">
              {(me?.profile?.name ?? me?.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{me?.profile?.name ?? "Your profile"}</div>
              <div className="truncate text-[11px] text-muted">Settings & data</div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {!focus && (
          <header
            className={cn(
              "sticky top-0 z-40 border-b border-line bg-bg/90 pt-[var(--safe-top)] backdrop-blur-xl transition-transform duration-300 lg:hidden",
              barHidden && !more && "-translate-y-full"
            )}
          >
            <div className="gutter-x mx-auto flex h-12 max-w-2xl items-center justify-between">
              <Link href="/home" className="flex items-center gap-2">
                <Logo size={24} />
                <span className="text-[15px] font-bold tracking-tight">FitOpe</span>
              </Link>
              <button
                type="button"
                onClick={() => setMore(true)}
                aria-label="More options"
                aria-haspopup="dialog"
                className="flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-2 active:scale-95"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-bold text-ground">
                  {initial}
                </span>
                <Menu className="h-4 w-4 text-muted" />
              </button>
            </div>
          </header>
        )}
        <div
          className={cn(
            /* 12px gutters on phones: 16 on each side plus a 16px card inset left content
               ~30% narrower than the screen. Desktop keeps the roomier 24. */
            "gutter-x mx-auto max-w-2xl pb-24 lg:max-w-3xl lg:pb-12 lg:pt-[calc(var(--safe-top)_+_1.25rem)]",
            focus ? "pt-[calc(var(--safe-top)_+_1rem)]" : "pt-3.5"
          )}
        >
          {children}
        </div>
      </div>

      {/* Mobile tab bar — full width, docked to the bottom edge */}
      <nav className="fixed inset-x-0 bottom-0 z-40 rounded-t-[20px] border-t border-line bg-surface/95 px-2 pt-1 pb-[max(4px,var(--safe-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md">
          {MOBILE_TABS.map((t) => (
            <TabButton key={t.href} href={t.href} icon={t.icon} label={t.label} active={pathname.startsWith(t.href)} />
          ))}
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <Link
          href="/me"
          onClick={() => setMore(false)}
          className="mb-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-2.5"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-bold text-ground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{me?.profile?.name ?? "Your profile"}</span>
            <span className="block truncate text-[12px] text-muted">{me?.email}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Quick log</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              [UtensilsCrossed, "Food", () => router.push("/eat/add?meal=auto")],
              [
                Droplets,
                "+250 ml",
                async () => {
                  await logWater({ ml: 250 });
                  toast({ message: "250 ml logged" });
                },
              ],
              [Scale, "Weigh in", () => setSheet("weight")],
              [Moon, "Sleep", () => setSheet("sleep")],
              [HeartPulse, "Check-in", () => setSheet("checkin")],
            ] as const
          ).map(([Icon, label, run]) => (
            <button
              key={label}
              onClick={() => {
                setMore(false);
                run();
              }}
              className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-3 text-left text-[13.5px] font-semibold active:scale-[0.98]"
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-accent" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-muted">Go to</div>
        <div className="mt-2 space-y-1">
          {MORE_PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              onClick={() => setMore(false)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-[14.5px] font-semibold",
                pathname.startsWith(p.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2/60"
              )}
            >
              <p.icon className="h-[18px] w-[18px] text-muted" />
              {p.label}
            </Link>
          ))}
        </div>
      </Sheet>

      <WeightSheet open={sheet === "weight"} onClose={() => setSheet(null)} />
      <SleepSheet
        open={sheet === "sleep"}
        onClose={() => setSheet(null)}
        defaults={{ bedtime: me?.profile?.bedtime, wakeTime: me?.profile?.wakeTime }}
      />
      <CheckinSheet open={sheet === "checkin"} onClose={() => setSheet(null)} />
    </div>
  );
}

function TabButton({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 transition-colors active:scale-95",
        active ? "text-ink" : "text-muted"
      )}
    >
      <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-surface-2")}>
        <Icon className={cn("h-[18px] w-[18px]", active && "text-accent")} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="text-[10.5px] font-semibold tracking-tight">{label}</span>
    </Link>
  );
}
