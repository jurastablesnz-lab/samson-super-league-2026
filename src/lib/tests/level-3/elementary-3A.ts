import type { SetTest } from "../types.ts";
import {
  DRAW,
  ELEMENTARY_COLLECTIVES,
  ELEMENTARY_ENTER,
  ELEMENTARY_INSTRUCTIONS,
  ELEMENTARY_PURPOSE,
  LEAVE,
  circle,
  diag,
  halt,
  lateral,
  line,
  mv,
  reinBack,
} from "./shared.ts";

const mv2 = mv(
  2,
  [
    ["C", "Track left"],
    ["H P", "Change rein, medium trot (sitting or rising)"],
    ["P K", "Collected trot"],
  ],
  "Bend and balance in turn; moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [line(["C", "H"]), diag("H", "P"), line(["P", "F", "A", "K"])],
  { pace: "medium" },
);
const mv3 = mv(
  3,
  [["", "(Transitions at H & P)"]],
  "Clear, balanced transitions; consistent tempo",
  diag("H", "P"),
);
const mv4 = mv(
  4,
  [
    ["K E", "Shoulder-in right"],
    ["E", "Turn right"],
    ["E B", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  [line(["K", "V", "E"]), line(["E", "X", "B"])],
  { coeff: 2 },
);
const mv5 = mv(
  5,
  [
    ["B", "Turn left"],
    ["B M", "Shoulder-in left"],
    ["M C", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  [line(["E", "X", "B"]), line(["B", "R", "M"]), line(["M", "C"])],
  { coeff: 2 },
);
const mv6 = mv(
  6,
  [
    ["C", "Halt, rein back 3 to 4 steps"],
    ["", "Proceed medium walk"],
  ],
  "Immobility, willing steps back with correct rhythm and count; straightness; clear transitions",
  [line(["M", "C"]), halt("C"), reinBack("C")],
  { coeff: 2 },
);
const mv7 = mv(
  7,
  [["C S", "Medium walk"]],
  "Regularity and quality of walk",
  line(["C", "H", "S"]),
  {
    pace: "walk",
    coeff: 2,
  },
);
const mv8 = mv(
  8,
  [
    ["S F", "Change rein, free walk on a long rein"],
    ["F A", "Medium walk"],
  ],
  "Regularity and quality of walks; reach and ground cover of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
  [diag("S", "F"), line(["F", "A"])],
  { pace: "free", coeff: 2 },
);
const mv9 = mv(
  9,
  [
    ["Before A", "Shorten stride in walk"],
    ["A K", "Collected canter right lead"],
  ],
  "Clear, balanced transition, regularity and quality of paces",
  line(["A", "K"]),
  { pace: "canter" },
);
const mv10 = mv(
  10,
  [
    ["K S", "Medium canter"],
    ["S C", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; clear balanced transitions",
  line(["K", "V", "E", "S", "H", "C"]),
  { pace: "medium-canter" },
);
const mv11 = mv(
  11,
  [
    ["C", "Circle right 10m"],
    ["C M", "Collected canter"],
  ],
  "Regularity and quality of canter; shape and size of circle; bend; balance",
  [circle("C"), line(["C", "M"])],
  { pace: "canter" },
);
const mv12 = mv(
  12,
  [
    ["M E", "Change rein"],
    ["E V", "Counter canter"],
  ],
  "Regularity, quality and balance of canter; straightness, correct position in counter canter",
  [diag("M", "E"), line(["E", "V"])],
  { pace: "canter", coeff: 2 },
);
const mv13 = mv(
  13,
  [
    ["V", "Collected trot"],
    ["K A", "Medium walk"],
  ],
  "Regularity and quality of paces; clear, balanced transitions",
  line(["V", "K", "A"]),
);
const mv14 = mv(
  14,
  [
    ["Before A", "Shorten stride in walk"],
    ["A F", "Collected canter left lead"],
  ],
  "Regularity, quality and balance of canter; straightness; quality of transition",
  line(["A", "F"]),
  { pace: "canter" },
);
const mv15 = mv(
  15,
  [
    ["F R", "Medium canter"],
    ["R C", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; clear balanced transitions",
  [diag("F", "R"), line(["R", "M", "C"])],
  { pace: "medium-canter" },
);
const mv16 = mv(
  16,
  [
    ["C", "Circle left 10m"],
    ["C H", "Collected canter"],
  ],
  "Regularity and quality of canter; shape and size of circle; bend and balance",
  [circle("C"), line(["C", "H"])],
  { pace: "canter" },
);
const mv17 = mv(
  17,
  [
    ["H B", "Change rein"],
    ["B P", "Counter canter"],
  ],
  "Regularity, quality and balance of canter; straightness",
  [diag("H", "B"), line(["B", "P"])],
  { pace: "canter", coeff: 2 },
);
const mv18 = mv(
  18,
  [["P", "Collected trot"]],
  "Regularity and quality of paces; clear, balanced transitions",
  line(["P", "F", "A", "K"]),
);
const mv19 = mv(
  19,
  [
    ["K R", "Change rein medium trot (sitting or rising)"],
    ["R", "Collected trot"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  diag("K", "R"),
  { pace: "medium" },
);
const mv20 = mv(
  20,
  [["", "(Transitions at K and R)"]],
  "Clear, balanced, engaged transitions; consistent tempo",
  diag("K", "R"),
);
const mv21 = mv(
  21,
  [["R M C H S", "Collected trot"]],
  "Regularity and quality of paces",
  line(["R", "M", "C", "H", "S"]),
);
const mv22 = mv(
  22,
  [
    ["S", "Turn left"],
    ["I", "Turn left"],
    ["G", "Halt, Salute"],
  ],
  "Bend and balance in turns; engagement, uphill balance and quality of trot; clear, balanced transition; straightness, attentiveness; immobility (min. 3 secs)",
  [line(["S", "I", "G"]), halt("G")],
);

export const TEST_3A: SetTest = {
  id: "3a",
  short: "3A",
  name: "Elementary 3A",
  year: "ESNZ 2023",
  time: "5:20 from entry at A",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ELEMENTARY_PURPOSE,
  instructions: ELEMENTARY_INSTRUCTIONS,
  introduces:
    "Walk-canter transitions; collected and medium trot and canter; 10m circle at canter; shoulder-in; rein back",
  leave: LEAVE,
  collectives: ELEMENTARY_COLLECTIVES,
  movements: [
    ELEMENTARY_ENTER,
    mv2,
    mv3,
    lateral(mv4, "shoulder-in", "right", "K", "E"),
    lateral(mv5, "shoulder-in", "left", "B", "M"),
    mv6,
    mv7,
    mv8,
    mv9,
    mv10,
    mv11,
    mv12,
    mv13,
    mv14,
    mv15,
    mv16,
    mv17,
    mv18,
    mv19,
    mv20,
    mv21,
    mv22,
  ],
};
