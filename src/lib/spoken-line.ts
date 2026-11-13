/**
 * How a dressage line should be said.
 * The sheets use shorthand the voice reads wrongly: "15m" becomes "15 minutes",
 * and a lone "A" becomes the article. This is applied before either voice speaks
 * and before the audio is cached, and it is safe to run twice.
 *
 * Patterns found in the test sheets:
 * - distances: 5m, 8m, 10m, 12m, 15m, 20m, and the US spelling "meters"
 * - diameter mark: 8m Ø, 10m Ø, 20m Ø
 * - ranges: 3–4, 4–5, 3-5, 2-4, 4- 6, 5 – 7
 * - ordinals: 2nd, 3rd, 4th stride
 * - fractions, when written 1/2, ½, 1/4, or ¼
 * - abbreviations: min., sec, secs, approx, ctr, FS, MFS, w/
 * - L/R for left or right rein
 * - ampersand: Between A & K, Immobility & Salute
 * - slashes in letter paths: AK/RMG, and word slashes
 * - parentheses and optional letters: (10m Ø), G(M), (min. 3 secs)
 * - hyphenated compounds: half-pirouette, half-pass
 * - letter routes: H-X-F, B–X–E, C-H-G-(M)-G-M, H X F, KXM
 * - single arena letters: A, X, C, K, and the rest of the alphabet when they stand alone
 * - "x" between numbers as times, and "×" as by (60 × 20)
 */

const LETTERS: Record<string, string> = {
  A: "ay",
  B: "bee",
  C: "see",
  D: "dee",
  E: "ee",
  F: "eff",
  G: "gee",
  H: "aitch",
  I: "eye",
  J: "jay",
  K: "kay",
  L: "ell",
  M: "em",
  N: "en",
  O: "oh",
  P: "pee",
  Q: "cue",
  R: "ar",
  S: "ess",
  T: "tee",
  U: "you",
  V: "vee",
  W: "double you",
  X: "ex",
  Y: "why",
  Z: "zed",
};

const ORDINALS = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
];

function swap(text: string, pattern: RegExp, replacement: string): string {
  let next = text;
  for (let i = 0; i < 8; i += 1) {
    const replaced = next.replace(pattern, replacement);
    if (replaced === next) return next;
    next = replaced;
  }
  return next;
}

function spellToken(token: string): string {
  const match = token.match(/^([^A-Za-z]*)([A-Z]{1,12})([^A-Za-z]*)$/);
  if (!match) return token;
  const spoken = [...match[2]].map((letter) => LETTERS[letter] ?? letter).join(" ");
  return `${match[1]}${spoken}${match[3]}`;
}

/** The words to send to a voice. Screen text is left as written. */
export function spokenLine(raw: string): string {
  let text = raw.replace(/\u00a0/g, " ").replace(/[–—]/g, "-");
  text = text.replace(/\band\s*\/\s*or\b/gi, "or");
  text = text.replace(/\bw\//gi, "with ");
  text = text.replace(/\bL\s*\/\s*R\b/g, "left or right");
  text = text.replace(/\(([A-Z])\)/g, " $1 ");
  text = text.replace(/(\d+)\s*m?\s*Ø/g, "$1 metre diameter");
  text = text.replace(/Ø/g, " diameter ");
  text = text.replace(/(\d+)\s*-\s*(\d+)/g, "$1 to $2");
  text = swap(text, /([A-Z])\s*-\s*([A-Z])/g, "$1 $2");
  text = swap(text, /([A-Za-z]{2,})-([A-Za-z]{2,})/g, "$1 $2");
  text = text.replace(/\bMFS\b/gi, "musical freestyle");
  text = text.replace(/\bFS\b/gi, "freestyle");
  text = text.replace(/\bmin\./gi, "minimum");
  text = text.replace(/\bmin\b/gi, "minimum");
  text = text.replace(/\bsecs?\b/gi, "seconds");
  text = text.replace(/\bapprox\./gi, "approximately");
  text = text.replace(/\bapprox\b/gi, "approximately");
  text = text.replace(/\bctr\b/gi, "canter");
  text = text.replace(/\bmeters\b/gi, "metres");
  text = text.replace(/\bmeter\b/gi, "metre");
  text = text.replace(/(\d+)\s*m\b/g, "$1 metre");
  text = text.replace(/\b1\s*\/\s*2\b/g, "half").replace(/½/g, "half");
  text = text.replace(/\b1\s*\/\s*4\b/g, "quarter").replace(/¼/g, "quarter");
  text = text.replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (full, digits: string) => {
    const word = ORDINALS[Number(digits)];
    return word || full;
  });
  text = text.replace(/(\d+)\s*×\s*(\d+)/g, "$1 by $2");
  text = text.replace(/(\d+)\s+x\s+(\d+)/g, "$1 times $2");
  text = text.replace(/&/g, " and ");
  text = swap(text, /([A-Za-z]+)\/([A-Za-z]+)/g, "$1 or $2");
  text = text.replace(/[()]/g, " ");
  text = text
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : spellToken(part)))
    .join("");
  return text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
