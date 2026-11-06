import type { Lateral } from "../types.ts";
import { MEDIUM_ENTER } from "./shared.ts";
import { COLLECTIVES, MEDIUM_PURPOSE, MEDIUM_INSTRUCTIONS } from "../medium.ts";
import type { Draw, Pace, SetTest } from "../types.ts";
const line = (pts: string[]): Draw => ({ t: "line", pts });
const diag = (from: string, to: string): Draw => ({ t: "diag", from, to });
const halfPass = (from: string, to: string): Draw => ({ t: "yield", from, to });
const circle = (at: string, m: 10): Draw => ({ t: "circle", at, m });
const half = (from: string, to: string, bulge: "C" | "A"): Draw => ({ t: "half", from, to, bulge });
const arc = (from: string, to: string, bulge: "C" | "A"): Draw => ({ t: "arc", from, to, bulge });
const halt = (at: string): Draw => ({ t: "halt", at });
const change = (at: string): Draw => ({ t: "change", at });
function m(
  n: number,
  steps: [string, string][],
  directive: string,
  draw: Draw | Draw[],
  coeff = 1,
  pace?: Pace,
) {
  return {
    n,
    steps: steps.map(([at, doText]) => ({ at, do: doText })),
    directive,
    draw: Array.isArray(draw) ? draw : [draw],
    ...(coeff > 1 ? { coeff: 2 as const } : {}),
    ...(pace ? { pace } : {}),
  };
}

const lateral = (
  movement: typeof mv2,
  kind: Lateral["kind"],
  direction: Lateral["direction"],
  from: string,
  to: string,
) => ({ ...movement, lateral: { kind, direction, from, to } });

const mv2 = m(
  2,
  [
    ["C", "Track left"],
    ["H P", "Change rein, medium trot"],
    ["P F A K", "Collected trot"],
  ],
  "Bend and balance in turn; moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [line(["C", "H"]), diag("H", "P"), line(["P", "F", "A", "K"])],
  1,
  "medium",
);
const mv3 = m(
  3,
  [["", "Transitions at H & P"]],
  "Well defined balanced transitions; regularity and quality of trot, consistent tempo",
  diag("H", "P"),
  1,
);
const mv4 = m(
  4,
  [["K E", "Shoulder-in right"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["K", "V", "E"]),
  1,
);
const mv5 = m(
  5,
  [["E", "Circle right 10m diameter"]],
  "Regularity and quality of trot; shape and size of circle, bend and balance",
  circle("E", 10),
  1,
);
const mv6 = m(
  6,
  [
    ["E H", "Travers right"],
    ["H C M", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  line(["E", "S", "H", "C", "M"]),
  1,
);
const mv7 = m(
  7,
  [
    ["M V", "Medium trot"],
    ["V K A F", "Collected trot"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance",
  [diag("M", "V"), line(["V", "K", "A", "F"])],
  1,
  "medium",
);
const mv8 = m(
  8,
  [["", "Transitions at M & V"]],
  "Well defined balanced transitions; regularity and quality of trot, consistent tempo",
  diag("M", "V"),
  1,
);
const mv9 = m(
  9,
  [["F B", "Shoulder-in left"]],
  "Angle, bend and balance; engagement and self carriage",
  line(["F", "P", "B"]),
  1,
);
const mv10 = m(
  10,
  [["B", "Circle left 10m diameter"]],
  "Regularity and quality of trot; shape and size of circle, bend and balance",
  circle("B", 10),
  1,
);
const mv11 = m(
  11,
  [
    ["B M", "Travers left"],
    ["M C", "Collected trot"],
  ],
  "Angle, bend and balance; engagement and quality of trot",
  line(["B", "R", "M", "C"]),
  1,
);
const mv12 = m(
  12,
  [
    ["C H", "Medium walk"],
    ["H R", "Change rein, medium walk"],
  ],
  "Well defined balanced transition. Regularity and quality of the walk",
  [line(["C", "H"]), diag("H", "R")],
  2,
  "walk",
);
const mv13 = m(
  13,
  [
    ["R K", "Change rein, extended walk"],
    ["K A", "Medium walk"],
  ],
  "Regularity, suppleness of back, activity, overtrack, freedom of shoulder, stretching to the bit. Well defined transitions",
  [diag("R", "K"), line(["K", "A"])],
  2,
  "free",
);
const mv14 = m(
  14,
  [["A", "Collected canter left"]],
  "Well defined transition; regularity and self carriage; engagement and quality of the canter",
  line(["A", "F"]),
  1,
  "canter",
);
const mv15 = m(
  15,
  [
    ["F I", "Half pass left"],
    ["I C", "Down centre line"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Straightness on centre line",
  [halfPass("F", "I"), line(["I", "G", "C"])],
  2,
  "canter",
);
const mv16 = m(
  16,
  [
    ["C", "Track left"],
    ["H P", "Medium canter"],
    ["P F", "Collected canter"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo. Well defined balanced transitions",
  [line(["C", "H"]), diag("H", "P"), line(["P", "F"])],
  1,
  "medium-canter",
);
const mv17 = m(
  17,
  [
    ["F", "Collected trot"],
    ["A", "Collected canter right"],
  ],
  "Well defined, balanced, engaged transitions",
  line(["F", "A", "K"]),
  1,
);
const mv18 = m(
  18,
  [
    ["K I", "Half pass right"],
    ["I C", "Down centre line"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Straightness on centre line",
  [halfPass("K", "I"), line(["I", "G", "C"])],
  2,
  "canter",
);
const mv19 = m(
  19,
  [
    ["C", "Track right"],
    ["B X", "Half circle right 10m diameter"],
    ["X I", "Collected canter"],
  ],
  "Bend and balance in turn; Shape and size of the half circle. The straightness and quality of the canter",
  [line(["C", "M", "R", "B"]), half("B", "X", "A"), line(["X", "I"])],
  1,
  "canter",
);
const mv20 = m(
  20,
  [
    ["I", "Collected trot"],
    ["G", "Halt, Salute"],
  ],
  "Engagement, uphill balance and quality of trot, well defined balanced transition, straightness, attentiveness, immobility (min. 3 secs)",
  [line(["I", "G"]), halt("G")],
  1,
);
export const TEST_4A: SetTest = {
  id: "4a",
  short: "4A",
  name: "Medium 4A",
  purpose: MEDIUM_PURPOSE,
  introduces: "Medium trot sitting, half pass at canter",
  instructions: MEDIUM_INSTRUCTIONS,
  collectives: COLLECTIVES,
  year: "ESNZ 2023",
  time: "5:10 from entry at A",
  drawTime: "8:00",
  arena: "60 × 20",
  leave: "Leave arena in walk on a long rein at A",
  movements: [
    MEDIUM_ENTER,
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
    lateral(mv15, "half-pass", "left", "F", "I"),
    mv16,
    mv17,
    lateral(mv18, "half-pass", "right", "K", "I"),
    mv19,
    mv20,
  ],
};
