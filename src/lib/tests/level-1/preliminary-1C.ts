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
  loop,
  mv,
  stretch,
} from "./shared.ts";

export const TEST_1C: SetTest = {
  id: "1c",
  short: "1C",
  name: "Preliminary 1C",
  year: "ESNZ 2023",
  time: "5:30 or 4:30 from entry at A",
  drawTime: DRAW,
  arena: ARENA,
  purpose: PRELIM_PURPOSE,
  instructions: PRELIM_INSTRUCTIONS,
  introduces:
    "Serpentine in trot. Changing of bend on a shallow loop. Canter trot transition on diagonal",
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
        ["H X K", "One loop"],
      ],
      "Regularity and quality of trot; bend and balance in turns; shape and size of loop; changes of bend; balance",
      [line(["C", "H"]), loop("H", "K"), line(["K", "A"])],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      3,
      [
        ["Between A & F", "Working canter left lead"],
        ["F B", "Working canter"],
      ],
      "Willing, calm transition; quality of trot and canter; bend in corner; straightness",
      line(["A", "F", "P", "B"]),
      { pace: "canter" },
    ),
    mv(
      4,
      [
        ["B", "Circle left 20m"],
        ["B M C", "Working canter"],
      ],
      "Regularity and quality of canter; shape and size of circle; bend; balance",
      [circle("B"), line(["B", "R", "M", "C"])],
      { pace: "canter" },
    ),
    mv(
      5,
      [
        ["H X F", "Change rein"],
        ["X", "Working trot"],
      ],
      "Regularity and quality of paces; willing, calm transition; straightness; bend in corner",
      diag("H", "F"),
    ),
    mv(
      6,
      [
        ["A", "Medium walk"],
        ["A K", "Medium walk"],
      ],
      "Willing, calm balanced transition; regularity and quality of walk",
      line(["A", "K"]),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      7,
      [
        ["K X H", "Free walk on long rein"],
        ["H C", "Medium walk"],
      ],
      "Regularity and quality of walks; reach, overtrack and ground cover of free walk allowing complete freedom to stretch the neck forward and downward; straightness; willing, calm transitions",
      [loop("K", "H"), line(["H", "C"])],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      8,
      [
        ["C", "Working trot"],
        ["M X F", "One loop"],
      ],
      "Regularity and quality of trot; shape and size of loop; changes of bend and balance",
      [line(["C", "M"]), loop("M", "F")],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      9,
      [
        ["Between A & K", "Working canter right lead"],
        ["K E", "Working canter"],
      ],
      "Willing, calm transition; regularity and quality of trot and canter; bend and balance in corner; straightness",
      line(["A", "K", "V", "E"]),
      { pace: "canter" },
    ),
    mv(
      10,
      [
        ["E", "Circle right 20m"],
        ["E H C", "Working canter"],
      ],
      "Regularity and quality of canter, shape and size of circle; bend; balance",
      [circle("E"), line(["E", "S", "H", "C"])],
      { pace: "canter" },
    ),
    mv(
      11,
      [
        ["C", "Working trot"],
        ["C B", "Working trot"],
      ],
      "Willing, balanced transition; quality of trot",
      line(["C", "M", "R", "B"]),
      { pace: "trot" },
    ),
    mv(
      12,
      [
        ["B", "Circle right 20m rising trot, allowing the horse to stretch forward and downward"],
        ["Before B", "Shorten the reins"],
        ["B A", "Working trot"],
      ],
      "Forward and downward stretch over the back into a light contact maintaining balance and quality of trot; bend; shape and size of circle; smooth, willing, calm balanced transitions",
      [stretch("B"), line(["B", "P", "F", "A"])],
      { pace: "trot", coeff: 2 },
    ),
    mv(
      13,
      [
        ["A", "Down centre line"],
        ["X", "Halt, Salute"],
      ],
      "Bend and balance in turn; regularity and quality of trot; willing, calm transition; straight, attentive halt; immobility (min. 3 secs)",
      [line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
