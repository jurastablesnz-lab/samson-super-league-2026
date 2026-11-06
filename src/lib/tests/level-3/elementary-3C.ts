import type { SetTest } from "../types.ts";
import {
  DRAW,
  ELEMENTARY_COLLECTIVES,
  ELEMENTARY_ENTER,
  ELEMENTARY_INSTRUCTIONS,
  ELEMENTARY_PURPOSE,
  LEAVE,
  changeOn,
  circle,
  diag,
  halt,
  lateral,
  line,
  mv,
  reinBack,
  serpentine,
  turn,
} from "./shared.ts";

const mv2 = mv(
  2,
  [
    ["C", "Track left"],
    ["H X F", "Change rein, medium trot (sitting or rising)"],
    ["F A K", "Collected trot"],
  ],
  "Bend and balance in turn; moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [line(["C", "H"]), diag("H", "F"), line(["F", "A", "K"])],
  { pace: "medium" },
);
const mv3 = mv(
  3,
  [["", "(Transitions at H & F)"]],
  "Clear balanced transitions; regularity and quality of trot; consistent tempo",
  diag("H", "F"),
  { coeff: 2 },
);
const mv4 = mv(
  4,
  [["K E", "Shoulder-in right"]],
  "Angle, bend and balance; engagement and quality of trot",
  line(["K", "V", "E"]),
);
const mv5 = mv(
  5,
  [["E", "Circle right 10m"]],
  "Regularity and quality of trot; shape and size of circle; bend; balance",
  circle("E"),
);
const mv6 = mv(
  6,
  [
    ["E H", "Travers right"],
    ["H M", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  [line(["E", "S", "H"]), line(["H", "C", "M"])],
);
const mv7 = mv(
  7,
  [
    ["M X K", "Change rein, medium trot (sitting or rising)"],
    ["K A F", "Collected trot"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [diag("M", "K"), line(["K", "A", "F"])],
  { pace: "medium" },
);
const mv8 = mv(
  8,
  [["", "(Transitions at M & K)"]],
  "Clear balanced transitions; regularity and quality of trot; consistent tempo",
  diag("M", "K"),
  { coeff: 2 },
);
const mv9 = mv(
  9,
  [["F B", "Shoulder-in left"]],
  "Angle, bend and balance; engagement and quality of trot",
  line(["F", "P", "B"]),
);
const mv10 = mv(
  10,
  [["B", "Circle left 10m"]],
  "Regularity and quality of trot; shape and size of circle; bend; balance",
  circle("B"),
);
const mv11 = mv(
  11,
  [
    ["B M", "Travers left"],
    ["M C", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  [line(["B", "R", "M"]), line(["M", "C"])],
);
const mv12 = mv(
  12,
  [
    ["C", "Halt, rein back 3 to 4 steps"],
    ["", "Proceed in medium walk"],
  ],
  "Immobility; willing steps back with correct rhythm and count; straightness; clear transitions",
  [line(["M", "C"]), halt("C"), reinBack("C")],
  { coeff: 2 },
);
const mv13 = mv(
  13,
  [
    ["H", "Turn left"],
    ["Between G & M", "Collect, half turn on hindquarters left"],
    ["", "Proceed medium walk"],
  ],
  "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
  [line(["C", "H", "G"]), turn("M")],
  { pace: "walk", coeff: 2 },
);
const mv14 = mv(
  14,
  [
    ["Between G & H", "Collect, half turn on hindquarters right"],
    ["", "Proceed medium walk"],
    ["M", "Turn right"],
    ["M R", "Medium walk"],
  ],
  "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
  [turn("H"), line(["G", "M", "R"])],
  { pace: "walk", coeff: 2 },
);
const mv15 = mv(
  15,
  [["C H G(M) G(H) G M R", "(Medium walk)"]],
  "Regularity and quality of walk",
  [line(["C", "H", "G"]), turn("M"), turn("H"), line(["G", "M", "R"])],
  { pace: "walk" },
);
const mv16 = mv(
  16,
  [
    ["R V", "Change rein, free walk on a long rein"],
    ["V K", "Medium walk"],
  ],
  "Regularity and quality of walks; reach and ground cover of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
  [diag("R", "V"), line(["V", "K"])],
  { pace: "free", coeff: 2 },
);
const mv17 = mv(
  17,
  [
    ["Before K", "Shorten the stride in walk"],
    ["K F", "Collected canter left lead"],
  ],
  "Clear, balanced straight transition; regularity and quality of paces",
  line(["K", "A", "F"]),
  { pace: "canter" },
);
const mv18 = mv(
  18,
  [
    ["F M", "Medium canter"],
    ["M C", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  line(["F", "P", "B", "R", "M", "C"]),
  { pace: "medium-canter" },
);
const mv19 = mv(
  19,
  [["", "(Transitions at F & M)"]],
  "Clear balanced transitions; regularity and quality of trot; consistent tempo",
  line(["F", "P", "B", "R", "M"]),
);
const mv20 = mv(
  20,
  [
    ["C A", "Serpentine three equal loops, width of the arena, no change of lead"],
    ["A F", "Collected canter"],
  ],
  "Regularity and quality and balance of canter; positioning and balance in counter canter; geometry",
  [serpentine("C", "left"), line(["A", "F"])],
  { pace: "canter" },
);
const mv21 = mv(
  21,
  [
    ["F E", "Change rein"],
    ["L", "Simple change"],
    ["E H C M", "Collected canter"],
  ],
  "Clear, balanced, straight transitions; quality of paces",
  [diag("F", "E"), changeOn("F", "E", 0.5), line(["E", "S", "H", "C", "M"])],
  { pace: "canter", coeff: 2 },
);
const mv22 = mv(
  22,
  [
    ["M F", "Medium canter"],
    ["F A", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  line(["M", "R", "B", "P", "F", "A"]),
  { pace: "medium-canter" },
);
const mv23 = mv(
  23,
  [["", "(Transitions at M & F)"]],
  "Clear balanced transitions; regularity and quality of trot; consistent tempo",
  line(["M", "R", "B", "P", "F"]),
);
const mv24 = mv(
  24,
  [
    ["A C", "Serpentine three equal loops, width of the arena, no change of lead"],
    ["C M", "Collected canter"],
  ],
  "Regularity and quality and balance of canter; positioning and balance in counter canter; geometry",
  [serpentine("A", "left"), line(["C", "M"])],
  { pace: "canter" },
);
const mv25 = mv(
  25,
  [
    ["M E", "Change rein"],
    ["I", "Simple change"],
    ["E K", "Collected canter"],
  ],
  "Clear, balanced, straight transitions; quality of paces",
  [diag("M", "E"), changeOn("M", "E", 0.5), line(["E", "V", "K"])],
  { pace: "canter", coeff: 2 },
);
const mv26 = mv(
  26,
  [["K A", "Collected trot"]],
  "Clear, balanced, engaged, straight transitions; regularity and quality of trot; consistent tempo",
  line(["K", "A"]),
);
const mv27 = mv(
  27,
  [
    ["A", "Down centre line"],
    ["X", "Halt, Salute"],
  ],
  "Bend and balance in turn; engagement, uphill balance and quality of trot; clear, balanced transitions; straightness, attentiveness; immobility (min. 3 secs)",
  [line(["A", "X"]), halt("X")],
);

export const TEST_3C: SetTest = {
  id: "3c",
  short: "3C",
  name: "Elementary 3C",
  year: "ESNZ 2023",
  time: "6:00 from entry at A",
  drawTime: DRAW,
  arena: "60 × 20",
  purpose: ELEMENTARY_PURPOSE,
  instructions: ELEMENTARY_INSTRUCTIONS,
  introduces: "Counter canter in serpentine",
  leave: LEAVE,
  collectives: ELEMENTARY_COLLECTIVES,
  movements: [
    ELEMENTARY_ENTER,
    mv2,
    mv3,
    lateral(mv4, "shoulder-in", "right", "K", "E"),
    mv5,
    lateral(mv6, "travers", "right", "E", "H"),
    mv7,
    mv8,
    lateral(mv9, "shoulder-in", "left", "F", "B"),
    mv10,
    lateral(mv11, "travers", "left", "B", "M"),
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
    mv23,
    mv24,
    mv25,
    mv26,
    mv27,
  ],
};
