import type { SetTest } from "../types.ts";
import { PARA_COLLECTIVES, circle, diag, half, halt, line, mv } from "../para-common.ts";

export const TEST_G1A: SetTest = {
  id: "g1a",
  short: "G1 A",
  name: "Grade I Para Grand Prix A",
  year: "FEI 2023",
  time: "5:00",
  drawTime: "",
  arena: "20 × 40",
  purpose:
    "FEI Para Dressage Grade I. Grand Prix A is the 2025 individual medal test (the 2023 index still calls it the former Team test).",
  instructions: "20 × 40 arena. Minimum age of horse: 6 years. Time is for information only.",
  introduces: "Individual medal test",
  leave: "Leave arena at A in walk on a long rein",
  collectives: PARA_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter in medium"],
        ["", "walk"],
        ["X", "Halt. Immobility. Salute. Proceed in"],
        ["", "medium walk"],
      ],
      "Quality of walk, halt, and transition. Straightness. Contact and poll.",
      [line(["A", "X", "C"]), halt("X")],
      { pace: "walk" },
    ),
    mv(
      2,
      [
        ["X G", "On the centre line"],
        ["G H", "Half volte left (10m"],
        ["", "Ø)"],
      ],
      "Regularity, straightness on the centre line and then balance and bend, size and shape of half volte.",
      [line(["X", "G"]), half("G", "H", "A")],
    ),
    mv(
      3,
      [
        ["H X", "On the diagonal"],
        ["X D", "On the centre line"],
      ],
      "Regularity, straightness, maintenance of four beat, activity.",
      [diag("H", "X"), line(["X", "D"])],
    ),
    mv(
      4,
      [
        ["D", "Volte right (8m Ø)"],
        ["D A", "On the centre line"],
      ],
      "Regularity, maintenance of rhythm and activity, fluency, balance, bend, size and shape of volte.",
      [circle("D", 8), line(["D", "A"])],
      { coeff: 2 },
    ),
    mv(
      5,
      [
        ["A A F", "Track left Medium walk"],
        ["F X", "On the diagonal"],
      ],
      "Regularity, quality of walk, suppleness of back, balance in turn, maintenance of rhythm and activity.",
      [line(["A", "A", "F"]), diag("F", "X")],
      { pace: "walk" },
    ),
    mv(
      6,
      [
        ["X G G M", "On the centre line Half volte right"],
        ["", "(10m Ø)"],
      ],
      "Regularity, straightness on the centre line and then balance and bend, size and shape of half volte.",
      half("X", "G", "C"),
    ),
    mv(
      7,
      [
        ["M X", "On the diagonal"],
        ["X D", "On the centre line"],
      ],
      "Regularity, straightness, maintenance of four beat, activity.",
      [diag("M", "X"), line(["X", "D"])],
    ),
    mv(
      8,
      [
        ["D", "Volte left (8m Ø)"],
        ["D A", "On the centre line"],
      ],
      "Regularity, maintenance of rhythm and activity, fluency, balance, bend, size and shape of volte.",
      [circle("D", 8), line(["D", "A"])],
      { coeff: 2 },
    ),
    mv(
      9,
      [
        ["A", "Track right"],
        ["A K E", "Medium walk"],
        ["E", "Turn right"],
        ["E X", "Medium walk"],
      ],
      "Regularity, quality of walk, balance, activity, straightness, bend in turns.",
      [line(["A"]), line(["A", "K", "E"]), line(["E"]), line(["E", "X"])],
      { pace: "walk" },
    ),
    mv(
      10,
      [
        ["X", "Halt. Immobility 5"],
        ["", "seconds. Proceed in medium"],
        ["", "walk"],
      ],
      "Transitions into and out of halt, quality of halt, immobility, correct time.",
      halt("X"),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      11,
      [
        ["X B", "Medium walk"],
        ["B", "Turn left"],
        ["B M C", "Medium walk"],
      ],
      "Regularity, quality of walk, balance, activity, bend in turn, straightness.",
      [line(["X", "B"]), line(["B"]), line(["B", "M", "C"])],
      { pace: "walk" },
    ),
    mv(
      12,
      [
        ["C A", "Serpentine, 3 equal loops, 5m along"],
        ["", "either side of the"],
        ["", "centre line,"],
        ["", "finishing on the left"],
        ["", "rein"],
      ],
      "Regularity and quality of walk, balance, bend, size and shape of loops, smooth changes of direction, contact.",
      { t: "zigzag", from: "C", to: "A", legs: 3, sideM: 5, start: "left" },
      { coeff: 2 },
    ),
    mv(
      13,
      [["A B", "Medium walk"]],
      "Regularity and quality of walk, activity, contact",
      line(["A", "B"]),
      { pace: "walk" },
    ),
    mv(
      14,
      [
        ["B E", "Half circle left (20m"],
        ["", "Ø) letting the horse"],
        ["", "stretch on a longer"],
        ["", "rein"],
        ["E", "Medium walk"],
      ],
      "Regularity, maintenance of rhythm and activity, relaxation, stretching forward downward of neck, lengthening of steps and frame without giving up contact.",
      [half("B", "E", "A", "left"), line(["E"])],
      { pace: "free" },
    ),
    mv(
      15,
      [
        ["B", "Transitions at B and"],
        ["E", "E"],
        ["E K A", "Medium walk"],
      ],
      "Gradual stretching forward downward to the bit, lengthening and shortening of steps and frame, maintenance of four beat, retaking reins without resistance.",
      [line(["B"]), line(["E"]), line(["E", "K", "A"])],
      { pace: "walk" },
    ),
    mv(
      16,
      [
        ["A G", "Down the centre"],
        ["", "line"],
      ],
      "Regularity, quality of walk, straightness, balance, contact.",
      line(["A", "G"]),
      { coeff: 2 },
    ),
    mv(
      17,
      [
        ["G", "Halt. Immobility."],
        ["", "Salute."],
        ["", "Leave arena at A in"],
        ["", "walk on a long rein"],
      ],
      "Transition into halt. Balance. Immobility. Straightness. Contact and poll.",
      halt("G"),
      { pace: "walk" },
    ),
  ],
};
