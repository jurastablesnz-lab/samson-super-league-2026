import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_RISING,
  along,
  circle,
  diag,
  halt,
  line,
  mv,
} from "../shared.ts";

const arena = "40" as const;

/** CCN65, CCN80, CCN95. British Eventing Intro Test 102 (2001). */
export const TEST_EV_L2: SetTest = {
  id: "ev-l2",
  short: "L2",
  name: "Eventing L2",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose:
    "Introductory eventing dressage for CCN65, CCN80 and CCN95. Canter is developed on the 20m circle.",
  instructions: SITTING_OR_RISING,
  introduces: "Canter departs on the 20m circle, and free walk on a long rein",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at working trot"],
        ["", "Proceed down centre line without halting"],
        ["C", "Track left"],
      ],
      "Regularity and quality of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [["H", "Working trot around the arena to F"]],
      "Regularity of trot; bend and balance through the corners.",
      line(along("H", "F", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      3,
      [["F X H", "Change the rein at working trot"]],
      "Regularity and straightness on the diagonal.",
      diag("F", "H"),
      { pace: "trot" },
    ),
    mv(
      4,
      [["H", "Working trot around the arena to A"]],
      "Regularity of trot; bend and balance through the corners.",
      line(along("H", "A", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      5,
      [
        ["A", "Commence circle right 20m and, on the circle between X and A"],
        ["X & A", "Working canter right"],
      ],
      "Willing transition on the circle; size, shape and bend.",
      circle("A", 20),
      { pace: "canter" },
    ),
    mv(
      6,
      [
        ["A E", "Working canter"],
        ["E", "Circle right 20m diameter"],
      ],
      "Regularity of canter; size and shape of the circle.",
      [line(along("A", "E", "right", arena)), circle("E", 20)],
      { pace: "canter" },
    ),
    mv(
      7,
      [
        ["H", "Working trot"],
        ["H C M", "Working trot"],
      ],
      "Willing transition; regularity of trot; bend in the corners.",
      line(along("E", "M", "right", arena)),
      { pace: "trot" },
    ),
    mv(
      8,
      [
        ["M X K", "Change the rein"],
        ["K A", "Working trot"],
      ],
      "Regularity and straightness; bend through the corner.",
      [diag("M", "K"), line(along("K", "A", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      9,
      [
        ["A", "Commence circle left 20m diameter, and on the circle between X and A"],
        ["X & A", "Working canter left"],
      ],
      "Willing transition on the circle; size, shape and bend.",
      circle("A", 20),
      { pace: "canter" },
    ),
    mv(
      10,
      [
        ["A B", "Working canter"],
        ["B", "Circle left 20m diameter"],
      ],
      "Regularity of canter; size and shape of the circle.",
      [line(along("A", "B", "left", arena)), circle("B", 20)],
      { pace: "canter" },
    ),
    mv(
      11,
      [
        ["M", "Working trot"],
        ["C", "Medium walk"],
      ],
      "Willing transitions; regularity of trot and walk.",
      line(along("B", "C", "left", arena)),
      { pace: "walk" },
    ),
    mv(
      12,
      [
        ["H B", "Change rein at free walk on a long rein"],
        ["B", "Medium walk"],
      ],
      "Regularity and ground cover of the free walk; clear transition to medium walk.",
      [line(along("C", "H", "left", arena)), diag("H", "B")],
      { pace: "free", coeff: 2 },
    ),
    mv(
      13,
      [
        ["F", "Working trot"],
        ["A", "Down centre line"],
        ["A G", "Working trot"],
      ],
      "Willing transition; straightness on the centre line.",
      [line(along("B", "A", "right", arena)), line(["A", "X", "G"])],
      { pace: "trot" },
    ),
    mv(14, [["G", "Halt, Salute"]], "Straightness; attentiveness; immobility.", halt("G"), {
      pace: "trot",
    }),
  ],
};
