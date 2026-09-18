import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

const DAY = 86400000;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
// The passwords that fall first to any guessing attack. Not exhaustive — length does most of the work.
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwertyui",
  "qwerty123", "11111111", "00000000", "iloveyou", "abcd1234", "abc12345", "letmein1",
  "welcome1", "admin123", "fitope123", "sunshine", "princess", "football",
]);

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        // One account per address regardless of case or stray spaces.
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!EMAIL.test(email)) throw new ConvexError("Enter a valid email");
        const name = String(params.name ?? "").trim().slice(0, 60) || email.split("@")[0];
        return { email, name };
      },
      validatePasswordRequirements(password: string) {
        if (password.length < 8 || password.length > 128) throw new ConvexError("Password must be 8–128 characters");
        if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password))
          throw new ConvexError("That password is too easy to guess");
      },
    }),
  ],
  // Health data: a lost or shared phone should not stay signed in forever.
  session: { totalDurationMs: 30 * DAY, inactiveDurationMs: 14 * DAY },
  // Failed password attempts per account per hour before it is locked for the rest of the hour.
  signIn: { maxFailedAttempsPerHour: 10 },
});
