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

const sheet = {
  purpose: INTRO_PURPOSE,
  instructions: INTRO_INSTRUCTIONS,
  introduces: INTRO_INTRODUCES,
  collectives: INTRO_COLLECTIVES,
  arena: ARENA,
  leave: LEAVE,
  year: "ESNZ 2023",
};

export const TEST_0A: SetTest = {
  ...sheet,
  id: "0a",
  short: "0A",
  name: "Introductory 0A",
  time: "Riding time not printed",
  drawTime: "5:00 (60×20) or 4:00 (40×20)",
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot rising"],
        ["Between X & C", "Medium walk"],
      ],
      "Regularity, quality of trot; straightness, willing, calm transition. Regularity, quality of walk",
      line(["A", "X", "C"]),
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["M B F", "Working trot rising"],
      ],
      "Bend and balance; willing, calm transition",
      line(["C", "M", "R", "B", "P", "F"]),
      { pace: "trot" },
    ),
    mv(
      3,
      [["A", "Circle right 20 meters, working trot rising"]],
      "Regularity; shape and size of circle; bend; balance",
      circle("A"),
      { pace: "trot" },
    ),
    mv(
      4,
      [["K X M", "Change rein, working trot rising"]],
      "Regularity of trot; straightness; bend and balance in corner",
      diag("K", "M"),
      { pace: "trot" },
    ),
    mv(
      5,
      [["C", "Circle left 20 meters, working trot rising"]],
      "Regularity; shape and size of circle; bend; balance",
      circle("C"),
      { pace: "trot" },
    ),
    mv(
      6,
      [["Between C & H", "Medium walk"]],
      "Willing, calm transition; regularity, quality",
      line(["C", "H"]),
      { pace: "walk" },
    ),
    mv(
      7,
      [["H X F", "Change rein in free walk on a long rein"]],
      "Regularity and quality of walks; reach and ground cover with over track of free walk allowing complete freedom to stretch the neck forward and downward into light contact",
      diag("H", "F"),
      { pace: "free" },
    ),
    mv(
      8,
      [
        ["F A", "Medium walk"],
        ["A", "Down centre line"],
      ],
      "Regularity, quality, willing, calm transition, bend and balance in turn. Straightness on centre line",
      line(["F", "A", "X"]),
      { pace: "walk" },
    ),
    mv(
      9,
      [["X", "Halt, Salute"]],
      "Straightness; attentiveness; immobility (min. 3 seconds)",
      [line(["L", "X"]), halt("X")],
      { pace: "walk" },
    ),
  ],
};
