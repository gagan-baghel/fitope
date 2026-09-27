/**
 * Fingerprint / Face ID sign-in via WebAuthn passkeys. The device keeps the private key behind
 * its biometric lock; we store only the public key and verify signatures against it.
 * Sign-in itself goes through the "passkey" provider in auth.ts, which calls `verifySignIn`.
 */
import { ConvexError, v } from "convex/values";
import { getAuthUserId, retrieveAccount } from "@convex-dev/auth/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { internalMutation, internalQuery, MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, mutation, query, MINUTE } from "./lib/functions";
import { requireUser } from "./lib/util";

const CHALLENGE_TTL = 5 * MINUTE;
const MAX_KEYS = 10;

/** The app's own origin (not Convex's). Passkeys are bound to this hostname. */
function site() {
  const url = new URL(process.env.SITE_URL ?? "http://localhost:3000");
  return { origin: url.origin, rpID: url.hostname };
}

/** Consumes a challenge so each one verifies at most once. */
async function takeChallenge(ctx: MutationCtx, challenge: string, userId?: Id<"users">) {
  const row = await ctx.db
    .query("passkeyChallenges")
    .withIndex("by_challenge", (q) => q.eq("challenge", challenge))
    .unique();
  if (!row) return false;
  await ctx.db.delete(row._id);
  return row.expiresAt > Date.now() && row.userId === userId;
}

const keysOf = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("passkeys")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const keys = await keysOf(ctx, userId);
    return keys.map((k) => ({ _id: k._id, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt }));
  },
});

/**
 * Adding a key asks for the password again, so a borrowed, signed-in phone can't plant a
 * fingerprint that outlives the session. Wrong guesses count toward the sign-in lockout.
 */
export const registerOptions = action({
  args: { password: v.string() },
  handler: async (ctx, { password }): Promise<RegistrationOptions> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not signed in");
    const email = await ctx.runQuery(internal.passkeys.emailOf, { userId });
    try {
      if (!email || password.length > 128) throw new Error("InvalidSecret");
      const { user } = await retrieveAccount(ctx, { provider: "password", account: { id: email, secret: password } });
      if (user._id !== userId) throw new Error("InvalidSecret");
    } catch (e: any) {
      throw new ConvexError(
        String(e?.message).includes("TooManyFailedAttempts") ? "Too many tries. Wait a few minutes." : "Wrong password"
      );
    }
    return await ctx.runMutation(internal.passkeys.createRegisterOptions, { userId });
  },
});
type RegistrationOptions = Awaited<ReturnType<typeof generateRegistrationOptions>>;

export const emailOf = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => (await ctx.db.get(userId))?.email ?? null,
});

export const createRegisterOptions = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const keys = await keysOf(ctx, userId);
    if (keys.length >= MAX_KEYS) throw new ConvexError("Remove an old fingerprint key first");
    const options = await generateRegistrationOptions({
      rpName: "FitOpe",
      rpID: site().rpID,
      userID: userId,
      userName: user?.email ?? "FitOpe",
      userDisplayName: user?.name ?? user?.email ?? "FitOpe",
      attestationType: "none",
      // Stops the same device being added twice.
      excludeCredentials: keys.map((k) => ({ id: isoBase64URL.toBuffer(k.credentialId), type: "public-key" as const })),
      // Discoverable + biometric: sign-in needs no email, only the fingerprint.
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
    await ctx.db.insert("passkeyChallenges", { challenge: options.challenge, userId, expiresAt: Date.now() + CHALLENGE_TTL });
    return options;
  },
});

export const register = mutation({
  args: { response: v.any() },
  handler: async (ctx, { response }) => {
    const userId = await requireUser(ctx);
    const { origin, rpID } = site();
    let info;
    try {
      ({ registrationInfo: info } = await verifyRegistrationResponse({
        response,
        expectedChallenge: (c) => takeChallenge(ctx, c, userId),
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      }));
    } catch {
      info = undefined;
    }
    if (!info) throw new Error("Could not add fingerprint — try again");
    const credentialId = isoBase64URL.fromBuffer(info.credentialID);
    const taken = await ctx.db
      .query("passkeys")
      .withIndex("by_credential", (q) => q.eq("credentialId", credentialId))
      .unique();
    if (taken) throw new Error("This fingerprint is already added");
    await ctx.db.insert("passkeys", {
      userId,
      credentialId,
      publicKey: isoBase64URL.fromBuffer(info.credentialPublicKey),
      counter: info.counter,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("passkeys") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const key = await ctx.db.get(id);
    if (!key || key.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/** Signed out, so there is no user to throttle; the challenge row itself is cheap and pruned daily. */
export const signInOptions = mutation({
  args: {},
  handler: async (ctx) => {
    const options = await generateAuthenticationOptions({ rpID: site().rpID, userVerification: "required" });
    await ctx.db.insert("passkeyChallenges", { challenge: options.challenge, expiresAt: Date.now() + CHALLENGE_TTL });
    return options;
  },
});

/** Called by the passkey provider in auth.ts. Returns the user to sign in, or null. */
export const verifySignIn = internalMutation({
  args: { response: v.any() },
  handler: async (ctx, { response }) => {
    if (typeof response?.id !== "string") return null;
    const key = await ctx.db
      .query("passkeys")
      .withIndex("by_credential", (q) => q.eq("credentialId", response.id))
      .unique();
    if (!key) return null;
    const { origin, rpID } = site();
    try {
      const { verified, authenticationInfo } = await verifyAuthenticationResponse({
        response,
        expectedChallenge: (c) => takeChallenge(ctx, c),
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
        authenticator: {
          credentialID: isoBase64URL.toBuffer(key.credentialId),
          credentialPublicKey: isoBase64URL.toBuffer(key.publicKey),
          counter: key.counter,
        },
      });
      if (!verified) return null;
      await ctx.db.patch(key._id, { counter: authenticationInfo.newCounter, lastUsedAt: Date.now() });
      return key.userId;
    } catch {
      return null;
    }
  },
});

/** Account deletion: every passkey goes in the same transaction as the sessions. */
export async function erasePasskeys(ctx: MutationCtx, userId: Id<"users">) {
  for (const k of await keysOf(ctx, userId)) await ctx.db.delete(k._id);
}
