import type { SetTest } from "../types.ts";
import {
  FEI_COLLECTIVES,
  LEAVE,
  changes,
  circle,
  diag,
  fullPirouette,
  halfPass,
  halt,
  line,
  mv,
  reinBack,
  shoulder,
} from "./shared.ts";

const shoulderRight = mv(
  3,
  [
    ["A", "Down the centre line"],
    ["D X", "Shoulder-in right"],
  ],
  "Regularity and quality of trot; bend and constant angle. Collection, balance, and fluency.",
  line(["A", "D", "X"]),
);
const passRight = mv(
  5,
  [
    ["X M", "Half-pass to the right"],
    ["M C", "Collected trot"],
  ],
  "Regularity and quality of trot, uniform bend, collection, balance, fluency, crossing of legs.",
  [{ t: "yield", from: "X", to: "M" }, line(["M", "C"])],
  { coeff: 2 },
);
const passLeft = mv(
  7,
  [["H X", "Half-pass to the left"]],
  "Regularity and quality of trot, uniform bend, collection, balance, fluency, crossing of legs.",
  { t: "yield", from: "H", to: "X" },
  { coeff: 2 },
);
const shoulderLeft = mv(
  9,
  [
    ["X D", "Shoulder-in left"],
    ["D", "On the centre line"],
    ["A", "Track to the right"],
  ],
  "Regularity and quality of trot; bend and constant angle. Collection, balance, and fluency.",
  line(["X", "D", "A"]),
);

