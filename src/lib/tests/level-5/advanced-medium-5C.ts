import type { SetTest } from "../types.ts";
import {
  ADVANCED_MEDIUM_COLLECTIVES,
  ADVANCED_MEDIUM_INSTRUCTIONS,
  ADVANCED_MEDIUM_PURPOSE,
  DRAW,
  LEAVE,
  changeOn,
  diag,
  half,
  halt,
  lateral,
  line,
  mv,
  reinBack,
  turn,
  yieldTo,
} from "./shared.ts";

const enter = mv(
  1,
  [
    ["A", "Enter in collected trot"],
    ["X", "Halt, Salute"],
    ["", "Proceed in collected trot"],
  ],
  "Engagement, self carriage and quality of trot; well defined transitions; straightness, attentiveness; immobility (min. 3 secs)",
  [line(["A", "X", "C"]), halt("X")],
);

const shoulderRight = mv(
  3,
  [["K E", "Shoulder-in right"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["K", "E"]),
);
const halfPassLeft = mv(
  5,
  [
    ["B G", "Half pass left"],
    ["C", "Track right"],
    ["C M", "Collected trot"],
  ],
  "Alignment, bend, fluency and crossing of legs; engagement and self carriage",
  [yieldTo("B", "G"), line(["G", "C", "M"])],
  { coeff: 2 },
);
const shoulderLeft = mv(
  9,
  [["F B", "Shoulder-in left"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["F", "B"]),
);
const halfPassRight = mv(
  11,
  [
    ["E G", "Half pass right"],
    ["C", "Track left"],
  ],
  "Alignment, bend, fluency and crossing of legs; engagement and self carriage",
  [yieldTo("E", "G"), line(["G", "C", "H"])],
  { coeff: 2 },
);
const canterLeft = mv(
  17,
  [
    ["F X", "Half pass left"],
    ["X I", "Collected canter"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [yieldTo("F", "X"), line(["X", "I"])],
  { pace: "canter", coeff: 2 },
);
const canterRight = mv(
  19,
  [
    ["K X", "Half pass right"],
    ["X I", "Collected canter"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [yieldTo("K", "X"), line(["X", "I"])],
  { pace: "canter", coeff: 2 },
);

export const TEST_5C: SetTest = {
  id: "5c",
  short: "5C",
  name: "Advanced Medium 5C",
  year: "ESNZ 2023",
  time: "6:00",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ADVANCED_MEDIUM_PURPOSE,
  instructions: ADVANCED_MEDIUM_INSTRUCTIONS,
  introduces: "Rein back to trot",
  leave: LEAVE,
  collectives: ADVANCED_MEDIUM_COLLECTIVES,
  movements: [
    enter,
    mv(
      2,
      [
        ["C", "Track left"],
        ["H X F", "Change rein, medium trot"],
        ["F K", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      [line(["C", "H"]), diag("H", "F"), line(["F", "K"])],
      { pace: "medium" },
    ),
    lateral(shoulderRight, "shoulder-in", "right", "K", "E"),
    mv(
      4,
      [
        ["E X", "Half circle right 10m"],
        ["X B", "Half circle left 10m"],
      ],
      "Shape and size of half circles; supple change of bend on centre line; engagement and self carriage",
      [half("E", "X", "A", "right"), half("X", "B", "C", "left")],
    ),
    lateral(halfPassLeft, "half-pass", "left", "B", "G"),
    mv(
      6,
      [
        ["M X K", "Change rein, extended trot"],
        ["K A", "Collected trot"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      [diag("M", "K"), line(["K", "A"])],
      { pace: "extended" },
    ),
    mv(
      7,
      [["", "(Transitions at M & K)"]],
      "Well defined maintaining tempo and balance",
      diag("M", "K"),
      { pace: "extended" },
    ),
    mv(
      8,
      [
        ["A", "Halt, rein back 4 steps"],
        ["", "Proceed in collected trot"],
        ["A F", "Collected trot"],
      ],
      "Immobility. Willing steps back with correct rhythm and count; straightness; well defined transitions",
      [halt("A"), reinBack("A"), line(["A", "F"])],
      { coeff: 2 },
    ),
    lateral(shoulderLeft, "shoulder-in", "left", "F", "B"),
    mv(
      10,
      [
        ["B X", "Half circle left 10m"],
        ["X E", "Half circle right 10m"],
      ],
      "Shape and size of half circles; supple change of bend on centre line; engagement and self carriage",
      [half("B", "X", "C", "left"), half("X", "E", "A", "right")],
    ),
    lateral(halfPassRight, "half-pass", "right", "E", "G"),
    mv(
      12,
      [
        ["Between C & H", "Medium walk"],
        ["H", "Turn left"],
        ["Between G & M", "Collect the stride and half pirouette left"],
        ["", "Proceed medium walk"],
      ],
      "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
      [line(["C", "H", "G"]), turn("M")],
      { pace: "walk" },
    ),
    mv(
      13,
      [
        ["Between G & H", "Collect the stride and half pirouette right"],
        ["M", "Turn right"],
        ["M R", "Medium walk"],
      ],
      "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
      [turn("H"), line(["G", "M", "R"])],
      { pace: "walk" },
    ),
    mv(
      14,
      [["", "(Medium walk) CHG(M)G(H)GMR"]],
      "Regularity and quality of walk",
      [line(["C", "H", "G"]), turn("M"), turn("H"), line(["G", "M", "R"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      15,
      [
        ["R V", "Change rein, extended walk"],
        ["V K", "Medium walk"],
      ],
      "Regularity; suppleness of back; activity; overtrack; freedom of shoulder; stretching to the bit; clear, well defined transitions",
      [diag("R", "V"), line(["V", "K"])],
      { pace: "free", coeff: 2 },
    ),
    mv(
      16,
      [
        ["Before K", "Collect the stride in walk"],
        ["K", "Collected canter left lead"],
        ["K F", "Collected canter"],
      ],
      "Well defined transition; regularity and self carriage; engagement and quality of canter",
      line(["K", "A", "F"]),
      { pace: "canter" },
    ),
    lateral(canterLeft, "half-pass", "left", "F", "X"),
    mv(
      18,
      [
        ["I S", "Half circle left 10m"],
        ["S F", "Change rein, flying change of lead near centre line"],
        ["F K", "Collected canter"],
      ],
      "Shape and size of half circle; bend; clear, balanced, fluent, straight flying change; engagement and self carriage",
      [half("I", "S", "C"), diag("S", "F"), changeOn("S", "F", 0.5), line(["F", "K"])],
      { pace: "canter", coeff: 2 },
    ),
    lateral(canterRight, "half-pass", "right", "K", "X"),
    mv(
      20,
      [
        ["I R", "Half circle right 10m"],
        ["R K", "Change rein, flying change of lead near centre line"],
        ["K F", "Collected canter"],
      ],
      "Shape and size of half circle; bend; clear, balanced, fluent, straight flying change; engagement and self carriage",
      [half("I", "R", "C"), diag("R", "K"), changeOn("R", "K", 0.5), line(["K", "A", "F"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      21,
      [
        ["F M", "Extended canter"],
        ["M H", "Collected canter"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      line(["F", "P", "B", "R", "M", "C", "H"]),
      { pace: "extended-canter" },
    ),
    mv(
      22,
      [["", "(Transitions at F & M)"]],
      "Well defined maintaining tempo and balance",
      line(["F", "P", "B", "R", "M"]),
      { pace: "extended-canter" },
    ),
    mv(
      23,
      [["H E", "Collected trot"]],
      "Well defined, balanced, engaged transition; engagement and collection",
      line(["H", "E"]),
    ),
    mv(
      24,
      [
        ["E", "Turn left"],
        ["X", "Turn left"],
        ["G", "Halt, Salute"],
      ],
      "Bend and balance in turns; engagement, self carriage and quality of trot; well defined transition; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["E", "X", "G"]), halt("G")],
    ),
  ],
};
