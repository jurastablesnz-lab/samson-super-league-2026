import assert from "node:assert/strict";
import { test } from "node:test";
import { spokenLine } from "./spoken-line.ts";

const samples: [string, string][] = [
  ["P Circle left 15m", "pee Circle left 15 metre"],
  [
    "A Circle right 20m rising trot, allowing the horse to stretch forward and downward while maintaining contact",
    "ay Circle right 20 metre rising trot, allowing the horse to stretch forward and downward while maintaining contact",
  ],
  ["M V Change rein, lengthen stride in trot", "em vee Change rein, lengthen stride in trot"],
  ["A Enter in working trot. X Halt, salute", "ay Enter in working trot. ex Halt, salute"],
  ["B Volte left (8m Ø)", "bee Volte left 8 metre diameter"],
  ["Between G and M Half pirouette to the left", "Between gee and em Half pirouette to the left"],
  [
    "K X M On the diagonal 5 flying changes of leg every 3rd stride",
    "kay ex em On the diagonal 5 flying changes of leg every third stride",
  ],
  [
    "Between X & P Working half-pirouette left approximately 2m in diameter",
    "Between ex and pee Working half pirouette left approximately 2 metre in diameter",
  ],
  ["V L Half volte left (10m Ø)", "vee ell Half volte left 10 metre diameter"],
  [
    "L Halt, rein back 4 steps, proceed immediately in collected trot",
    "ell Halt, rein back 4 steps, proceed immediately in collected trot",
  ],
  ["X Halt. Immobility. Salute.", "ex Halt. Immobility. Salute."],
  ["(Collected walk) AK/RMG(H)G(M)GHC", "Collected walk ay kay or ar em gee aitch gee em gee aitch see"],
  ["H-X-F Change rein", "aitch ex eff Change rein"],
  ["immobility (min. 3 secs)", "immobility minimum 3 seconds"],
  ["Halt, immobility 3–4 seconds", "Halt, immobility 3 to 4 seconds"],
  ["Circle left 20 meters", "Circle left 20 metres"],
  ["on a long rein", "on a long rein"],
  ["1/2 pirouette and 1/4 pirouette", "half pirouette and quarter pirouette"],
  ["L/R rein, w/ contact, approx 10m, ctr", "left or right rein, with contact, approximately 10 metre, canter"],
  ["FS and MFS", "freestyle and musical freestyle"],
  ["60 × 20 and 3 x 4", "60 by 20 and 3 times 4"],
];

test("dressage shorthand is read as a caller would say it", () => {
  for (const [before, after] of samples) {
    assert.equal(spokenLine(before), after, before);
    assert.equal(spokenLine(after), after, `second pass ${before}`);
  }
});
