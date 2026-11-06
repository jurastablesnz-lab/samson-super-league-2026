import type { SetTest } from "../types.ts";
import {
  FEI_COLLECTIVES,
  LEAVE,
  changes,
  circle,
  diag,
  halfPass,
  halfPirouette,
  halt,
  line,
  mv,
  shoulder,
} from "./shared.ts";

const shoulderLeft = mv(
  3,
  [["F B", "Shoulder-in left"]],
  "Regularity and quality of trot; bend and constant angle. Collection, balance, and fluency.",
  line(["F", "B"]),
);
const passLeft = mv(
  5,
  [
    ["B G", "Half-pass to the left"],
    ["G", "On the centre line"],
    ["C", "Track to the left"],
  ],
  "Regularity and quality of trot, uniform bend, collection, balance, fluency, crossing of legs.",
  [{ t: "yield", from: "B", to: "G" }, line(["G", "C"])],
  { coeff: 2 },
);
const shoulderRight = mv(
  8,
  [["K E", "Shoulder-in right"]],
  "Regularity and quality of trot; bend and constant angle. Collection, balance, and fluency.",
  line(["K", "E"]),
);
const passRight = mv(
  10,
  [
    ["E G", "Half-pass to the right"],
    ["G", "On the centre line"],
  ],
  "Regularity and quality of trot, uniform bend, collection, balance, fluency, crossing of legs.",
  { t: "yield", from: "E", to: "G" },
  { coeff: 2 },
);
const canterLeft = mv(
  16,
  [
    ["F X", "Half-pass to the left"],
    ["X", "Flying change of leg"],
  ],
  "Quality of canter. Collection, balance, uniform bend, fluency. Quality of flying change.",
  [
    { t: "yield", from: "F", to: "X" },
    { t: "change", from: "F", to: "X", along: 0.85 },
  ],
  { pace: "canter" },
);
const canterRight = mv(
  17,
  [
    ["X M", "Half-pass to the right"],
    ["M", "Flying change of leg"],
    ["M C H", "Collected canter"],
  ],
  "Quality of canter. Collection, balance, uniform bend, fluency. Quality of flying change.",
  [{ t: "yield", from: "X", to: "M" }, { t: "change", at: "M" }, line(["M", "C", "H"])],
  { pace: "canter" },
);

