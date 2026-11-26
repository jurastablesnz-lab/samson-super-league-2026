import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customHostOrigins,
  deployedBaseURL,
  parseCustomHosts,
  publicAppUrl,
} from "./public-hosts.ts";

const INJECTED = "https://samson2026.grok.me";

describe("parseCustomHosts", () => {
  it("defaults to the XSalute custom domain", () => {
    assert.deepEqual(parseCustomHosts(undefined), ["app.xsalute.co.nz"]);
    assert.deepEqual(parseCustomHosts("  "), ["app.xsalute.co.nz"]);
  });
  it("can be switched off", () => {
    assert.deepEqual(parseCustomHosts("off"), []);
  });
  it("accepts a list and strips schemes and paths", () => {
    assert.deepEqual(parseCustomHosts("https://A.example.com/x, b.example.com"), [
      "a.example.com",
      "b.example.com",
    ]);
  });
  it("drops junk", () => {
    assert.deepEqual(parseCustomHosts("bad_host!, ok.example.com"), ["ok.example.com"]);
  });
});

describe("deployedBaseURL", () => {
  it("allows both the injected host and the custom domain, falling back to the injected URL", () => {
    assert.deepEqual(deployedBaseURL(INJECTED, ["app.xsalute.co.nz"]), {
      allowedHosts: ["samson2026.grok.me", "app.xsalute.co.nz"],
      protocol: "https",
      fallback: INJECTED,
    });
  });
  it("keeps the plain string when there is no extra host", () => {
    assert.equal(deployedBaseURL(INJECTED, []), INJECTED);
    assert.equal(
      deployedBaseURL("https://app.xsalute.co.nz", ["app.xsalute.co.nz"]),
      "https://app.xsalute.co.nz",
    );
  });
});

describe("customHostOrigins / publicAppUrl", () => {
  it("builds https origins", () => {
    assert.deepEqual(customHostOrigins(["app.xsalute.co.nz"]), ["https://app.xsalute.co.nz"]);
  });
  it("prefers the custom domain for email links", () => {
    assert.equal(publicAppUrl(INJECTED, ["app.xsalute.co.nz"]), "https://app.xsalute.co.nz");
    assert.equal(publicAppUrl(`${INJECTED}/`, []), INJECTED);
    assert.equal(publicAppUrl(undefined, []), null);
  });
});
