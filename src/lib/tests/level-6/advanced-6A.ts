import type { SetTest } from "../types.ts";
import {
  ADVANCED_COLLECTIVES,
  ADVANCED_INSTRUCTIONS,
  ADVANCED_PURPOSE,
  DRAW,
  LEAVE,
  change,
  changes,
  circle,
  diag,
  halt,
  lateral,
  line,
  mv,
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

const halfPassRight = mv(
  3,
  [["K X", "Half pass right"]],
  "Alignment, bend, fluency and crossing of legs; engagement and collection",
  yieldTo("K", "X"),
  { coeff: 2 },
);
const halfPassLeft = mv(
  4,
  [
    ["X H", "Half pass left"],
    ["H M", "Collected trot"],
  ],
  "Alignment, bend, fluency and crossing of legs; engagement and collection",
  [yieldTo("X", "H"), line(["H", "C", "M"])],
  { coeff: 2 },
);
const shoulderLeft = mv(
  7,
  [
    ["F B", "Shoulder-in left"],
    ["B", "Turn left"],
  ],
  "Angle, bend and balance; engagement and collection",
  [line(["F", "B"]), line(["B", "X"])],
);
const shoulderRight = mv(
  8,
  [
    ["E", "Turn right"],
    ["E H", "Shoulder-in right"],
    ["H C", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and collection",
  [line(["X", "E", "H", "C"])],
);
const canterRight = mv(
  14,
  [
    ["A", "Down centre line"],
    ["D B", "Half pass right"],
  ],
  "Alignment, bend while moving fluently forward and sideways; engagement and collection",
  [line(["A", "D"]), yieldTo("D", "B")],
  { pace: "canter", coeff: 2 },
);
const canterLeft = mv(
  18,
  [
    ["A", "Down centre line"],
    ["D E", "Half pass left"],
  ],
  "Alignment, bend while moving fluently forward and sideways; engagement and collection",
  [line(["A", "D"]), yieldTo("D", "E")],
  { pace: "canter" },
);

export const TEST_6A: SetTest = {
  id: "6a",
  short: "6A",
  name: "Advanced 6A",
  year: "ESNZ 2023",
  time: "6:00",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ADVANCED_PURPOSE,
  instructions: ADVANCED_INSTRUCTIONS,
  introduces:
    "Collected walk; counter change of hand in trot, very collected canter; multiple flying changes on a diagonal",
  leave: LEAVE,
  collectives: ADVANCED_COLLECTIVES,
  movements: [
    enter,
    mv(
      2,
      [
        ["C", "Track left"],
        ["H X F", "Change rein, medium trot"],
        ["Over X", "6-7 steps of collected trot"],
        ["F K", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; regularity and activity in collected steps; consistent tempo; well defined transitions",
      [line(["C", "H"]), diag("H", "F"), line(["F", "K"])],
      { pace: "medium", coeff: 2 },
    ),
    lateral(halfPassRight, "half-pass", "right", "K", "X"),
    lateral(halfPassLeft, "half-pass", "left", "X", "H"),
    mv(
      5,
      [
        ["M X K", "Change rein, extended trot"],
        ["K F", "Collected trot"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      [diag("M", "K"), line(["K", "A", "F"])],
      { pace: "extended" },
    ),
    mv(
      6,
      [["", "(Transitions at M & K)"]],
      "Well defined maintaining tempo and balance",
      diag("M", "K"),
      { pace: "extended" },
    ),
    lateral(shoulderLeft, "shoulder-in", "left", "F", "B"),
    lateral(shoulderRight, "shoulder-in", "right", "E", "H"),
    mv(
      9,
      [
        ["C", "Collected walk"],
        ["M", "Turn right"],
        ["Between G & H", "Half pirouette right"],
        ["", "Proceed in collected walk"],
      ],
      "Regularity; activity of hind legs; bend and fluency; size; self carriage",
      [line(["C", "M", "G"]), turn("H")],
      { pace: "walk" },
    ),
    mv(
      10,
      [
        ["Between G & M", "Half pirouette left"],
        ["", "Proceed in collected walk"],
        ["H", "Turn left"],
      ],
      "Regularity; activity of hind legs; bend and fluency; size",
      [turn("M"), line(["G", "H"])],
      { pace: "walk" },
    ),
    mv(
      11,
      [["", "(Collected walks) CMG(H)G(M)GHS"]],
      "Regularity; suppleness of the back; activity; collection",
      [line(["C", "M", "G"]), turn("H"), turn("M"), line(["G", "H", "S"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      12,
      [
        ["S P", "Extended walk"],
        ["P F", "Collected walk"],
      ],
      "Regularity; suppleness of back; activity; overtrack; freedom of shoulder; stretching to the bit; well defined transitions",
      [diag("S", "P"), line(["P", "F"])],
      { pace: "free", coeff: 2 },
    ),
    mv(
      13,
      [
        ["F", "Collected canter right lead"],
        ["F A", "Collected canter"],
      ],
      "Precise, fluent transition; engagement and collection",
      line(["F", "A"]),
      { pace: "canter" },
    ),
    lateral(canterRight, "half-pass", "right", "D", "B"),
    mv(
      15,
      [
        ["B M", "Counter canter"],
        ["M", "Flying change of lead"],
        ["M C", "Collected canter"],
      ],
      "Straightness, engagement and collection; clear, balanced, fluent flying change",
      [line(["B", "M", "C"]), change("M")],
      { pace: "canter" },
    ),
    mv(
      16,
      [
        ["C", "Circle left 20m, 5-6 strides of very collected canter between quarterlines"],
        ["C H", "Collected canter"],
      ],
      "Well defined transitions; engagement and collection throughout; shape, size and bend of circle",
      [
        circle("C", 20),
        { t: "circle", at: "C", m: 10, betweenQuarterlines: true },
        line(["C", "H"]),
      ],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      17,
      [
        ["H K", "Medium canter"],
        ["K A", "Collected canter"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      line(["H", "S", "E", "V", "K", "A"]),
      { pace: "medium-canter" },
    ),
    lateral(canterLeft, "half-pass", "left", "D", "E"),
    mv(
      19,
      [
        ["E H", "Counter canter"],
        ["H", "Flying change of lead"],
        ["H M", "Collected canter"],
      ],
      "Straightness, engagement and collection; clear, balanced, fluent flying change",
      [line(["E", "H", "C", "M"]), change("H")],
      { pace: "canter" },
    ),
    mv(
      20,
      [
        ["M F", "Extended canter"],
        ["F A", "Collected canter"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      line(["M", "R", "B", "P", "F", "A"]),
      { pace: "extended-canter" },
    ),
    mv(
      21,
      [["", "(Transitions at M & F)"]],
      "Well defined maintaining tempo and balance",
      line(["M", "R", "B", "P", "F"]),
      { pace: "extended-canter" },
    ),
    mv(
      22,
      [
        [
          "K X M",
          "Change rein, three single flying changes of lead, near first quarterline, at X, and near last quarterline",
        ],
        ["M H", "Collected canter"],
      ],
      "Quality of canter; clear, balanced, fluent. Straight flying changes; engagement",
      [diag("K", "M"), ...changes("K", "M", [0.174, 0.5, 0.802]), line(["M", "C", "H"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      23,
      [["H", "Collected trot"]],
      "Well defined transition maintaining tempo and balance",
      line(["H", "E"]),
    ),
    mv(
      24,
      [
        ["E", "Turn left"],
        ["X", "Turn left"],
        ["G", "Halt, Salute"],
      ],
      "Bend and balance in turns; engagement, collection and quality of canter; well defined transition; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["E", "X", "G"]), halt("G")],
    ),
  ],
};
