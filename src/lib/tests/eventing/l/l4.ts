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

/** CCN65, CCN80, CCN95. British Eventing Test 101 (2009). */
export const TEST_EV_L4: SetTest = {
  id: "ev-l4",
  short: "L4",
  name: "Eventing L4",
  year: "ESNZ 2009",
  time: "6:00",
  drawTime: "8:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose: "Introductory eventing dressage for CCN65, CCN80 and CCN95, with 15m trot circles.",
  instructions: SITTING_OR_RISING,
  introduces: "15m circles, a halt, free walk on a long rein, and canter",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at working trot and proceed down centre line without halting"],
        ["C", "Track left"],
      ],
      "Regularity and quality of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "E", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [["E", "Circle left 15m diameter"]],
      "Regularity; size, shape and bend of the 15m circle.",
      circle("E", 15),
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["A", "Down centre line"],
        ["C", "Track right"],
      ],
      "Bend in the turns; straightness on the centre line.",
      [
        line(along("E", "A", "left", arena)),
        line(["A", "X", "C"]),
        line(along("C", "B", "right", arena)),
      ],
      { pace: "trot" },
    ),
    mv(
      4,
      [
        ["B", "Circle right 15m diameter"],
        ["F A K", "Working trot"],
      ],
      "Regularity; size and shape of the circle; bend through the corners.",
      [circle("B", 15), line(along("B", "K", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      5,
      [
        ["K X M", "Change rein"],
        ["M", "Working trot"],
      ],
      "Regularity and straightness on the diagonal.",
      [diag("K", "M"), line(along("M", "C", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      6,
      [
        ["C", "Halt. Immobility 4 seconds"],
        ["", "Proceed in medium walk"],
      ],
      "Straightness of the halt; immobility; willing transition to walk.",
      [halt("C"), line(along("C", "H", "left", arena))],
      { pace: "walk" },
    ),
    mv(
      7,
      [
        ["H X F", "Change rein at free walk on a long rein"],
        ["F", "Medium walk"],
      ],
      "Ground cover of the free walk; clear transition to medium walk.",
      diag("H", "F"),
      { pace: "free", coeff: 2 },
    ),
    mv(
      8,
      [
        ["Between F & A", "Working trot"],
        ["Between A & K", "Working canter right"],
      ],
      "Willing transitions; regularity of trot and canter.",
      line(along("F", "K", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      9,
      [["C", "Circle right 20m diameter"]],
      "Regularity of canter; size and shape of the circle.",
      [line(along("K", "C", "right", arena)), circle("C", 20)],
      { pace: "canter" },
    ),
    mv(
      10,
      [
        ["M X K", "Change the rein"],
        ["X", "Working trot"],
      ],
      "Willing transition; straightness on the diagonal.",
      [diag("M", "K")],
      { pace: "trot" },
    ),
    mv(
      11,
      [
        ["Between K & A", "Working canter left"],
        ["A B C", "Working canter"],
      ],
      "Willing transition; regularity of canter.",
      line(along("K", "C", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      12,
      [["C", "Circle left 20m diameter"]],
      "Regularity of canter; size and shape of the circle.",
      circle("C", 20),
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["H X F", "Change the rein"],
        ["X", "Working trot"],
      ],
      "Willing transition; straightness on the diagonal.",
      diag("H", "F"),
      { pace: "trot" },
    ),
    mv(
      14,
      [
        ["X F", "Working trot"],
        ["A", "Down centre line"],
        ["A G", "Working trot"],
      ],
      "Regularity of trot; bend in the turn; straightness on the centre line.",
      [line(along("F", "A", "right", arena)), line(["A", "X", "G"])],
      { pace: "trot" },
    ),
    mv(15, [["G", "Halt. Salute"]], "Straightness; attentiveness; immobility.", halt("G"), {
      pace: "trot",
    }),
  ],
};