export const TEST_PSG: SetTest = {
  id: "psg",
  short: "PSG",
  name: "FEI Prix St-Georges",
  year: "FEI 2026",
  time: "5:50",
  drawTime: "",
  arena: "60 × 20",
  purpose:
    "FEI Prix St-Georges 2026. Small Tour test. Minimum age of horse: 7 years. Time 5:50 is for information only.",
  instructions: "To be ridden in a snaffle or a double bridle.",
  introduces: "Collected canter half-passes, walk and canter half-pirouettes, and tempi changes",
  leave: LEAVE,
  collectives: FEI_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter in collected canter"],
        ["X", "Halt, immobility, salute"],
        ["X C", "Proceed in collected trot"],
      ],
      "Quality of paces, halt, and transitions. Straightness. Contact and poll.",
      [line(["A", "X", "C"]), halt("X")],
      { pace: "canter" },
    ),
    mv(
      2,
      [
        ["C", "Track to the right"],
        ["M X K", "Medium trot"],
        ["K", "Collected trot"],
        ["K A F", "Collected trot"],
      ],
      "Regularity, elasticity, balance, engagement of the hindquarters, lengthening of steps and frame. Both transitions. Collection.",
      [line(["C", "M"]), diag("M", "K"), line(["K", "A", "F"])],
      { pace: "medium" },
    ),
    shoulder(shoulderLeft, "left", "F", "B"),
    mv(
      4,
      [["B", "Volte left (8m Ø)"]],
      "Regularity and quality of trot, collection, and balance. Bend; size and shape of volte.",
      circle("B", 8),
    ),
    halfPass(passLeft, "left", "B", "G"),
    mv(
      6,
      [
        ["H X F", "Extended trot"],
        ["F", "Collected trot"],
      ],
      "Regularity, elasticity, balance, energy of the hindquarters, overtrack. Lengthening of frame. Differentiation from medium trot.",
      diag("H", "F"),
      { pace: "extended" },
    ),
    mv(
      7,
      [
        ["F A K", "Transitions at H and F"],
        ["", "The collected trot"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Collection.",
      diag("H", "F"),
    ),
    shoulder(shoulderRight, "right", "K", "E"),
    mv(
      9,
      [["E", "Volte right (8m Ø)"]],
      "Regularity and quality of trot, collection, and balance. Bend; size and shape of volte.",
      circle("E", 8),
    ),
    halfPass(passRight, "right", "E", "G"),
    mv(
      11,
      [
        ["Before C", "Collected walk"],
        ["C", "Track to the left"],
        ["H", "Turn left"],
        ["Between G and M", "Half pirouette to the left"],
      ],
      "Regularity, activity, collection, size, flexion and bend of the half pirouette. Forward tendency, maintenance of the four-beat.",
      [line(["C", "H", "G"]), halfPirouette("G", "M", 0.5, "left")],
      { pace: "walk" },
    ),
    mv(
      12,
      [
        ["Between G and H", "Half pirouette to the right"],
        ["G M", "Collected walk"],
      ],
      "Regularity, activity, collection, size, flexion and bend of the half pirouette. Forward tendency, maintenance of the four-beat.",
      [halfPirouette("G", "H", 0.5, "right"), line(["G", "M"])],
      { pace: "walk" },
    ),
    mv(
      13,
      [["", "The collected walk C-H-G-(M)-G-(H)-G-M"]],
      "Regularity, suppleness of the back, activity, shortening and heightening of steps, self-carriage. Transition into walk.",
      [
        line(["C", "H", "G", "M"]),
        halfPirouette("G", "M", 0.5, "left"),
        halfPirouette("G", "H", 0.5, "right"),
      ],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      14,
      [["M R X V", "Extended walk"]],
      "Regularity, suppleness of the back, activity, overtrack, freedom of shoulder, stretching to the bit.",
      diag("M", "K"),
      { pace: "free", coeff: 2 },
    ),
    mv(
      15,
      [
        ["Before K", "Collected walk"],
        ["K", "Proceed in collected canter left"],
        ["K A F", "Collected canter"],
      ],
      "Precise execution and fluency of transition. Quality of canter.",
      line(["K", "A", "F"]),
      { pace: "canter" },
    ),
    halfPass(canterLeft, "left", "F", "X"),
    halfPass(canterRight, "right", "X", "M"),
    mv(
      18,
      [
        ["H", "Proceed towards X in collected canter"],
        ["Between H and X", "Half pirouette to the left"],
      ],
      "Collection, self-carriage, balance, size, flexion and bend. Correct number of strides (3-4). Quality of canter before and after.",
      [line(["H", "X"]), halfPirouette("H", "X", 0.55, "left")],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      19,
      [
        ["H C", "Counter canter"],
        ["C", "Flying change of leg"],
      ],
      "Quality and collection of counter canter. Correctness, balance, fluency, uphill tendency and straightness of the change.",
      [line(["H", "C"]), { t: "change", at: "C" }],
      { pace: "canter" },
    ),
    mv(
      20,
      [
        ["M", "Proceed towards X in collected canter"],
        ["Between M and X", "Half pirouette to the right"],
      ],
      "Collection, self-carriage, balance, size, flexion and bend. Correct number of strides (3-4). Quality of canter before and after.",
      [line(["M", "X"]), halfPirouette("M", "X", 0.55, "right")],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      21,
      [
        ["M C", "Counter canter"],
        ["C", "Flying change of leg"],
      ],
      "Quality and collection of counter canter. Correctness, balance, fluency, uphill tendency and straightness of the change.",
      [line(["M", "C"]), { t: "change", at: "C" }],
      { pace: "canter" },
    ),
    mv(
      22,
      [
        ["H X F", "On the diagonal 5 flying changes of leg every 4th stride"],
        ["F A K", "Collected canter"],
      ],
      "Correctness, balance, fluency, uphill tendency, straightness. Quality of canter before and after.",
      [diag("H", "F"), ...changes("H", "F", [0.1, 0.3, 0.5, 0.7, 0.9]), line(["F", "A", "K"])],
      { pace: "canter" },
    ),
    mv(
      23,
      [
        ["K X M", "On the diagonal 5 flying changes of leg every 3rd stride"],
        ["M C H", "Collected canter"],
      ],
      "Correctness, balance, fluency, uphill tendency, straightness. Quality of canter before and after.",
      [diag("K", "M"), ...changes("K", "M", [0.22, 0.36, 0.5, 0.64, 0.78]), line(["M", "C", "H"])],
      { pace: "canter" },
    ),
    mv(
      24,
      [["H X F", "Extended canter"]],
      "Quality of canter, impulsion, lengthening of strides and frame. Balance, uphill tendency, straightness.",
      diag("H", "F"),
      { pace: "extended-canter" },
    ),
    mv(
      25,
      [
        ["F", "Collected canter and flying change of leg"],
        ["F A", "Collected canter"],
      ],
      "Quality of the flying change on the diagonal. Precise, smooth execution of the transition. Collection.",
      [diag("H", "F"), { t: "change", from: "H", to: "F", along: 0.85 }, line(["F", "A"])],
      { pace: "canter" },
    ),
    mv(
      26,
      [
        ["A", "Down the centre line"],
        ["X", "Halt, immobility, salute"],
      ],
      "Quality of pace, halt, and transition. Straightness. Contact and poll.",
      [line(["A", "X"]), halt("X")],
    ),
  ],
};
