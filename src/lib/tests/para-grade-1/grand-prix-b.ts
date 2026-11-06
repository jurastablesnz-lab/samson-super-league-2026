import type { SetTest } from "../types.ts";
import { PARA_COLLECTIVES, circle, diag, half, halt, line, mv } from "../para-common.ts";

export const TEST_G1B: SetTest = {
  id: "g1b",
  short: "G1 B",
  name: "Grade I Para Grand Prix B",
  year: "FEI 2023",
  time: "5:00",
  drawTime: "",
  arena: "20 × 40",
  purpose:
    "FEI Para Dressage Grade I. Grand Prix B is the 2025 team medal test (the 2023 index still calls it the former Individual test).",
  instructions: "20 × 40 arena. Minimum age of horse: 6 years. Time is for information only.",
  introduces: "Team medal test",
  leave: "Leave arena at A in walk on a long rein",
  collectives: PARA_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter in medium"],
        ["", "walk"],
        ["X", "Halt. Immobility."],
        ["", "Salute. Proceed in medium"],
        ["", "walk"],
        ["X C", "Medium walk"],
      ],
      "Quality of walk, halt, and transitions. Straightness. Contact and poll.",
      [line(["A", "X", "C"]), halt("X"), line(["X", "C"])],
      { pace: "walk" },
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["C M M X", "Medium walk On the diagonal"],
      ],
      "Regularity, suppleness of the back, activity, straightness.",
      [line(["C"]), diag("C", "X")],
      { pace: "walk" },
    ),
    mv(
      3,
      [["X", "Volte left (10m Ø)"]],
      "Regularity, maintenance of rhythm and activity, fluency, balance, bend, size and shape of volte.",
      circle("X", 10),
    ),
    mv(
      4,
      [
        ["X F", "On the diagonal"],
        ["F A", "Medium walk"],
      ],
      "Regularity, suppleness of the back, activity, straightness.",
      [diag("X", "F"), line(["F", "A"])],
      { pace: "walk" },
    ),
    mv(
      5,
      [
        ["A D", "Down the centre"],
        ["D", "line Volte right (8m Ø)"],
      ],
      "Regularity, maintenance of rhythm and activity, fluency, balance, bend, size and shape of volte.",
      [line(["A", "D"]), circle("D", 8)],
      { coeff: 2 },
    ),
    mv(
      6,
      [["D X G", "On the centre line"]],
      "Regularity, quality of walk, straightness, balance, contact.",
      line(["D", "X", "G"]),
      { coeff: 2 },
    ),
    mv(
      7,
      [
        ["G", "Volte left (8m Ø)"],
        ["G C", "Medium walk"],
        ["C", "Track left"],
      ],
      "Regularity, maintenance of rhythm and activity, fluency, balance, bend, size and shape of volte.",
      [circle("G", 8), line(["G", "C"]), line(["C"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      8,
      [
        ["C H", "Medium walk"],
        ["H X", "On the diagonal"],
      ],
      "Regularity, suppleness of the back, activity, straightness.",
      [line(["C", "H"]), diag("H", "X")],
      { pace: "walk" },
    ),
    mv(
      9,
      [["X", "Volte right (10m Ø) diameter"]],
      "Regularity, maintenance of rhythm and activity, fluency, balance, bend, size and shape of volte.",
      circle("X", 10),
    ),
    mv(
      10,
      [
        ["X K", "On the diagonal"],
        ["K A", "Medium walk"],
      ],
      "Regularity, suppleness of the back, activity, straightness.",
      [diag("X", "K"), line(["K", "A"])],
      { pace: "walk" },
    ),
    mv(
      11,
      [
        ["A C", "Serpentine, 3 equal loops 5m along"],
        ["", "either side of the"],
        ["", "centre line,"],
        ["", "finishing on the left"],
        ["", "rein"],
      ],
      "Regularity and quality of walk, balance, bend, size and shape of loops, smooth change of direction, contact.",
      { t: "zigzag", from: "C", to: "A", legs: 3, sideM: 5, start: "left" },
      { coeff: 2 },
    ),
    mv(
      12,
      [
        ["C X", "Half circle left (20m"],
        ["", "Ø)"],
      ],
      "Regularity, quality of walk, balance, bend, activity, size and shape of half circle. Grade I Para Grand",
      half("C", "X", "C"),
    ),
    mv(
      13,
      [
        ["X", "Halt. Immobility 5 seconds. Proceed in"],
        ["", "medium walk"],
      ],
      "Transitions into and out of halt, quality of halt, immobility, correct time, quality of walk.",
      halt("X"),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      14,
      [
        ["X A", "Half circle right (20m Ø)"],
        ["A K", "Medium walk"],
      ],
      "Regularity, quality of walk, balance, bend, activity, size and shape of half circle.",
      [half("X", "A", "A"), line(["A", "K"])],
      { pace: "walk" },
    ),
    mv(
      15,
      [
        ["K F", "Half circle right"],
        ["", "(20m Ø) letting the horse stretch on a"],
        ["", "longer rein"],
        ["F", "Medium walk"],
      ],
      "Regularity, maintenance of rhythm and activity, relaxation, stretching forward downward of neck, lengthening of steps and frame without giving up contact.",
      [half("K", "F", "C"), line(["F"])],
      { pace: "free" },
    ),
    mv(
      16,
      [
        ["K", "Transitions at K and"],
        ["F", "F"],
        ["F A", "Medium walk"],
      ],
      "Gradual stretching forward downward to the bit, lengthening and shortening of steps and frame, maintenance of four beat, retaking reins without resistance.",
      [line(["K"]), line(["F"]), line(["F", "A"])],
      { pace: "walk" },
    ),
    mv(
      17,
      [
        ["A X", "Down the centre"],
        ["X", "line Halt. Immobility."],
        ["", "Salute."],
        ["", "Leave arena at A in"],
        ["", "walk on a long rein"],
      ],
      "Quality of pace, halt, and transition. Straightness. Contact and poll.",
      [line(["A", "X"]), halt("X")],
      { pace: "walk" },
    ),
  ],
};
