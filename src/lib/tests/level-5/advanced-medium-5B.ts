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
    ["A", "Enter in collected trot"],
    ["X", "Halt, Salute"],
    ["", "Proceed in collected trot"],
  ],
  "Engagement, self carriage and quality of trot; well defined transitions; straightness, attentiveness; immobility (min. 3 secs)",
  [line(["A", "X", "C"]), halt("X")],
);

const shoulderLeft = mv(
  3,
  [["F B", "Shoulder-in left"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["F", "B"]),
);
const renversRight = mv(
  4,
  [["B M", "Renvers right"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["B", "M"]),
  { coeff: 2 },
);
const shoulderRight = mv(
  7,
  [["K E", "Shoulder-in right"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["K", "E"]),
);
const renversLeft = mv(
  8,
  [
    ["E H", "Renvers left"],
    ["H C", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and self carriage",
  [line(["E", "H"]), line(["H", "C"])],
  { coeff: 2 },
);
const halfPassRight = mv(
  14,
  [
    ["A", "Down centre line"],
    ["D R", "Half pass right"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self carriage",
  [line(["A", "D"]), yieldTo("D", "R")],
);
const halfPassLeft = mv(
  17,
  [
    ["A", "Down centre line"],
    ["D S", "Half pass left"],
  ],
  "Alignment, bend, fluency and crossing of legs; engagement and self carriage",
  [line(["A", "D"]), yieldTo("D", "S")],
);

export const TEST_5B: SetTest = {
  id: "5b",
  short: "5B",
  name: "Advanced Medium 5B",
  year: "ESNZ 2023",
  time: "5:35",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ADVANCED_MEDIUM_PURPOSE,
  instructions: ADVANCED_MEDIUM_INSTRUCTIONS,
  introduces: "Renvers, release of reins at canter",
  leave: LEAVE,
  collectives: ADVANCED_MEDIUM_COLLECTIVES,
  movements: [
    enter,
    mv(
      2,
      [
        ["C", "Track right"],
        ["M X K", "Change rein, medium trot"],
        ["K F", "Collected trot"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      [line(["C", "M"]), diag("M", "K"), line(["K", "F"])],
      { pace: "medium" },
    ),
    lateral(shoulderLeft, "shoulder-in", "left", "F", "B"),
    lateral(renversRight, "renvers", "right", "B", "M"),
    mv(
      5,
      [
        ["H X F", "Change rein, extended trot"],
        ["F K", "Collected trot"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      [diag("H", "F"), line(["F", "K"])],
      { pace: "extended", coeff: 2 },
    ),
    mv(
      6,
      [["", "(Transitions at H & F)"]],
      "Well defined maintaining tempo, balance; self carriage",
      diag("H", "F"),
      { pace: "extended" },
    ),
    lateral(shoulderRight, "shoulder-in", "right", "K", "E"),
    lateral(renversLeft, "renvers", "left", "E", "H"),
    mv(
      9,
      [
        ["C", "Medium walk"],
        ["M", "Turn right"],
        ["Between G & H", "Collect and, half pirouette right"],
        ["", "Proceed in medium walk"],
      ],
      "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
      [line(["C", "M", "G"]), turn("H")],
      { pace: "walk" },
    ),
    mv(
      10,
      [
        ["Between G & M", "Collect and, half pirouette left"],
        ["H", "Turn left"],
        ["H S", "Medium walk"],
      ],
      "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
      [turn("M"), line(["G", "H", "S"])],
      { pace: "walk" },
    ),
    mv(
      11,
      [["", "(Medium walk) CMG(H)G(M)GHS"]],
      "Regularity and quality of walk",
      [line(["C", "M", "G"]), turn("H"), turn("M"), line(["G", "H", "S"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      12,
      [
        ["S P", "Change rein, extended walk"],
        ["P", "Medium walk"],
      ],
      "Regularity; suppleness of back; activity; overtrack; freedom of shoulder; stretching to the bit; clear transitions",
      diag("S", "P"),
      { pace: "free", coeff: 2 },
    ),
    mv(
      13,
      [
        ["Before F", "Collect the stride in walk"],
        ["F A", "Collected canter right lead"],
      ],
      "Well defined transition; regularity and self carriage; engagement and quality of paces",
      line(["P", "F", "A"]),
      { pace: "canter" },
    ),
    lateral(halfPassRight, "half-pass", "right", "D", "R"),
    mv(
      15,
      [
        ["Between R & M", "Flying change of lead"],
        ["M H", "Collected canter"],
      ],
      "Clear, balanced, fluent, straight flying change; engagement and self carriage",
      [line(["R", "M", "C", "H"]), changeOn("R", "M", 0.5)],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      16,
      [
        ["H K", "Medium canter"],
        ["K A", "Collected canter"],
      ],
      "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; well defined transitions",
      line(["H", "S", "E", "V", "K", "A"]),
      { pace: "medium-canter" },
    ),
    lateral(halfPassLeft, "half-pass", "left", "D", "S"),
    mv(
      18,
      [
        ["Between S & H", "Flying change of lead"],
        ["H C", "Collected canter"],
      ],
      "Clear, balanced, fluent, straight flying change; engagement and self carriage",
      [line(["S", "H", "C"]), changeOn("S", "H", 0.5)],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      19,
      [
        [
          "C",
          "Circle right 20m showing a clear release of both reins for 4-5 strides over centre line",
        ],
        ["C M", "Collected canter"],
      ],
      "Clear release of reins maintaining self carriage; engagement and collection; shape, size, and bend of circle",
      [circle("C", 20), line(["C", "M"])],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      20,
      [
        ["M F", "Extended canter"],
        ["F A", "Collected canter"],
      ],
      "Utmost ground cover with lengthening of frame; elasticity; engagement, suspension; straightness and uphill balance",
      line(["M", "R", "B", "P", "F", "A"]),
      { pace: "extended-canter", coeff: 2 },
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
        ["A", "Down centre line"],
        ["L", "Collected trot"],
        ["I", "Halt, Salute"],
      ],
      "Bend and balance in turn; engagement, self carriage and quality of paces; well defined transitions; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["A", "L", "I"]), halt("I")],
    ),
  ],
};
