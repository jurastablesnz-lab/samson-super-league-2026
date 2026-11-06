import type { SetTest } from "../types.ts";
import {
  ARENA,
  ARENA_SIZE,
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

export const TEST_0C: SetTest = {
  id: "0c",
  short: "0C",
  name: "Introductory 0C",
  year: "ESNZ 2023",
  time: "Riding time not printed",
  drawTime: "6:00 (60×20) or 5:00 (40×20)",
  arena: ARENA,
  arenaSize: ARENA_SIZE,
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
      "Regularity and quality of trot; willing calm transitions; straightness, attentiveness; immobility (min 3 secs)",
      [line(["A", "X", "C"]), halt("X")],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["M B", "Working trot rising"],
      ],
      "Regularity; bend and balance in turn and corner",
      line(["C", "M", "B"]),
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["B", "Circle right 20 meters"],
        ["B F", "Working trot rising"],
      ],
      "Regularity; shape and size of circle; bend; balance",
      [circle("B"), line(["B", "F"])],
      { pace: "trot" },
    ),
    mv(
      4,
      [
        [
          "A",
          "Circle right 20 meters developing working canter in first quarter of the circle, right lead",
        ],
        ["Before A", "Working trot rising"],
      ],
      "Regularity and quality of gaits; shape and size of circle; bend; balance",
      circle("A"),
      { pace: "trot" },
    ),
    mv(5, [["", "(Transition in & out of canter)"]], "Willing and calm transitions", circle("A"), {
      pace: "canter",
    }),
    mv(
      6,
      [
        ["K X M", "Change rein"],
        ["M C E", "Working trot rising"],
      ],
      "Regularity of trot; straightness; bend and balance in corners",
      [diag("K", "M"), line(["M", "C", "H", "E"])],
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["E", "Circle left 20 meters"],
        ["E A", "Working trot rising"],
      ],
      "Regularity; shape and size of circle; bend; balance",
      [circle("E"), line(["E", "K", "A"])],
      { pace: "trot" },
    ),
    mv(
      8,
      [
        [
          "A",
          "Circle left 20 meters developing working canter in first quarter of the circle, left lead",
        ],
        ["Before A", "Working trot rising"],
      ],
      "Regularity and quality of gaits; shape and size of circle; bend; balance",
      circle("A"),
      { pace: "trot" },
    ),
    mv(9, [["", "(Transition in & out of canter)"]], "Willing and calm transitions", circle("A"), {
      pace: "canter",
    }),
    mv(
      10,
      [["Between F & B", "Medium walk"]],
      "Willing, calm transition; regularity, quality, overtrack",
      line(["F", "B"]),
      { pace: "walk" },
    ),
    mv(
      11,
      [
        ["B H", "Free walk"],
        ["H C", "Medium walk"],
      ],
      "Regularity and quality of walks; reach and ground cover with over track; allowing complete freedom to stretch the neck forward and downward into light contact; straightness; willing, calm transitions",
      [diag("B", "H"), line(["H", "C"])],
      { pace: "walk" },
    ),
    mv(
      12,
      [["Between C & M", "Working trot rising to A"]],
      "Willing, calm transition; regularity of trot; bend and balance in corner, straightness",
      line(["C", "M", "B", "F", "A"]),
      { pace: "trot" },
    ),
    mv(
      13,
      [
        ["A", "Down centre line"],
        ["X", "Halt through medium walk. Salute"],
      ],
      "Bend and balance in turn; regularity of trot; willing, calm transition; straightness; attentiveness; immobility (min. 3 seconds)",
      [line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
