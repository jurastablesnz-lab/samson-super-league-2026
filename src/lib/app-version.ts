declare const __XSALUTE_VERSION__: string | undefined;

/** Set at build time in vite.config.ts: short commit and build time, e.g. "35efb03 · 2026-11-26 14:05". */
export const APP_VERSION: string =
  typeof __XSALUTE_VERSION__ === "string" && __XSALUTE_VERSION__ ? __XSALUTE_VERSION__ : "dev";
