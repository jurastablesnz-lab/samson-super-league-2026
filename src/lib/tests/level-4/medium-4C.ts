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
const reinBack = (at: string): Draw => ({ t: "rein-back", at });
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
    ["H E", "Shoulder-in left"],
    ["E X", "Half circle left 10m diameter"],
  ],
  "Regularity and quality of trot; angle, bend and balance. Shape, size bend and balance of half circle.",
  [line(["C", "H", "S", "E"]), half("E", "X", "C")],
  1,
);
const mv3 = m(
  3,
  [
    ["X B", "Half circle right 10m diameter"],
    ["B F", "Shoulder-in right"],
    ["F A K", "Collected trot"],
  ],
  "Shape, size, bend and balance of half circle. Angle, bend and balance. Straightness and quality of trot.",
  [half("X", "B", "C"), line(["B", "P", "F", "A", "K"])],
  1,
);
const mv4 = m(
  4,
  [
    ["K X", "Half pass right"],
    ["X C", "Down centre line"],
    ["", "Collected trot"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Straightness and quality of trot",
  [halfPass("K", "X"), line(["X", "G", "C"])],
  1,
);
const mv5 = m(
  5,
  [
    ["C", "Track right"],
    ["C M", "Collected trot"],
    ["M V", "Change of rein in medium trot"],
  ],
  "Straightness and quality of trot. Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance. Well defined transition.",
  [line(["C", "M"]), diag("M", "V")],
  1,
  "medium",
);
const mv6 = m(
  6,
  [["V K A F", "Collected trot"]],
  "Well defined transition. Straightness and quality of trot",
  line(["V", "K", "A", "F"]),
  1,
);
const mv7 = m(
  7,
  [
    ["F X", "Half pass left"],
    ["X C", "Down centre line"],
    ["", "Collected trot"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage. Straightness and quality of trot",
  [halfPass("F", "X"), line(["X", "G", "C"])],
  1,
);
const mv8 = m(
  8,
  [
    ["C", "Track left"],
    ["C H", "Collected trot"],
    ["H P", "Change rein, extended trot"],
  ],
  "Bend and balance in turn. Straightness and quality of trot. Well defined transitions Utmost ground cover with lengthening of frame; elasticity; engagement; suspension; straightness and uphill balance",
  [line(["C", "H"]), diag("H", "P")],
  1,
);
const mv9 = m(
  9,
  [["P F A", "Collected trot"]],
  "Clear balanced straight transition. Quality of trot",
  line(["P", "F", "A"]),
  1,
);
const mv10 = m(
  10,
  [["A K R", "Extended walk"]],
  "Well defined transitions. Regularity, suppleness of back, activity, overtrack, freedom of shoulder, stretching to the bit.",
  [line(["A", "K"]), diag("K", "R")],
  2,
  "free",
);
const mv11 = m(
  11,
  [
    ["R", "Medium walk"],
    ["M", "Turn left"],
    ["G", "Halt. Rein back 4 steps. Proceed at medium walk"],
    ["H", "Track right"],
  ],
  "Well defined transitions. Regularity; suppleness of the back; activity. Immobility; willing steps back with correct rhythm and count; straightness",
  [line(["R", "M", "C", "G"]), halt("G"), reinBack("G"), line(["G", "H"])],
  1,
  "walk",
);
const mv12 = m(
  12,
  [["R M(G) H", "The medium walks"]],
  "Regularity and quality of walk",
  line(["R", "M", "C", "G", "H"]),
  2,
  "walk",
);
const mv13 = m(
  13,
  [
    ["Before C", "Shorten the strides"],
    ["C", "Collected canter right"],
    ["C M", "Collected canter"],
  ],
  "Shortening of the strides; well defined, balanced straight, uphill transition. Regularity and quality of canter",
  line(["H", "C", "M"]),
  1,
  "canter",
);
const mv14 = m(
  14,
  [
    ["M P", "Medium canter"],
    ["P", "Collected canter"],
    ["P A", "Collected canter"],
  ],
  "Well defined transitions. Moderate lengthening of frame and stride with engagement, elasticity, suspension, straightness and uphill balance; consistent tempo",
  [line(["M", "R", "B", "P"]), line(["P", "F", "A"])],
  1,
  "medium-canter",
);
const mv15 = m(
  15,
  [
    ["A", "Down the centre line"],
    ["D B", "Half pass right"],
    ["B R", "Collected canter"],
  ],
  "Alignment and bend while moving fluently forward and sideways; engagement and self-carriage",
  [line(["A", "D"]), halfPass("D", "B"), line(["B", "R"])],
  1,
  "canter",
);
const mv16 = m(
  16,
  [
    ["R", "Simple change of leg"],
    ["R M C H", "Collected canter"],
  ],
  "Well defined, balanced straight transition; regularity and quality of paces",
  [line(["R", "M", "C", "H"]), change("R")],
  1,
  "canter",
);
const mv17 = m(
  17,
  [
    ["H V", "Extended canter"],
    ["V A", "Collected canter"],
  ],
  "Utmost groundcover with lengthening of frame; engagement; elasticity; suspension; straightness; well defined transitions maintaining tempo and balance",
  [line(["H", "S", "E", "V"]), line(["V", "K", "A"])],
  1,
  "extended-canter",
);
const mv18 = m(
  18,
  [
    ["A", "Down centre line"],
    ["D E", "Half pass left"],
  ],
  "Straightness on centreline. Alignment and bend while moving fluently forward and sideways; engagement and self-carriage",
  [line(["A", "D"]), halfPass("D", "E"), line(["E", "S"])],
  1,
  "canter",
);
const mv19 = m(
  19,
  [
    ["S", "Simple change of leg"],
    ["S H C M", "Collected canter"],
  ],
  "Well defined, balanced straight transition; regularity and quality of paces",
  [line(["S", "H", "C", "M"]), change("S")],
  1,
  "canter",
);
const mv20 = m(
  20,
  [["M R B", "Collected trot"]],
  "Well defined, balanced, engaged transition; engagement and collection",
  line(["M", "R", "B"]),
  1,
);
const mv21 = m(
  21,
  [
    ["B", "Turn right"],
    ["X", "Turn right"],
  ],
  "Bend and balance in turns; engagement, self carriage and quality of the trot",
  line(["B", "X", "G"]),
  1,
);
const mv22 = m(
  22,
  [
    ["X G", "Collected trot"],
    ["G", "Halt, Salute"],
  ],
  "Attentiveness, balance; immobility (min. 3 secs)",
  [line(["X", "G"]), halt("G")],
  1,
);
export const TEST_4C: SetTest = {
  id: "4c",
  short: "4C",
  name: "Medium 4C",
  purpose: MEDIUM_PURPOSE,
  introduces: "Collected trot to extended walk, extended trot, extended canter",
  instructions: MEDIUM_INSTRUCTIONS,
  collectives: COLLECTIVES,
  year: "ESNZ 2023",
  time: "6:00 from entry at A",
  drawTime: "8:00",
  arena: "60 × 20",
  leave: "Leave arena in walk on a long rein at A",
  movements: [
    MEDIUM_ENTER,
    lateral(mv2, "shoulder-in", "left", "H", "E"),
    lateral(mv3, "shoulder-in", "right", "B", "F"),
    lateral(mv4, "half-pass", "right", "K", "X"),
    mv5,
    mv6,
    lateral(mv7, "half-pass", "left", "F", "X"),
    mv8,
    mv9,
    mv10,
    mv11,
    mv12,
    mv13,
    mv14,
    lateral(mv15, "half-pass", "right", "D", "B"),
    mv16,
    mv17,
    lateral(mv18, "half-pass", "left", "D", "E"),
    mv19,
    mv20,
    mv21,
    mv22,
  ],
};
