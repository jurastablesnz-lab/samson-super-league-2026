import type { SetTest } from "../types.ts";
import {
  DRAW,
  ELEMENTARY_COLLECTIVES,
  ELEMENTARY_ENTER,
  ELEMENTARY_INSTRUCTIONS,
  ELEMENTARY_PURPOSE,
  LEAVE,
  diag,
  half,
  lateral,
  line,
  mv,
  serpentine,
  turn,
} from "./shared.ts";

const mv2 = mv(
  2,
  [
    ["C", "Track right"],
    ["M V", "Change rein, medium trot (sitting or rising)"],
    ["V K A", "Collected trot"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [line(["C", "M"]), diag("M", "V"), line(["V", "K", "A"])],
  { pace: "medium" },
);
const mv3 = mv(
  3,
  [["", "(Transitions at M & V)"]],
  "Clear balanced, engaged transitions; quality of trot; consistent tempo",
  diag("M", "V"),
);
const mv4 = mv(
  4,
  [["F B", "Shoulder in left"]],
  "Angle, bend and balance; engagement and quality of trot",
  line(["F", "P", "B"]),
);
const mv5 = mv(
  5,
  [
    ["B X", "Half circle left 10m"],
    ["X E", "Half circle right 10m"],
  ],
  "Shape and size of half circles; supple change of bend on centre line; balance and quality of trot",
  [half("B", "X", "C", "left"), half("X", "E", "A", "right")],
);
const mv6 = mv(
  6,
  [
    ["E H", "Shoulder in right"],
    ["H C M", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  [line(["E", "S", "H"]), line(["H", "C", "M"])],
);
const mv7 = mv(
  7,
  [
    ["M P", "Medium trot (sitting or rising)"],
    ["P F A K", "Collected trot"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [line(["M", "R", "B", "P"]), line(["P", "F", "A", "K"])],
  { pace: "medium" },
);
const mv8 = mv(
  8,
  [["", "(Transitions at M & P)"]],
  "Clear balanced, engaged transitions; quality of trot; consistent tempo",
  line(["M", "R", "B", "P"]),
);
const mv9 = mv(
  9,
  [["K E", "Travers right"]],
  "Angle, bend and balance; engagement and quality of trot",
  line(["K", "V", "E"]),
  { coeff: 2 },
);
const mv10 = mv(
  10,
  [
    ["E X", "Half circle right 10m"],
    ["X B", "Half circle left 10m"],
  ],
  "Shape and size of half circles; supple change of bend on centre line; balance and quality of trot",
  [half("E", "X", "A", "right"), half("X", "B", "C", "left")],
);
const mv11 = mv(
  11,
  [
    ["B M", "Travers left"],
    ["M C", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  [line(["B", "R", "M"]), line(["M", "C"])],
  { coeff: 2 },
);
const mv12 = mv(
  12,
  [
    ["C", "Medium walk"],
    ["H", "Turn left"],
    ["Between G & M", "Shorten stride, half turn on hindquarters left"],
    ["", "Proceed in medium walk"],
  ],
  "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
  [line(["C", "H", "G"]), turn("M")],
  { pace: "walk" },
);
const mv13 = mv(
  13,
  [
    ["Between G & H", "Shorten stride, half turn on hindquarters right"],
    ["", "Proceed medium walk"],
    ["M", "Turn right"],
  ],
  "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
  [turn("H"), line(["G", "M", "R"])],
  { pace: "walk" },
);
const mv14 = mv(
  14,
  [["C H G(M) G(H) G M R", "(Medium walk)"]],
  "Regularity and quality of walk",
  [line(["C", "H", "G"]), turn("M"), turn("H"), line(["G", "M", "R"])],
  { pace: "walk", coeff: 2 },
);
const mv15 = mv(
  15,
  [
    ["R K", "Change rein in free walk on a long rein"],
    ["K A", "Medium walk"],
  ],
  "Regularity and quality of walks; reach and ground cover of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
  [diag("R", "K"), line(["K", "A"])],
  { pace: "free", coeff: 2 },
);
const mv16 = mv(
  16,
  [
    ["Before A", "Shorten stride in walk"],
    ["A", "Collected canter left lead"],
    ["A F", "Collected canter"],
  ],
  "Clear, balanced, engaged, straight transition; regularity and quality of paces",
  line(["A", "F"]),
  { pace: "canter" },
);
const mv17 = mv(
  17,
  [
    ["F R", "Medium canter"],
    ["R M C", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo; clear, balanced transitions",
  [diag("F", "R"), line(["R", "M", "C"])],
  { pace: "medium-canter" },
);
const mv18 = mv(
  18,
  [["", "(Transitions at F & R)"]],
  "Clear balanced, engaged transitions; quality of canter; consistent tempo",
  diag("F", "R"),
);
const serpentineText =
  "Serpentine three equal loops width of arena, simple changes of lead over centre line";
const mv19 = mv(
  19,
  [
    ["C A", serpentineText],
    ["", "(Score for first simple change)"],
  ],
  "Clear, balanced, straight transitions; regularity and quality of paces",
  serpentine("C", "right"),
  { pace: "canter" },
);
const mv20 = mv(
  20,
  [["", "(Score for second simple change)"]],
  "Clear, balanced, straight transitions; regularity and quality of paces",
  serpentine("C", "right"),
  { pace: "canter" },
);
const mv21 = mv(
  21,
  [["", "(Score for quality of serpentine)"]],
  "Regularity and quality of paces; position; geometry",
  serpentine("C", "right"),
  { pace: "canter" },
);
const mv22 = mv(
  22,
  [
    ["F E", "Change rein"],
    ["E H", "Counter canter"],
  ],
  "Regularity, quality and balance of canter; straightness, correct position in counter canter",
  [diag("F", "E"), line(["E", "S", "H"])],
  { pace: "canter", coeff: 2 },
);
const mv23 = mv(
  23,
  [
    ["H", "Medium walk"],
    ["Before C", "Shorten the stride in walk"],
    ["C M", "Collected canter right lead"],
  ],
  "Clear balanced straight transitions; regularity and quality of paces",
  line(["H", "C", "M"]),
  { pace: "canter" },
);
const mv24 = mv(
  24,
  [
    ["M P", "Medium canter"],
    ["P F A K", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  line(["M", "R", "B", "P", "F", "A", "K"]),
  { pace: "medium-canter" },
);
const mv25 = mv(
  25,
  [["", "(Transitions at M & P)"]],
  "Clear balanced, engaged transitions; quality of canter; consistent tempo",
  line(["M", "R", "B", "P"]),
);
const mv26 = mv(
  26,
  [
    ["K B", "Change rein"],
    ["B M", "Counter canter"],
  ],
  "Regularity, quality and balance of canter; straight, correct position in counter canter",
  [diag("K", "B"), line(["B", "R", "M"])],
  { pace: "canter", coeff: 2 },
);
const mv27 = mv(
  27,
  [
    ["M", "Collected trot"],
    ["M E", "Collected trot"],
  ],
  "Clear, balanced, engaged, straight transition; regularity and quality of trot; consistent tempo",
  line(["M", "C", "H", "S", "E"]),
);
const mv28 = mv(
  28,
  [
    ["E", "Turn left"],
    ["X", "Turn left"],
    ["G", "Halt, Salute"],
  ],
  "Engagement, uphill balance and quality of trot; bend and balance in turns; straightness, attentiveness; immobility (min. 3 secs)",
  [line(["E", "X", "G"]), { t: "halt", at: "G" }],
);

export const TEST_3B: SetTest = {
  id: "3b",
  short: "3B",
  name: "Elementary 3B",
  year: "ESNZ 2023",
  time: "6:00 from entry at A",
  drawTime: DRAW,
  arena: "60 × 20 or 40 × 20",
  purpose: ELEMENTARY_PURPOSE,
  instructions: ELEMENTARY_INSTRUCTIONS,
  introduces: "Travers, half turn on hindquarters, simple changes",
  leave: LEAVE,
  collectives: ELEMENTARY_COLLECTIVES,
  movements: [
    ELEMENTARY_ENTER,
    mv2,
    mv3,
    lateral(mv4, "shoulder-in", "left", "F", "B"),
    mv5,
    lateral(mv6, "shoulder-in", "right", "E", "H"),
    mv7,
    mv8,
    lateral(mv9, "travers", "right", "K", "E"),
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
    mv28,
  ],
};
