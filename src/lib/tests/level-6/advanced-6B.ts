import type { SetTest } from "../types.ts";
import {
  ADVANCED_COLLECTIVES,
  ADVANCED_INSTRUCTIONS,
  ADVANCED_PURPOSE,
  DRAW,
  LEAVE,
  change,
  diag,
  halt,
  lateral,
  line,
  mv,
  pirouette,
  turn,
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
  2,
  [
    ["C", "Track right"],
    ["M B", "Shoulder-in right"],
  ],
  "Angle, bend and balance; engagement and collection",
  line(["C", "M", "B"]),
);
const halfPassLeft = mv(
  4,
  [
    ["A", "Down centre line"],
    ["D E", "Half pass left"],
  ],
  "Alignment, bend, fluency and crossing of legs; engagement and collection",
  [line(["A", "D"]), yieldTo("D", "E")],
  { coeff: 2 },
);
const halfPassRight = mv(
  5,
  [
    ["E G", "Half pass right"],
    ["C H", "Track left"],
  ],
  "Supple change of bend; alignment; fluency and crossing of legs; engagement and collection",
  [yieldTo("E", "G"), line(["G", "C", "H"])],
  { coeff: 2 },
);
const shoulderLeft = mv(
  6,
  [["H E", "Shoulder-in left"]],
  "Angle, bend and balance; engagement and collection",
  line(["H", "E"]),
);
const canterRight = mv(
  14,
  [
    ["A", "Down centre line"],
    ["D B", "Half pass right"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [line(["A", "D"]), yieldTo("D", "B")],
  { pace: "canter" },
);
const canterLeft = mv(
  16,
  [
    ["B G", "Half pass left"],
    ["C H", "Track left"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [yieldTo("B", "G"), line(["G", "C", "H"])],
  { pace: "canter" },
);

export const TEST_6B: SetTest = {
  id: "6b",
  short: "6B",
  name: "Advanced 6B",
  year: "ESNZ 2023",
  time: "5:30",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ADVANCED_PURPOSE,
  instructions: ADVANCED_INSTRUCTIONS,
  introduces:
    "Counter changes of hand in canter, tempi changes every fourth stride; working partial pirouettes in canter",
  leave: LEAVE,
  collectives: ADVANCED_COLLECTIVES,
  movements: [
    enter,
    lateral(shoulderRight, "shoulder-in", "right", "M", "B"),
    mv(
      3,
      [
        ["B K", "Change rein, medium trot"],
        ["K A", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      [diag("B", "K"), line(["K", "A"])],
      { pace: "medium" },
    ),
    lateral(halfPassLeft, "half-pass", "left", "D", "E"),
    lateral(halfPassRight, "half-pass", "right", "E", "G"),
    lateral(shoulderLeft, "shoulder-in", "left", "H", "E"),
    mv(
      7,
      [
        ["E F", "Change rein, medium trot"],
        ["F A", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      [diag("E", "F"), line(["F", "A"])],
      { pace: "medium" },
    ),
    mv(
      8,
      [
        ["A", "Collected walk"],
        ["K R", "Change rein, extended walk"],
      ],
      "Regularity; suppleness of back; activity; overtrack; freedom of shoulder; stretching to the bit; well defined transitions",
      [line(["A", "K"]), diag("K", "R")],
      { pace: "free", coeff: 2 },
    ),
    mv(
      9,
      [
        ["R", "Collected walk"],
        ["M", "Turn left"],
        ["Between G & H", "Half pirouette left"],
        ["", "Proceed collected walk"],
      ],
      "Regularity; activity of hind legs; bend, fluency; size; self carriage",
      [line(["R", "M", "G"]), turn("H")],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      10,
      [
        ["Between G & M", "Half pirouette right"],
        ["", "Proceed collected walk"],
        ["H", "Turn right"],
      ],
      "Regularity; activity of hind legs; bend, fluency; size; self carriage",
      [turn("M"), line(["G", "H"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      11,
      [["", "(Collected walk) AK/RMG(H)G(M)GHC"]],
      "Regularity; suppleness of the back; activity; collection",
      [line(["A", "K"]), line(["R", "M", "G"]), turn("H"), turn("M"), line(["G", "H", "C"])],
      { pace: "walk" },
    ),
    mv(
      12,
      [
        ["C", "Collected canter right lead"],
        ["C M", "Collected canter"],
      ],
      "Precise, fluent transition; engagement and collection",
      line(["C", "M"]),
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["M F", "Medium canter"],
        ["F A", "Collected canter"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      line(["M", "R", "B", "P", "F", "A"]),
      { pace: "medium-canter" },
    ),
    lateral(canterRight, "half-pass", "right", "D", "B"),
    mv(
      15,
      [["B", "Flying change of lead"]],
      "Clear, balanced, fluent, straight flying change, engagement and collection",
      [line(["B", "M"]), change("B")],
      { pace: "canter" },
    ),
    lateral(canterLeft, "half-pass", "left", "B", "G"),
    mv(
      17,
      [["H X F", "Change rein in extended canter"]],
      "Utmost ground cover with lengthening of frame; engagement; elasticity; suspension, straightness; well defined transitions maintaining tempo and balance",
      diag("H", "F"),
      { pace: "extended-canter" },
    ),
    mv(
      18,
      [["F", "Collect the canter and flying change of lead"]],
      "Straightness and uphill balance; well defined transition; clear balanced, fluent, straight flying change",
      [line(["F", "A", "K"]), change("F")],
      { pace: "canter" },
    ),
    mv(
      19,
      [
        ["K X", "On diagonal develop very collected canter"],
        ["Approaching X", "Working quarter pirouette right toward the letter F"],
        ["F A K", "Collected canter"],
      ],
      "Bend and balance of working pirouette; straightness, regularity, engagement and collection of canter",
      [line(["K", "X"]), pirouette("X", "right"), line(["X", "F", "A", "K"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      20,
      [
        ["K X M", "Change rein, three flying changes every fourth stride"],
        ["M C H", "Collected canter"],
      ],
      "Clear, balanced, fluent, straight flying changes; engagement, quality of canter",
      [diag("K", "M"), change("X"), line(["M", "C", "H"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      21,
      [
        ["H X", "On diagonal develop very collected canter"],
        ["Approaching X", "Working quarter pirouette left toward the letter M"],
        ["M C H", "Collected canter"],
      ],
      "Bend and balance of working pirouette; straightness, regularity, engagement and collection of canter",
      [line(["H", "X"]), pirouette("X", "left"), line(["X", "M", "C", "H"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      22,
      [["H S", "Collected trot"]],
      "Well defined, balanced, engaged transition; engagement and collection",
      line(["H", "S"]),
    ),
    mv(
      23,
      [
        ["S F", "Change rein, extended trot"],
        ["F A", "Collected trot"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      [diag("S", "F"), line(["F", "A"])],
      { pace: "extended" },
    ),
    mv(
      24,
      [
        ["A", "Down centre line"],
        ["X", "Halt, Salute"],
      ],
      "Bend and balance in turn; engagement, collection and quality of trot; well defined transition; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["A", "X"]), halt("X")],
    ),
  ],
};
