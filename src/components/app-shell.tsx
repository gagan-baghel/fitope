"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { cn, deviceTimezone } from "@/lib/utils";
import {
  Activity,
  Apple,
  Droplets,
  Dumbbell,
  HeartPulse,
  House,
  LayoutGrid,
  Moon,
  Scale,
  TrendingUp,
  User,
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

// Phones get four tabs; everything else lives behind "More".
const MOBILE_TABS = TABS.slice(0, 3);
const MORE_PAGES = [
  ...TABS.slice(3),
  { href: "/family", label: "Family", icon: Users },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/me", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const router = useRouter();
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState<null | "weight" | "sleep" | "checkin">(null);
  const logWater = useMutation(api.nutrition.logWater);
  const toast = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/welcome");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (me && !me.profile?.onboardingComplete) router.replace("/onboarding");
  }, [me, router]);

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
      <div className="mx-auto max-w-lg space-y-4 px-5 pt-[calc(var(--safe-top)_+_1.25rem)] pb-5">
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
        <div className="mx-auto max-w-2xl px-4 pb-28 pt-[calc(var(--safe-top)_+_1.25rem)] sm:px-6 lg:max-w-3xl lg:pb-12">
          {children}
        </div>
      </div>

      {/* Mobile tab bar — full width, docked to the bottom edge */}
      <nav className="fixed inset-x-0 bottom-0 z-40 rounded-t-[24px] border-t border-line bg-surface/95 px-2 pt-1.5 pb-[max(8px,var(--safe-bottom))] shadow-[0_-6px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md">
          {MOBILE_TABS.map((t) => (
            <TabButton key={t.href} href={t.href} icon={t.icon} label={t.label} active={pathname.startsWith(t.href)} />
          ))}
          <TabButton
            icon={LayoutGrid}
            label="More"
            active={more || MORE_PAGES.some((p) => pathname.startsWith(p.href))}
            onClick={() => setMore(true)}
          />
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="More">
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

function TabButton({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href?: string;
  icon: any;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  const cls = cn(
    "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 transition-colors active:scale-95",
    active ? "text-ink" : "text-muted"
  );
  const body = (
    <>
      <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-surface-2")}>
        <Icon className={cn("h-5 w-5", active && "text-accent")} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="text-[11px] font-semibold tracking-tight">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-haspopup="dialog" className={cls}>
      {body}
    </button>
  );
}
