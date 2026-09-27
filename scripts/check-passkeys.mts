/**
 * Self-check for fingerprint sign-in. Plays a phone's authenticator (a real P-256 key) against the
 * handlers in convex/passkeys.ts over a tiny in-memory db. Run: npx tsx scripts/check-passkeys.mts
 * (or `npm run check`). No framework, no deployment — asserts only.
 */
import assert from "node:assert/strict";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import { convexToJson } from "convex/values";
import { getFunctionName } from "convex/server";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";

// convex/ loads as CommonJS here, but @convex-dev/auth ships ESM only: point require() at it.
const resolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === "@convex-dev/auth/server") return fileURLToPath(import.meta.resolve(request));
  return resolve.call(this, request, ...rest);
};
const passkeys = await import("../convex/passkeys");

const ORIGIN = "http://localhost:3000"; // SITE_URL unset -> localhost, same as `npm run dev`
const EMAIL = "test@example.com";
const PASSWORD = "correct horse battery";

/* ------------------------- in-memory Convex stand-in ------------------------- */

type Row = Record<string, any> & { _id: string };
const tables = new Map<string, Row[]>();
const rows = (t: string) => tables.get(t) ?? tables.set(t, []).get(t)!;
let seq = 0;
const db = {
  get: async (id: string) => [...tables.values()].flat().find((r) => r._id === id) ?? null,
  insert: async (t: string, doc: object) => {
    const _id = `${t}:${++seq}`;
    rows(t).push({ _id, _creationTime: Date.now(), ...doc });
    return _id;
  },
  patch: async (id: string, doc: object) => void Object.assign((await db.get(id))!, doc),
  delete: async (id: string) => {
    for (const [t, rs] of tables) tables.set(t, rs.filter((r) => r._id !== id));
  },
  query: (t: string) => ({
    withIndex: (_index: string, range: (q: any) => any) => {
      const eqs: [string, unknown][] = [];
      const q = { eq: (k: string, v: unknown) => (eqs.push([k, v]), q) };
      range(q);
      const hits = () => rows(t).filter((r) => eqs.every(([k, v]) => r[k] === v));
      return { collect: async () => hits(), unique: async () => hits()[0] ?? null };
    },
  }),
};

let signedIn: string | null = null;
const call = (ref: any, args: object): Promise<any> => {
  const name = typeof ref === "string" ? ref : getFunctionName(ref);
  // Convex Auth's password check (retrieveAccount) lands here.
  if (name === "auth:store") {
    const { account } = (args as any).args;
    return Promise.resolve(account.id === EMAIL && account.secret === PASSWORD ? { account: {}, user: { _id: userId } } : "InvalidSecret");
  }
  const fn = (passkeys as any)[name.split(":")[1]];
  return fn._handler(ctx, args).then((out: any) => (out === undefined ? null : convexToJson(out) && out));
};
const ctx: any = {
  db,
  auth: { getUserIdentity: async () => (signedIn ? { subject: `${signedIn}|session`, issuer: "test" } : null) },
  runQuery: call,
  runMutation: call,
};
const userId = await db.insert("users", { email: EMAIL, name: "Test" });

/* ------------------------------ fake authenticator ------------------------------ */

const subtle = globalThis.crypto.subtle;
const utf8 = (s: string) => new TextEncoder().encode(s);
const b64u = (b: Uint8Array) => isoBase64URL.fromBuffer(b);
const sha = async (b: BufferSource) => new Uint8Array(await subtle.digest("SHA-256", b));
const cat = (...parts: ArrayLike<number>[]) => Uint8Array.from(parts.flatMap((p) => Array.from(p)));
const u32 = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
/** WebAuthn sends ECDSA signatures DER-encoded; WebCrypto produces raw r||s. */
function der(raw: Uint8Array) {
  const int = (x: Uint8Array) => {
    let i = 0;
    while (i < x.length - 1 && x[i] === 0) i++;
    x = x.slice(i);
    return x[0] & 0x80 ? cat([0], x) : x;
  };
  const r = int(raw.slice(0, 32)), s = int(raw.slice(32));
  return cat([0x30, r.length + s.length + 4, 0x02, r.length], r, [0x02, s.length], s);
}

