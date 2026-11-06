import type { SetTest } from "../types.ts";
import {
  ARENA,
  DRAW,
  LEAVE,
  PRELIM_COLLECTIVES,
  PRELIM_INSTRUCTIONS,
  PRELIM_PURPOSE,
  circle,
  diag,
  halt,
  line,
  mv,
  stretch,
} from "./shared.ts";

export const TEST_1B: SetTest = {
  id: "1b",
  short: "1B",
  name: "Preliminary 1B",
  year: "ESNZ 2023",
  time: "5:30 or 4:30 from entry at A",
  drawTime: DRAW,
  arena: ARENA,
  purpose: PRELIM_PURPOSE,
  instructions: PRELIM_INSTRUCTIONS,
  introduces: "Stretch circle in trot",
  leave: LEAVE,
  collectives: PRELIM_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter in working trot"],
        ["X", "Halt, Salute"],
        ["", "Proceed in working trot"],
      ],
      "Regularity and quality of trot; willing calm transitions; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["A", "X", "C"]), halt("X")],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["B", "Circle right 20m"],
        ["B K", "Working trot"],
      ],
      "Regularity and quality of trot; shape and size of circle; bend; balance",
      [line(["C", "M", "R", "B"]), circle("B"), line(["B", "P", "F", "A", "K"])],
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["K X M", "Change rein"],
        ["M C", "Working trot"],
      ],
      "Regularity and quality of trot; straightness; bend and balance in corner",
      [diag("K", "M"), line(["M", "C"])],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      4,
      [
        ["Between C & H", "Working canter left lead"],
        ["H E", "Working canter"],
      ],
      "Willing, calm transition; regularity and quality of canter; bend and balance in corner; straightness",
      line(["C", "H", "S", "E"]),
      { pace: "canter", coeff: 2 },
    ),
    mv(
      5,
      [["E", "Circle left 20m"]],
      "Regularity and quality of canter; shape and size of circle; bend; balance",
      circle("E"),
      { pace: "canter" },
    ),
    mv(
      6,
      [
        ["Between E & K", "Working trot"],
        ["K A", "Working trot"],
      ],
      "Willing, calm transition; regularity and quality of trot; straightness, bend and balance in corner",
      line(["E", "V", "K", "A"]),
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["A", "Circle left 20m rising trot, allowing the horse to stretch forward and downward"],
        ["Before A", "Shorten the reins"],
        ["A F", "Working trot"],
      ],
      "Forward and downward stretch over the back into a light contact maintaining balance and quality of trot; bend; shape and size of circle; willing, calm transitions",
      [stretch("A"), line(["A", "F"])],
      { pace: "trot" },
    ),
    mv(
      8,
      [
        ["F", "Medium walk"],
        ["F E", "Change rein, medium walk"],
      ],
      "Willing, calm transition; regularity and quality of walk",
      diag("F", "E"),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      9,
      [
        ["E M", "Change rein, free walk on a long rein"],
        ["M C", "Medium walk"],
      ],
      "Regularity and quality of walks; reach, overtrack and ground cover of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
      [diag("E", "M"), line(["M", "C"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      10,
      [
        ["C", "Working trot"],
        ["C E", "Working trot"],
      ],
      "Willing, calm transition; regularity and quality of trot; bend and balance in corner; straightness",
      line(["C", "H", "S", "E"]),
      { pace: "trot" },
    ),
    mv(
      11,
      [
        ["E", "Circle left 20m"],
        ["E F", "Working trot"],
      ],
      "Regularity and quality of trot; shape and size of circle; bend; balance",
      [circle("E"), line(["E", "V", "K", "A", "F"])],
      { pace: "trot" },
    ),
    mv(
      12,
      [
        ["F X H", "Change rein"],
        ["H C", "Working trot"],
      ],
      "Regularity and quality of trot; straightness; bend and balance in corner",
      [diag("F", "H"), line(["H", "C"])],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      13,
      [
        ["Between C & M", "Working canter right lead"],
        ["M B", "Working canter"],
      ],
      "Willing, calm transition; regularity and quality of paces; bend and balance in corner; straightness",
      line(["C", "M", "R", "B"]),
      { pace: "canter", coeff: 2 },
    ),
    mv(
      14,
      [["B", "Circle right 20m"]],
      "Regularity and quality of canter; shape and size of circle; bend; balance",
      circle("B"),
      { pace: "canter" },
    ),
    mv(
      15,
      [
        ["Between B & F", "Working trot"],
        ["F A", "Working trot"],
      ],
      "Willing, calm transition; regularity and quality of paces; straightness, bend and balance in corner",
      line(["B", "P", "F", "A"]),
      { pace: "trot" },
    ),
    mv(
      16,
      [
        ["A", "Down centre line"],
        ["X", "Halt, Salute"],
      ],
      "Bend and balance in turn, regularity and quality of trot, willing, calm transition; straightness, attentiveness; immobility (min. 3 secs)",
      [line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
