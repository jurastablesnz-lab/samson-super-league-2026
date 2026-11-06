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
const turn = (side: "H" | "M"): Draw => ({ t: "half-turn", at: "G", side });
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
    ["C", "Track right"],
    ["M V", "Change rein, medium trot"],
    ["V A", "Collected trot"],
  ],
  "Bend and balance; moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance. Well defined transitions & consistent tempo",
  [line(["C", "M"]), diag("M", "V"), line(["V", "K", "A"])],
  1,
  "medium",
);
const mv3 = m(
  3,
  [
    ["A", "Down centre line"],
    ["D S", "Half pass left"],
    ["S H C", "Collected trot"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Quality of trot",
  [line(["K", "A", "D"]), halfPass("D", "S"), line(["S", "H", "C"])],
  2,
);
const mv4 = m(
  4,
  [
    ["C", "Medium walk"],
    ["M", "Turn right"],
    ["Between G & H", "Shorten stride, half turn on hindquarters to right. Proceed medium walk"],
  ],
  "Well defined balanced transition. Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
  [line(["C", "M", "G"]), turn("H")],
  1,
  "walk",
);
const mv5 = m(
  5,
  [["Between G & M", "Shorten stride, half turn on hindquarters to left. Proceed medium walk"]],
  "Quality of shortened walk strides; tempo and regularity; activity of hind legs; bend and fluency in turn",
  turn("M"),
  1,
  "walk",
);
const mv6 = m(
  6,
  [["C M G(H) G(M) G H", "The medium walks"]],
  "Regularity and quality of the walk",
  [line(["C", "M", "G"]), turn("H"), turn("M"), line(["G", "H"])],
  1,
  "walk",
);
const mv7 = m(
  7,
  [
    ["H S P", "Extended walk"],
    ["P F", "Medium walk"],
  ],
  "Regularity, suppleness of back, activity, overtrack and freedom of shoulder. Stretching to the bit; clear transitions",
  [diag("H", "P"), line(["P", "F"])],
  2,
  "free",
);
const mv8 = m(
  8,
  [
    ["F", "Collected trot"],
    ["A", "Down centre line"],
    ["D R", "Half pass right"],
    ["R M C H", "Collected trot"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Quality of trot",
  [line(["F", "A", "D"]), halfPass("D", "R"), line(["R", "M", "C", "H"])],
  2,
);
const mv9 = m(
  9,
  [
    ["H P", "Change rein, medium trot"],
    ["P F", "Collected trot"],
  ],
  "Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance. Well defined transitions & consistent tempo",
  [diag("H", "P"), line(["P", "F"])],
  1,
  "medium",
);
const mv10 = m(
  10,
  [
    ["F", "Collected canter"],
    ["A", "Down the centre line"],
  ],
  "Well defined transition, balanced and engaged. Collection; bend and balance in turn",
  line(["F", "A", "D", "L"]),
  1,
  "canter",
);
const mv11 = m(
  11,
  [["L R", "Half pass right"]],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Quality of the canter",
  halfPass("L", "R"),
  2,
  "canter",
);
const mv12 = m(
  12,
  [["R M C H S", "Counter Canter"]],
  "Regularity, quality, balance and positioning in counter canter",
  line(["R", "M", "C", "H", "S"]),
  1,
  "canter",
);
const mv13 = m(
  13,
  [["S F", "Change rein, medium canter"]],
  "Defined transition. Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo",
  diag("S", "F"),
  1,
  "medium-canter",
);
const mv14 = m(
  14,
  [
    ["F", "Collected canter"],
    ["F A K V", "Collected canter"],
    ["V", "Turn right"],
  ],
  "Well defined balanced transition. Bend and balance in turn. Quality of the canter",
  line(["F", "A", "K", "V", "L"]),
  1,
  "canter",
);
const mv15 = m(
  15,
  [
    ["Over the centre line", "Simple change of leg"],
    ["P", "Track left"],
    ["P B", "Collected canter"],
  ],
  "Clear, balanced, straight transitions; Regularity and quality of paces",
  [line(["L", "P"]), change("L"), line(["P", "B"])],
  1,
  "canter",
);
const mv16 = m(
  16,
  [
    [
      "B E",
      "Half circle left 20m diameter, give and retake the reins for 2-3 strides over the centre line",
    ],
    ["E V K A", "Collected canter"],
  ],
  "Clear release of reins maintaining self carriage; engagement and collection; shape, size and bend on circle",
  [arc("B", "E", "C"), line(["E", "V", "K", "A"])],
  1,
  "canter",
);
const mv17 = m(
  17,
  [
    ["A", "Down the centre line"],
    ["L S", "Half pass left"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage.",
  [line(["A", "L"]), halfPass("L", "S")],
  1,
  "canter",
);
const mv18 = m(
  18,
  [["S H C M R", "Counter Canter"]],
  "Regularity, quality, balance and positioning in counter canter",
  line(["S", "H", "C", "M", "R"]),
  1,
  "canter",
);
const mv19 = m(
  19,
  [["R K", "Change rein, medium canter"]],
  "Defined transition. Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance. Consistent tempo",
  diag("R", "K"),
  1,
  "medium-canter",
);
const mv20 = m(
  20,
  [
    ["K", "Collected canter"],
    ["A", "Down centre line"],
    ["A L", "Collected canter"],
  ],
  "Defined transition. Bend and balance in turn. Engagement, self carriage and collection. The straightness and quality of the canter",
  line(["K", "A", "L"]),
  1,
  "canter",
);
const mv21 = m(
  21,
  [
    ["L", "Collected trot"],
    ["X", "Halt, Salute"],
  ],
  "Defined transition. Engagement, uphill balance and quality of trot; straightness, attentiveness, immobility (min. 3 secs)",
  [line(["L", "X"]), halt("X")],
  1,
);
export const TEST_4B: SetTest = {
  id: "4b",
  short: "4B",
  name: "Medium 4B",
  purpose: MEDIUM_PURPOSE,
  introduces: "Half pass at trot, give and retake the reins in canter",
  instructions: MEDIUM_INSTRUCTIONS,
  collectives: COLLECTIVES,
  year: "ESNZ 2023",
  time: "5:30 from entry at A",
  drawTime: "8:00",
  arena: "60 × 20",
  leave: "Leave arena in walk on a long rein at A",
  movements: [
    MEDIUM_ENTER,
    mv2,
    lateral(mv3, "half-pass", "left", "D", "S"),
    mv4,
    mv5,
    mv6,
    mv7,
    lateral(mv8, "half-pass", "right", "D", "R"),
    mv9,
    mv10,
    lateral(mv11, "half-pass", "right", "L", "R"),
    mv12,
    mv13,
    mv14,
    mv15,
    mv16,
    lateral(mv17, "half-pass", "left", "L", "S"),
    mv18,
    mv19,
    mv20,
    mv21,
  ],
};
