"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Activity, Apple, Dumbbell, House, Moon, TrendingUp, User } from "lucide-react";
import { Skeleton } from "@/components/ui";

const TABS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/train", label: "Train", icon: Dumbbell },
  { href: "/eat", label: "Eat", icon: Apple },
  { href: "/recover", label: "Recover", icon: Moon },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/welcome");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (me && !me.profile?.onboardingComplete) router.replace("/onboarding");
  }, [me, router]);

  if (isLoading || !isAuthenticated || me === undefined) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="lg:flex">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-ink">
            <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
          </div>
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
        <div className="mx-auto max-w-2xl px-4 pb-32 pt-5 sm:px-6 lg:max-w-3xl lg:pb-12">{children}</div>
      </div>

      {/* Mobile floating nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-[26px] border border-line bg-surface/95 p-1.5 shadow-[var(--shadow)] backdrop-blur-xl">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-[20px] px-1 py-2.5 transition-all",
                  active ? "bg-ink text-ground" : "text-muted active:scale-95"
                )}
              >
                <t.icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-semibold tracking-tight">{t.label}</span>
              </Link>
            );
          })}
          <Link
            href="/me"
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[20px] px-1 py-2.5 transition-all",
              pathname.startsWith("/me") ? "bg-ink text-ground" : "text-muted active:scale-95"
            )}
          >
            <User className="h-[19px] w-[19px]" />
            <span className="text-[10px] font-semibold tracking-tight">Me</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
