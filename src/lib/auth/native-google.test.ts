import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer, type ViteDevServer } from "vite";
import { handleOAuthUserInfo } from "better-auth/oauth2";
import type { GenericEndpointContext } from "better-auth";
import { hasNativeGoogleCredentials } from "./native-google-config.ts";

// The real auth module reads process.env at import time, so this suite must own
// its env. Run it directly (as package.json does), not in a shared test process.
const savedEnv = { ...process.env };
let vite: ViteDevServer;

before(async () => {
  delete process.env.DATABASE_URL;
  delete process.env.BETA_ADMIN_TRUST_PASSWORD;
  Object.assign(process.env, {
    VITE_AUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "fake-client-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "fake-client-secret",
    BETTER_AUTH_URL: "https://app.xsalute.co.nz",
    BETTER_AUTH_SECRET: "local-test-secret-not-for-production",
  });
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
});

after(async () => {
  await vite?.close();
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
});

test("native Google requires both credentials", () => {
  assert.equal(hasNativeGoogleCredentials("id", "secret"), true);
  assert.equal(hasNativeGoogleCredentials(undefined, "secret"), false);
  assert.equal(hasNativeGoogleCredentials("id", undefined), false);
  assert.equal(hasNativeGoogleCredentials(undefined, undefined), false);
});

test("Google URL, popup, broker fallback, account linking and admin are preserved", async () => {
  const { auth, nativeGoogleEnabled } = await vite.ssrLoadModule("/src/lib/auth/server.ts");
  const { handleAuthPopupRequest } = await vite.ssrLoadModule("/src/lib/auth/popup.server.ts");
  const { getSql } = await vite.ssrLoadModule("/src/lib/db.ts");
  const { loadUser } = await vite.ssrLoadModule("/src/lib/beta.server.ts");
  assert.equal(nativeGoogleEnabled, true);

  const headers = new Headers({
    host: "app.xsalute.co.nz",
    "x-forwarded-host": "app.xsalute.co.nz",
    "x-forwarded-proto": "https",
    origin: "https://app.xsalute.co.nz",
  });
  const response = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: "/", errorCallbackURL: "/login" },
    headers,
    asResponse: true,
  });
  assert.equal(response.status, 200, await response.clone().text());
  const { url } = await response.json();
  const authorize = new URL(url);
  assert.equal(authorize.origin, "https://accounts.google.com");
  assert.equal(authorize.pathname, "/o/oauth2/v2/auth");
  assert.equal(
    authorize.searchParams.get("client_id"),
    "fake-client-id.apps.googleusercontent.com",
  );
  assert.equal(
    authorize.searchParams.get("redirect_uri"),
    "https://app.xsalute.co.nz/api/auth/callback/google",
  );
  assert.equal(authorize.searchParams.get("prompt"), "select_account");
  assert.match(authorize.searchParams.get("scope") ?? "", /openid/);
  assert.ok(authorize.searchParams.get("state"));

  // Buttons still pass grok-google in the preview; the popup resolves it to
  // native Google while preserving the first-party callback + 302 flow.
  const popup = await handleAuthPopupRequest(
    new Request("https://app.xsalute.co.nz/auth/popup?providerId=grok-google", { headers }),
  );
  assert.equal(popup.status, 302);
  assert.equal(
    new URL(popup.headers.get("location") ?? "").searchParams.get("redirect_uri"),
    "https://app.xsalute.co.nz/api/auth/callback/google",
  );

  // Native mode does not remove the existing genericOAuth broker provider.
  const broker = await auth.api.signInWithOAuth2({
    body: { providerId: "grok-google", callbackURL: "/", errorCallbackURL: "/login" },
    headers,
    asResponse: true,
  });
  assert.equal(broker.status, 200);
  assert.equal(new URL((await broker.json()).url).origin, "https://auth.grok.me");

  const ctx = await auth.$context;
  const owner = await ctx.internalAdapter.createOAuthUser(
    { name: "Owner", email: "virtualdressagenz@gmail.com", emailVerified: true },
    { providerId: "grok-google", accountId: "broker-google-owner" },
  );
  // Exercise the existing email/password sign-up, not a synthetic account only.
  const passwordResponse = await auth.api.signUpEmail({
    body: { name: "Password Rider", email: "rider@example.com", password: "test-password-123" },
    headers,
    asResponse: true,
  });
  assert.equal(passwordResponse.status, 200, await passwordResponse.clone().text());
  const passwordUser = (await passwordResponse.json()).user;

  for (const [expected, email, googleSub] of [
    [owner.user.id, "virtualdressagenz@gmail.com", "native-owner"],
    [passwordUser.id, "rider@example.com", "native-rider"],
  ]) {
    const linked = await handleOAuthUserInfo({ context: ctx } as GenericEndpointContext, {
      userInfo: { id: googleSub, name: "Google User", email, emailVerified: true },
      account: { providerId: "google", accountId: googleSub },
    });
    assert.equal(linked.error, null);
    assert.equal(linked.data.user.id, expected);
  }

  const sql = await getSql();
  assert.equal((await sql`select id from "user"`).length, 2);
  const accounts = await sql<{ userId: string; providerId: string }>`
    select "userId", "providerId" from account`;
  assert.equal(
    accounts.filter((a: { userId: string; providerId: string }) => a.providerId === "google")
      .length,
    2,
  );
  assert.equal(
    accounts.filter((a: { userId: string; providerId: string }) => a.userId === owner.user.id)
      .length,
    2,
  );
  assert.equal(
    accounts.filter((a: { userId: string; providerId: string }) => a.userId === passwordUser.id)
      .length,
    2,
  );

  const admin = await loadUser(owner.user.id);
  assert.equal(admin.id, owner.user.id);
  assert.equal(admin.isAdmin, true);
  const passwordSignIn = await auth.api.signInEmail({
    body: { email: "rider@example.com", password: "test-password-123" },
    headers,
    asResponse: true,
  });
  assert.equal(passwordSignIn.status, 200);
});
