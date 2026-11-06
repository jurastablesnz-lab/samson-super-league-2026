import type { SetTest } from "../types.ts";
import {
  ARENA,
  INTRO_COLLECTIVES,
  INTRO_INSTRUCTIONS,
  INTRO_INTRODUCES,
  INTRO_PURPOSE,
  LEAVE,
  circle,
  diag,
  halt,
  line,
  mv,
} from "./shared.ts";

export const TEST_0B: SetTest = {
  id: "0b",
  short: "0B",
  name: "Introductory 0B",
  year: "ESNZ 2023",
  time: "Riding time not printed",
  drawTime: "5:00 (60×20) or 4:00 (40×20)",
  arena: ARENA,
  purpose: INTRO_PURPOSE,
  instructions: INTRO_INSTRUCTIONS,
  introduces: INTRO_INTRODUCES,
  leave: LEAVE,
  collectives: INTRO_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot rising"],
        ["X", "Halt through medium walk. Salute"],
        ["", "Proceed working trot rising"],
      ],
      "Regularity, quality of trot; willing, calm transitions; straightness; attentiveness; immobility (min. 3 seconds)",
      [line(["A", "X", "C"]), halt("X")],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["C", "Track left"],
        ["H E", "Working trot rising"],
      ],
      "Regularity, bend and balance in turn and corner",
      line(["C", "H", "S", "E"]),
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["E", "Circle left 20 meters"],
        ["E K", "Working trot rising"],
      ],
      "Regularity; shape and size of circle; bend; balance",
      [circle("E"), line(["E", "V", "K"])],
      { pace: "trot" },
    ),
    mv(
      4,
      [["Between K & A", "Medium walk"]],
      "Willing, calm transition; regularity, quality",
      line(["K", "A"]),
      { pace: "walk" },
    ),
    mv(
      5,
      [["F E", "Free walk"]],
      "Regularity, reach, and ground cover with over track of free walk allowing complete freedom to stretch the neck forward and downward into a light contact",
      diag("F", "E"),
      { pace: "free" },
    ),
    mv(
      6,
      [["E H", "Medium walk"]],
      "Willing, calm transition; regularity, quality, overtrack",
      line(["E", "S", "H"]),
      { pace: "walk" },
    ),
    mv(
      7,
      [
        ["Between H & C", "Working trot rising"],
        ["M B", "Working trot rising"],
      ],
      "Willing, calm transition; regularity of trot, bend and balance in corner",
      line(["H", "C", "M", "R", "B"]),
      { pace: "trot" },
    ),
    mv(
      8,
      [
        ["B", "Circle right 20 meters"],
        ["B A", "Working trot rising"],
      ],
      "Regularity; shape and size of circle; bend; balance",
      [circle("B"), line(["B", "P", "F", "A"])],
      { pace: "trot" },
    ),
    mv(
      9,
      [
        ["A", "Down centre line"],
        ["X", "Halt through medium walk. Salute"],
      ],
      "Bend and balance in turn; straightness; regularity of trot; willing, calm transition; straightness; attentiveness; immobility (min. 3 seconds)",
      [line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