async function makeAuthenticator() {
  const keys = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await subtle.exportKey("jwk", keys.publicKey);
  const cose = isoCBOR.encode(new Map<number, number | Uint8Array>([
    [1, 2], [3, -7], [-1, 1], [-2, isoBase64URL.toBuffer(jwk.x!)], [-3, isoBase64URL.toBuffer(jwk.y!)],
  ]));
  const credId = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const rpHash = await sha(utf8("localhost"));
  let counter = 0;
  return {
    id: b64u(credId),
    attest: (challenge: string) => ({
      id: b64u(credId), rawId: b64u(credId), type: "public-key", clientExtensionResults: {},
      response: {
        clientDataJSON: b64u(utf8(JSON.stringify({ type: "webauthn.create", challenge, origin: ORIGIN }))),
        attestationObject: b64u(isoCBOR.encode(new Map<string, any>([
          ["fmt", "none"], ["attStmt", new Map()],
          ["authData", cat(rpHash, [0x45], u32(0), new Uint8Array(16), [0, credId.length], credId, cose)],
        ]))),
        transports: ["internal"],
      },
    }),
    async assert(challenge: string, origin = ORIGIN) {
      const authData = cat(rpHash, [0x05], u32(++counter)); // user present + verified
      const clientData = utf8(JSON.stringify({ type: "webauthn.get", challenge, origin }));
      const sig = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, cat(authData, await sha(clientData))));
      return {
        id: b64u(credId), rawId: b64u(credId), type: "public-key", clientExtensionResults: {},
        response: { clientDataJSON: b64u(clientData), authenticatorData: b64u(authData), signature: b64u(der(sig)) },
      };
    },
  };
}

const rejects = async (p: Promise<unknown>, pattern: RegExp) =>
  assert.match(String(((await p.then(() => ({})).catch((e) => e)) as any)?.data ?? "resolved"), pattern);
const signInChallenge = async () => {
  const was = signedIn;
  signedIn = null;
  const { challenge } = await call("passkeys:signInOptions", {});
  signedIn = was;
  return challenge as string;
};
const verify = (response: object) => call("passkeys:verifySignIn", { response });

/* ------------------------------------ checks ------------------------------------ */

const phone = await makeAuthenticator();
signedIn = userId;

// Adding a key needs the password again, and a wrong one creates no challenge.
await rejects(call("passkeys:registerOptions", { password: "wrong password" }), /Wrong password/);
assert.equal(rows("passkeyChallenges").length, 0);
const reg = await call("passkeys:registerOptions", { password: PASSWORD });
assert.equal(reg.rp.id, "localhost");
assert.equal(reg.authenticatorSelection.residentKey, "required");
assert.equal(reg.authenticatorSelection.userVerification, "required");

const attestation = phone.attest(reg.challenge);
await call("passkeys:register", { response: attestation });
assert.equal((await call("passkeys:list", {})).length, 1);
await rejects(call("passkeys:register", { response: attestation }), /Could not add/); // challenge is single-use
const again = await call("passkeys:registerOptions", { password: PASSWORD });
assert.equal(again.excludeCredentials.length, 1, "the same device can't be added twice");

// Signing in.
assert.equal(await verify(await phone.assert(await signInChallenge())), userId, "valid fingerprint signs in");
assert.ok((await db.query("passkeys").withIndex("by_user", (q) => q.eq("userId", userId)).unique())?.lastUsedAt);
const used = await phone.assert(await signInChallenge());
assert.equal(await verify(used), userId);
assert.equal(await verify(used), null, "replayed sign-in rejected");
assert.equal(await verify(await phone.assert(await signInChallenge(), "https://evil.example")), null, "other site rejected");
const forged = await phone.assert(await signInChallenge());
forged.response.signature = b64u(der(globalThis.crypto.getRandomValues(new Uint8Array(64))));
assert.equal(await verify(forged), null, "forged signature rejected");
assert.equal(await verify(await phone.assert(again.challenge)), null, "an add-key challenge can't sign in");
const stale = await signInChallenge();
await db.patch(rows("passkeyChallenges").find((r) => r.challenge === stale)!._id, { expiresAt: Date.now() - 1 });
assert.equal(await verify(await phone.assert(stale)), null, "expired challenge rejected");
const stranger = await makeAuthenticator();
assert.equal(await verify(await stranger.assert(await signInChallenge())), null, "unknown key rejected");

// Removing, and account deletion.
const [key] = await call("passkeys:list", {});
await call("passkeys:remove", { id: key._id });
assert.equal(await verify(await phone.assert(await signInChallenge())), null, "removed key can't sign in");
await call("passkeys:register", {
  response: phone.attest((await call("passkeys:registerOptions", { password: PASSWORD })).challenge),
});
await passkeys.erasePasskeys(ctx, userId as any);
assert.equal(rows("passkeys").length, 0, "account deletion erases keys");

console.log("✓ fingerprint sign-in: password gate, single-use challenges, origin, signature, removal");
