import type { SetTest } from "../types.ts";
import {
  ADVANCED_MEDIUM_COLLECTIVES,
  ADVANCED_MEDIUM_INSTRUCTIONS,
  ADVANCED_MEDIUM_PURPOSE,
  DRAW,
  LEAVE,
  changeOn,
  circle,
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

const shoulderLeft = mv(
  2,
  [
    ["C", "Track left"],
    ["S V", "Shoulder-in left"],
  ],
  "Angle, bend and balance; engagement and self carriage",
  line(["C", "H", "S", "V"]),
);

const halfPassLeft = mv(
  3,
  [
    ["V L", "Half circle left 10m"],
    ["L H", "Half pass left"],
    ["H R", "Collected trot"],
  ],
  "Shape and size of half circle; alignment, bend, fluency and crossing of legs; engagement and self carriage",
  [half("V", "L", "A", { travel: "A" }), yieldTo("L", "H"), line(["H", "C", "M", "R"])],
  { coeff: 2 },
);

const shoulderRight = mv(
  4,
  [["R P", "Shoulder-in right"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["R", "P"]),
);

const halfPassRight = mv(
  5,
  [
    ["P L", "Half circle right 10m"],
    ["L M", "Half pass right"],
    ["M H", "Collected trot"],
  ],
  "Shape and size of half circle; alignment, bend, fluency and crossing of legs; engagement and self carriage",
  [half("P", "L", "A"), yieldTo("L", "M"), line(["M", "C", "H"])],
  { coeff: 2 },
);

export const TEST_5A: SetTest = {
  id: "5a",
  short: "5A",
  name: "Advanced Medium 5A",
  year: "ESNZ 2023",
  time: "6:00",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ADVANCED_MEDIUM_PURPOSE,
  instructions: ADVANCED_MEDIUM_INSTRUCTIONS,
  introduces: "Single flying change, walk pirouette",
  leave: LEAVE,
  collectives: ADVANCED_MEDIUM_COLLECTIVES,
  movements: [
    enter,
    lateral(shoulderLeft, "shoulder-in", "left", "S", "V"),
    lateral(halfPassLeft, "half-pass", "left", "L", "H"),
    lateral(shoulderRight, "shoulder-in", "right", "R", "P"),
    lateral(halfPassRight, "half-pass", "right", "L", "M"),
    mv(
      6,
      [
        ["H X F", "Medium trot"],
        ["F A", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      [diag("H", "F"), line(["F", "A"])],
      { pace: "medium" },
    ),
    mv(
      7,
      [
        ["A", "Halt, rein back 4 steps"],
        ["", "Proceed in medium walk"],
        ["A K", "Medium walk"],
      ],
      "Immobility; willing steps back with correct rhythm and count; straightness; clear transitions",
      [halt("A"), reinBack("A"), line(["A", "K"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      8,
      [
        ["K R", "Change rein, extended walk"],
        ["R M", "Medium walk"],
      ],
      "Regularity; suppleness of back; activity; overtrack; freedom of shoulder; stretching to the bit; clear transitions",
      [diag("K", "R"), line(["R", "M"])],
      { pace: "free", coeff: 2 },
    ),
    mv(
      9,
      [
        ["M", "Turn left"],
        ["Between G & H", "Collect, half pirouette left"],
        ["", "Proceed in medium walk"],
      ],
      "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
      [line(["M", "C", "H", "G"]), turn("H")],
      { pace: "walk" },
    ),
    mv(
      10,
      [
        ["Between G & M", "Collect, half pirouette right"],
        ["", "Proceed in medium walk"],
        ["H", "Track right"],
      ],
      "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
      [turn("M"), line(["G", "H", "C"])],
      { pace: "walk" },
    ),
    mv(
      11,
      [["", "(Medium walk) RMG(H)G(M)GHC"]],
      "Regularity and quality of the walk",
      [line(["R", "M", "C", "H", "G"]), turn("H"), turn("M"), line(["G", "H", "C"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      12,
      [
        ["C", "Collect the stride in walk"],
        ["C M", "Collected canter right lead"],
      ],
      "Well defined transition; regularity and self carriage; engagement and quality of canter",
      line(["C", "M"]),
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["M F", "Medium canter"],
        ["F V", "Collected canter"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      [line(["M", "R", "B", "P", "F"]), diag("F", "V")],
      { pace: "medium-canter" },
    ),
    mv(
      14,
      [["V", "Circle right 10m"]],
      "Shape and size of circle; bend; engagement and self carriage",
      circle("V"),
      { pace: "canter" },
    ),
    mv(
      15,
      [
        ["V R", "Change rein, flying change between centre line and R"],
        ["R H", "Collected canter"],
      ],
      "Clear, balanced, fluent, straight flying change; engagement and self carriage",
      [diag("V", "R"), changeOn("V", "R", 0.75), line(["R", "M", "C", "H"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      16,
      [
        ["H K", "Extended canter"],
        ["K P", "Collected canter"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      [line(["H", "S", "E", "V", "K"]), line(["K", "A", "F", "P"])],
      { pace: "extended-canter" },
    ),
    mv(
      17,
      [["", "(Transitions at H & K)"]],
      "Well defined maintaining tempo and balance",
      line(["H", "S", "E", "V", "K"]),
      { pace: "extended-canter" },
    ),
    mv(
      18,
      [["P", "Circle left 10m"]],
      "Shape and size of circle; bend; engagement and self carriage",
      circle("P"),
      { pace: "canter" },
    ),
    mv(
      19,
      [
        ["P S", "Change rein, flying change between centre line and S"],
        ["S C", "Collected canter"],
      ],
      "Clear, balanced, fluent, straight flying change; engagement and self carriage",
      [diag("P", "S"), changeOn("P", "S", 0.75), line(["S", "H", "C"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      20,
      [["C M", "Collected trot"]],
      "Well defined, balanced, engaged transition; engagement and collection",
      line(["C", "M"]),
    ),
    mv(
      21,
      [
        ["M X K", "Extended trot"],
        ["K A", "Collected trot"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      [diag("M", "K"), line(["K", "A"])],
      { pace: "extended" },
    ),
    mv(
      22,
      [["", "(Transitions at M & K)"]],
      "Well defined maintaining tempo and balance",
      diag("M", "K"),
      { pace: "extended" },
    ),
    mv(
      23,
      [
        ["A", "Down centre line"],
        ["X", "Halt, Salute"],
      ],
      "Bend and balance in turn; engagement, self carriage and quality of trot; well defined transition; straightness; attentiveness; immobile (min. 3 secs)",
      [line(["A", "X"]), halt("X")],
    ),
  ],
};
