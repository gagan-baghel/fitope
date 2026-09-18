"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/ui";

/**
 * Entry point. Routing is decided from the stored session alone — no network round trip —
 * so "/" never waits on the backend. The app shell and onboarding handle the rest.
 * The inline script runs during HTML parse, before React loads; the effect is the fallback.
 */
const hasSession = `(() => { try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith("__convexAuthRefreshToken")) return true; } catch (e) {} return false; })()`;
const redirect = `location.replace(${hasSession} ? "/home" : "/welcome")`;

function sessionStored() {
  try {
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith("__convexAuthRefreshToken")) return true;
  } catch {}
  return false;
}

export default function Gate() {
  const router = useRouter();
  useEffect(() => {
    router.replace(sessionStored() ? "/home" : "/welcome");
  }, [router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <script dangerouslySetInnerHTML={{ __html: redirect }} />
      <Logo size={72} className="animate-pop" />
    </div>
  );
}
