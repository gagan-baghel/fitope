"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, Sheet } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Download, EllipsisVertical, PlusSquare, Share, Smartphone, X } from "lucide-react";

/*
 * Install state, shared app-wide.
 * Chrome/Edge/Samsung fire `beforeinstallprompt` once, often before React mounts, so it is
 * captured at module load and replayed to whoever asks.
 */
type Kind = "installed" | "prompt" | "ios" | "ios-inapp" | "android-menu" | "none";
let deferred: any = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

function detect(): Kind {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  if (standalone || installedNow) return "installed";
  if (deferred) return "prompt";
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Instagram/Facebook/WhatsApp webviews can't add to the Home Screen — the page must open in Safari first.
  if (ios) return /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|GSA\//.test(ua) ? "ios-inapp" : "ios";
  if (/Android/.test(ua)) return "android-menu";
  return "none";
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useInstall() {
  const kind = useSyncExternalStore(subscribe, detect, () => "none" as Kind);
  const [guide, setGuide] = useState(false);
  async function install() {
    if (kind === "prompt" && deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      emit();
    } else setGuide(true);
  }
  return { kind, canInstall: kind !== "installed" && kind !== "none", install, guide, closeGuide: () => setGuide(false) };
}

/* ------------------------------ step-by-step ----------------------------- */

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-surface-2 p-2.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-ground">{n}</span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-sky">{icon}</span>
      <span className="min-w-0 text-[13px] font-semibold leading-snug">{children}</span>
    </div>
  );
}

export function InstallGuide({ kind, open, onClose }: { kind: Kind; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="📲 Install FitOpe">
      <div className="space-y-2">
        {kind === "ios-inapp" && (
          <>
            <Step n={1} icon={<EllipsisVertical className="h-5 w-5" />}>
              Tap <b>•••</b> and choose <b>Open in Safari</b>
            </Step>
            <Step n={2} icon={<Share className="h-5 w-5" />}>
              Tap <b>Share</b> at the bottom
            </Step>
            <Step n={3} icon={<PlusSquare className="h-5 w-5" />}>
              Tap <b>Add to Home Screen</b>, then <b>Add</b>
            </Step>
          </>
        )}
        {kind === "ios" && (
          <>
            <Step n={1} icon={<Share className="h-5 w-5" />}>
              Tap <b>Share</b> <Share className="inline h-4 w-4 align-[-2px]" /> in the toolbar
            </Step>
            <Step n={2} icon={<PlusSquare className="h-5 w-5" />}>
              Scroll and tap <b>Add to Home Screen</b>
            </Step>
            <Step n={3} icon={<span className="text-[15px] font-bold">Add</span>}>
              Tap <b>Add</b> — FitOpe appears on your Home Screen
            </Step>
          </>
        )}
        {(kind === "android-menu" || kind === "prompt" || kind === "none") && (
          <>
            <Step n={1} icon={<EllipsisVertical className="h-5 w-5" />}>
              Tap the <b>⋮ menu</b> in your browser
            </Step>
            <Step n={2} icon={<Smartphone className="h-5 w-5" />}>
              Tap <b>Install app</b> or <b>Add to Home screen</b>
            </Step>
          </>
        )}
        <p className="pt-0.5 text-center text-[11.5px] text-muted">Opens full-screen. No app store needed.</p>
      </div>
    </Sheet>
  );
}

/* ------------------------------ entry points ----------------------------- */

const DISMISS_KEY = "fitope-install-dismissed";
const readDismissed = () => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
};

/** Dismissible card for Welcome/Home. Snoozes for 14 days when closed. */
export function InstallCard({ className }: { className?: string }) {
  const { kind, canInstall, install, guide, closeGuide } = useInstall();
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [hidden, setHidden] = useState(false);
  if (!canInstall || dismissed || hidden) return null;
  return (
    <>
      <div className={cn("flex items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 shadow-[var(--shadow)]", className)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
          <Smartphone className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight">Add to home screen</span>
        <Button size="sm" onClick={install}>
          <Download className="h-4 w-4" /> Install
        </Button>
        <button
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, String(Date.now() + 14 * 86400000));
            } catch {}
            setHidden(true);
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2"
          aria-label="Not now"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <InstallGuide kind={kind} open={guide} onClose={closeGuide} />
    </>
  );
}

/** Always-available row for the Me page. */
export function InstallRow() {
  const { kind, canInstall, install, guide, closeGuide } = useInstall();
  if (!canInstall) return null;
  return (
    <>
      <button onClick={install} className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-left">
        <Smartphone className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Install the app</span>
        <Download className="h-4 w-4 shrink-0 text-muted" />
      </button>
      <InstallGuide kind={kind} open={guide} onClose={closeGuide} />
    </>
  );
}
