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
} from "./shared.ts";

export const TEST_1A: SetTest = {
  id: "1a",
  short: "1A",
  name: "Preliminary 1A",
  year: "ESNZ 2023",
  time: "5:00 or 4:00 from entry at A",
  drawTime: DRAW,
  arena: ARENA,
  purpose: PRELIM_PURPOSE,
  instructions: PRELIM_INSTRUCTIONS,
  introduces:
    "Working trot, working canter, medium walk, free walk on a long rein, 20m circles in trot and canter",
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
        ["C", "Track left"],
        ["E", "Circle left 20m"],
        ["E A", "Working trot"],
      ],
      "Regularity and quality of trot; shape and size of circle; bend; balance",
      [line(["C", "H", "S", "E"]), circle("E"), line(["E", "V", "K", "A"])],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      3,
      [["A", "Circle left 20m, developing left lead canter in first quarter of circle"]],
      "Willing, calm transition; regularity and quality of paces; shape and size of circle; bend; balance",
      circle("A"),
      { pace: "canter" },
    ),
    mv(
      4,
      [["A F B", "Working canter"]],
      "Regularity and quality of canter; bend and balance in corner; straightness",
      line(["A", "F", "P", "B"]),
      { pace: "canter" },
    ),
    mv(
      5,
      [["Between B & M", "Working trot"]],
      "Willing, calm transition; regularity and quality of paces; straightness; bend and balance in corner",
      line(["B", "R", "M"]),
      { pace: "trot", coeff: 2 },
    ),
    mv(
      6,
      [
        ["Between C & H", "Medium walk"],
        ["H E", "Medium walk"],
      ],
      "Willing, calm transition; regularity and quality of walk, bend and balance in corner",
      line(["C", "H", "S", "E"]),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      7,
      [
        ["E F", "Change rein in free walk on a long rein"],
        ["F A", "Medium walk"],
      ],
      "Regularity and quality of walks; reach, overtrack and ground cover of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
      [diag("E", "F"), line(["F", "A"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      8,
      [
        ["A", "Working trot"],
        ["A E", "Working trot"],
      ],
      "Willing, calm transition; regularity and quality of trot; bend and balance in corner; straightness",
      line(["A", "K", "V", "E"]),
      { pace: "trot" },
    ),
    mv(
      9,
      [
        ["E", "Circle right 20m"],
        ["E C", "Working trot"],
      ],
      "Regularity and quality of trot; shape and size of circle; bend; balance",
      [circle("E"), line(["E", "S", "H", "C"])],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      10,
      [["C", "Circle right 20m, developing right lead canter in first quarter of circle"]],
      "Willing, calm transition; regularity and quality of paces; shape and size of circle; bend; balance",
      circle("C"),
      { pace: "canter" },
    ),
    mv(
      11,
      [["C M B", "Working canter"]],
      "Regularity and quality of canter; bend and balance in corner; straightness",
      line(["C", "M", "R", "B"]),
      { pace: "canter" },
    ),
    mv(
      12,
      [
        ["Between B & F", "Working trot"],
        ["F A", "Working trot"],
      ],
      "Willing, calm transition; regularity and quality of trot; straightness; bend and balance in corner",
      line(["B", "P", "F", "A"]),
      { pace: "trot", coeff: 2 },
    ),
    mv(
      13,
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