export const TEST_INT_I: SetTest = {
  id: "int-i",
  short: "Int I",
  name: "FEI Intermediate I",
  year: "FEI 2026",
  time: "5:30",
  drawTime: "",
  arena: "60 × 20",
  purpose:
    "FEI Intermediate I 2026. Small Tour test. Minimum age of horse: 7 years. Time 5:30 is for information only.",
  instructions: "To be ridden in a snaffle or a double bridle.",
  introduces: "Canter zig-zag, full canter pirouettes, and two-tempi changes",
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
        ["C", "Track to the left"],
        ["H X F", "Extended trot"],
        ["F", "Collected trot"],
        ["F A", "Collected trot"],
      ],
      "Regularity, elasticity, balance, energy of the hindquarters, overtrack. Lengthening of frame. Both transitions. Collection.",
      [line(["C", "H"]), diag("H", "F"), line(["F", "A"])],
      { pace: "extended" },
    ),
    shoulder(shoulderRight, "right", "D", "X"),
    mv(
      4,
      [["X", "Volte right (8m Ø)"]],
      "Regularity and quality of trot, collection, and balance. Bend; size and shape of the volte.",
      circle("X", 8),
    ),
    halfPass(passRight, "right", "X", "M"),
    mv(
      6,
      [["C", "Halt, immobility. Rein back 5 steps and immediately proceed in collected trot"]],
      "Quality of halt and transitions. Throughness, fluency, straightness. Accuracy in the number of diagonal steps.",
      [halt("C"), reinBack("C", 5)],
    ),
    halfPass(passLeft, "left", "H", "X"),
    mv(
      8,
      [["X", "Volte left (8m Ø)"]],
      "Regularity and quality of trot, collection, and balance. Bend; size and shape of the volte.",
      circle("X", 8),
    ),
    shoulder(shoulderLeft, "left", "X", "D"),
    mv(
      10,
      [["K R", "Medium trot"]],
      "Regularity, elasticity, balance, engagement of the hindquarters, lengthening of steps and frame. Both transitions. Differentiation from extended trot.",
      diag("K", "R"),
      { pace: "medium" },
    ),
    mv(
      11,
      [
        ["R", "Collected walk"],
        ["R M G H", "Collected walk"],
      ],
      "Regularity, suppleness of the back, activity, shortening and heightening of steps, self-carriage. Transition into walk.",
      line(["R", "M", "C", "H"]),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      12,
      [["H B", "Extended walk"]],
      "Regularity, suppleness of the back, activity, overtrack, freedom of shoulder, stretching to the bit.",
      line(["H", "E", "B"]),
      { pace: "free", coeff: 2 },
    ),
    mv(
      13,
      [
        ["Before P", "Collected walk"],
        ["P", "Proceed in collected canter right"],
        ["P F A", "Collected canter"],
      ],
      "Precise execution and fluency of the transitions. Quality of canter.",
      line(["P", "F", "A"]),
      { pace: "canter" },
    ),
    mv(
      14,
      [
        ["A", "Down the centre line"],
        [
          "Between D and G",
          "3 half-passes 5m either side of the centre line, flying change at each change of direction, starting and ending to the right",
        ],
        ["G", "Flying change of leg"],
        ["C", "Track to the left"],
      ],
      "Quality of canter. Uniform bend, collection, balance, fluency from side to side. Symmetrical execution. Quality of flying changes.",
      [
        { t: "zigzag", from: "D", to: "G", legs: 3, sideM: 5, start: "right" },
        { t: "change", from: "D", to: "G", along: 0.33 },
        { t: "change", from: "D", to: "G", along: 0.67 },
        { t: "change", at: "G" },
        line(["G", "C"]),
      ],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      15,
      [["H X F", "Extended canter"]],
      "Quality of canter, impulsion, lengthening of strides and frame. Balance, uphill tendency, straightness.",
      diag("H", "F"),
      { pace: "extended-canter" },
    ),
    mv(
      16,
      [
        ["F", "Collected canter and flying change of leg"],
        ["F A K", "Collected canter"],
      ],
      "Quality of the flying change on the diagonal. Precise, smooth execution of the transition. Collection.",
      [diag("H", "F"), { t: "change", from: "H", to: "F", along: 0.85 }, line(["F", "A", "K"])],
      { pace: "canter" },
    ),
    mv(
      17,
      [
        ["K X M", "On the diagonal 5 flying changes of leg every 3rd stride"],
        ["M C H", "Collected canter"],
      ],
      "Correctness, balance, fluency, uphill tendency, straightness. Quality of canter before and after.",
      [diag("K", "M"), ...changes("K", "M", [0.22, 0.36, 0.5, 0.64, 0.78]), line(["M", "C", "H"])],
      { pace: "canter" },
    ),
    mv(
      18,
      [
        ["H", "On the diagonal"],
        ["I", "Pirouette to the left"],
      ],
      "Collection, self-carriage, balance, size, flexion and bend. Correct number of strides (6-8). Quality of canter before and after.",
      [diag("H", "B"), fullPirouette("H", "I", 0.6, "left")],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      19,
      [
        ["B", "Flying change of leg"],
        ["", "Collected canter before and after B"],
      ],
      "Correctness, balance, fluency, uphill tendency, straightness of the flying change.",
      { t: "change", at: "B" },
      { pace: "canter" },
    ),
    mv(
      20,
      [
        ["B", "On the diagonal"],
        ["L", "Pirouette to the right"],
      ],
      "Collection, self-carriage, balance, size, flexion and bend. Correct number of strides (6-8). Quality of canter before and after.",
      [diag("B", "K"), fullPirouette("B", "L", 0.55, "right")],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      21,
      [
        ["K", "Flying change of leg"],
        ["K A F", "Collected canter"],
      ],
      "Correctness, balance, fluency, uphill tendency, straightness of the flying change. Quality of canter.",
      [line(["K", "A", "F"]), { t: "change", at: "K" }],
      { pace: "canter" },
    ),
    mv(
      22,
      [
        ["F X H", "On the diagonal 7 flying changes of leg every 2nd stride"],
        ["H C", "Collected canter"],
      ],
      "Correctness, balance, fluency, uphill tendency, straightness. Quality of canter before and after.",
      [
        diag("F", "H"),
        ...changes("F", "H", [0.15, 0.27, 0.39, 0.5, 0.61, 0.73, 0.85]),
        line(["H", "C"]),
      ],
      { pace: "canter" },
    ),
    mv(
      23,
      [
        ["C", "Collected trot"],
        ["C M", "Collected trot"],
      ],
      "Fluency; precise, smooth execution of the transition. Collection.",
      line(["C", "M"]),
    ),
    mv(
      24,
      [
        ["M X K", "Extended trot"],
        ["K", "Collected trot"],
        ["K A", "The collected trot"],
      ],
      "Regularity, elasticity, balance, energy of the hindquarters, overtrack. Lengthening of frame. Both transitions. Collection.",
      [diag("M", "K"), line(["K", "A"])],
      { pace: "extended" },
    ),
    mv(
      25,
      [
        ["A", "Down the centre line"],
        ["X", "Halt, immobility, salute"],
      ],
      "Quality of pace, halt, and transition. Straightness. Contact and poll.",
      [line(["A", "X"]), halt("X")],
    ),
  ],
};
