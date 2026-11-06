import type { SetTest } from "../types.ts";
import {
  ADVANCED_COLLECTIVES,
  ADVANCED_INSTRUCTIONS,
  ADVANCED_PURPOSE,
  DRAW,
  LEAVE,
  change,
  changeOn,
  changes,
  diag,
  half,
  halt,
  lateral,
  line,
  mv,
  reinBack,
  yieldTo,
} from "./shared.ts";

const enter = mv(
  1,
  [
    ["A", "Enter collected canter"],
    ["X", "Halt, Salute"],
    ["", "Proceed in collected trot"],
  ],
  "Engagement, collection and quality of paces; well defined transitions; straightness, attentiveness; immobility (min. 3 secs)",
  [line(["A", "X", "C"]), halt("X")],
  { pace: "canter" },
);

const shoulderRight = mv(
  4,
  [["K E", "Shoulder-in right"]],
  "Angle, bend and balance; engagement and collection",
  line(["K", "E"]),
);
const halfPassRight = mv(
  5,
  [
    ["E G", "Half pass right"],
    ["C", "Track right"],
  ],
  "Alignment, bend, fluency and crossing of legs; engagement and collection",
  [yieldTo("E", "G"), line(["G", "C", "M"])],
);
const shoulderLeft = mv(
  9,
  [["F B", "Shoulder-in left"]],
  "Alignment, bend, fluency and crossing of legs; engagement and collection",
  line(["F", "B"]),
);
const halfPassLeft = mv(
  10,
  [
    ["B G", "Half pass left"],
    ["C", "Track left"],
    ["C H", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and collection",
  [yieldTo("B", "G"), line(["G", "C", "H"])],
);
const canterLeft = mv(
  15,
  [
    ["F X", "Half pass left"],
    ["I S", "Half 10m circle"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [yieldTo("F", "X"), line(["X", "I"]), half("I", "S", "C")],
  { pace: "canter" },
);
const canterRight = mv(
  18,
  [
    ["M X", "Half pass right"],
    ["L V", "Half 10m circle"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [yieldTo("M", "X"), line(["X", "L"]), half("L", "V", "A")],
  { pace: "canter" },
);

export const TEST_6C: SetTest = {
  id: "6c",
  short: "6C",
  name: "Advanced 6C",
  year: "ESNZ 2023",
  time: "6:00",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ADVANCED_PURPOSE,
  instructions: ADVANCED_INSTRUCTIONS,
  introduces: "Tempi changes every third stride; half working pirouettes in canter",
  leave: LEAVE,
  collectives: ADVANCED_COLLECTIVES,
  movements: [
    enter,
    mv(
      2,
      [
        ["C", "Track left"],
        ["H X F", "Change rein, medium trot"],
        ["F A K", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement; elasticity; suspension; straightness and uphill balance",
      [line(["C", "H"]), diag("H", "F"), line(["F", "A", "K"])],
      { pace: "medium" },
    ),
    mv(
      3,
      [["", "(Transitions at H & F)"]],
      "Well defined maintaining tempo and balance",
      diag("H", "F"),
      { pace: "medium" },
    ),
    lateral(shoulderRight, "shoulder-in", "right", "K", "E"),
    lateral(halfPassRight, "half-pass", "right", "E", "G"),
    mv(
      6,
      [
        ["M X K", "Extended trot"],
        ["K A", "Collected trot"],
      ],
      "Utmost ground cover with lengthening of frame, engagement, elasticity, suspension, straightness and uphill balance",
      [diag("M", "K"), line(["K", "A"])],
      { pace: "extended" },
    ),
    mv(
      7,
      [["", "(Transitions at M & K)"]],
      "Well defined maintaining tempo and balance",
      diag("M", "K"),
      { pace: "extended", coeff: 2 },
    ),
    mv(
      8,
      [
        ["A", "Halt, rein back 4 steps"],
        ["", "Proceed in collected trot"],
        ["A F", "Collected trot"],
      ],
      "Immobility, willing steps back with correct rhythm and count; straightness; well defined transitions",
      [halt("A"), reinBack("A"), line(["A", "F"])],
      { coeff: 2 },
    ),
    lateral(shoulderLeft, "shoulder-in", "left", "F", "B"),
    lateral(halfPassLeft, "half-pass", "left", "B", "G"),
    mv(
      11,
      [["H", "Collected walk"]],
      "Regularity; suppleness of the back; activity; collection",
      line(["C", "H"]),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      12,
      [
        ["S R", "Half circle 20m extended walk"],
        ["R M C", "Collected walk"],
      ],
      "Regularity; suppleness of back; activity; over track; freedom of shoulder; stretching to the bit; well defined transitions",
      [half("S", "R", "C"), line(["R", "M", "C"])],
      { pace: "free", coeff: 2 },
    ),
    mv(
      13,
      [
        ["C", "Collected canter left lead"],
        ["C H", "Collected canter"],
      ],
      "Precise, fluent transition; engagement and collection",
      line(["C", "H"]),
      { pace: "canter" },
    ),
    mv(
      14,
      [
        ["H K", "Medium canter"],
        ["K F", "Collected canter"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      line(["H", "S", "E", "V", "K", "A", "F"]),
      { pace: "medium-canter" },
    ),
    lateral(canterLeft, "half-pass", "left", "F", "X"),
    mv(
      16,
      [
        ["S P", "On the diagonal"],
        ["Between X & P", "Working half-pirouette left approximately 2m in diameter"],
        ["", "Proceed collected canter"],
      ],
      "Size, bend and balance of working pirouette; straightness, regularity, engagement and collection of canter",
      [
        diag("S", "P"),
        {
          t: "pirouette",
          direction: "left",
          turn: "half",
          from: "S",
          to: "P",
          along: 0.75,
          diameterM: 2,
        },
      ],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      17,
      [
        ["S H C", "Counter canter"],
        ["C", "Flying change of lead"],
      ],
      "Clear, balanced, fluent, straight flying change",
      [line(["S", "H", "C"]), change("C")],
      { pace: "canter" },
    ),
    lateral(canterRight, "half-pass", "right", "M", "X"),
    mv(
      19,
      [
        ["V R", "On the diagonal"],
        ["Between X & R", "Working half-pirouette right approximately 2m in diameter"],
        ["", "Proceed collected canter"],
      ],
      "Size, bend and balance of working pirouette; straightness, regularity, engagement and collection of canter",
      [
        diag("V", "R"),
        {
          t: "pirouette",
          direction: "right",
          turn: "half",
          from: "V",
          to: "R",
          along: 0.75,
          diameterM: 2,
        },
      ],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      20,
      [
        ["V K A", "Counter canter"],
        ["A", "Flying change of lead"],
      ],
      "Clear, balanced, fluent, straight flying change",
      [line(["V", "K", "A"]), change("A")],
      { pace: "canter" },
    ),
    mv(
      21,
      [["F X H", "Change rein, extended canter"]],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance; well defined transitions",
      diag("F", "H"),
      { pace: "extended-canter" },
    ),
    mv(
      22,
      [
        ["H", "Collected canter and flying change"],
        ["H M", "Collected canter"],
      ],
      "Clear balanced, fluent, straight flying change on diagonal",
      [line(["H", "C", "M"]), changeOn("F", "H", 0.75)],
      { pace: "canter" },
    ),
    mv(
      23,
      [
        ["M X K", "Change rein, three flying changes every third stride"],
        ["K A", "Collected canter"],
      ],
      "Clear. Balanced, fluent, straight flying changes; engagement, quality of canter",
      [diag("M", "K"), ...changes("M", "K", [0.327, 0.5, 0.673]), line(["K", "A"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      24,
      [
        ["A", "Down the centre line"],
        ["X", "Halt, Salute"],
      ],
      "Bend and balance in turn; engagement, collection and quality of canter; well defined transition; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["A", "X"]), halt("X")],
      { pace: "canter" },
    ),
  ],
};
