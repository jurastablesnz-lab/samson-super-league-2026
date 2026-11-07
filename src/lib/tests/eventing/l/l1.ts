import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_RISING,
  along,
  circle,
  diag,
  half,
  halt,
  line,
  mv,
} from "../shared.ts";

const arena = "40" as const;

/** CCN65, CCN80, CCN95. British Eventing Intro Test 101 (2001). Diagrams follow the letters; the sheet has no judge directives. */
export const TEST_EV_L1: SetTest = {
  id: "ev-l1",
  short: "L1",
  name: "Eventing L1",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose:
    "Introductory eventing dressage for CCN65, CCN80 and CCN95. Working trot and canter, medium and free walk, on the 20×40 arena.",
  instructions: SITTING_OR_RISING,
  introduces: "Half circles in trot, 20m canter circles, and free walk on a long rein",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at working trot"],
        ["", "Proceed down centre line without halting"],
      ],
      "Regularity and quality of trot; straightness on the centre line.",
      line(["A", "X", "C"]),
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["C", "Track left"],
        ["C A", "Working trot"],
      ],
      "Bend and balance in the turn and through the corners.",
      line(along("C", "A", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      3,
      [["A", "Working trot half circle left 20m diameter"]],
      "Regularity; size, shape and bend of the half circle.",
      half("A", "X", "A"),
      { pace: "trot" },
    ),
    mv(
      4,
      [["X", "Half circle right 20m diameter"]],
      "Regularity; size, shape and bend of the half circle.",
      half("X", "C", "C"),
      { pace: "trot" },
    ),
    mv(
      5,
      [
        ["C M", "Working trot"],
        ["M X K", "Change rein"],
      ],
      "Regularity and straightness; bend and balance through the corners.",
      [line(along("C", "M", "right", arena)), diag("M", "K")],
      { pace: "trot" },
    ),
    mv(
      6,
      [
        ["K", "Working trot"],
        ["F X H", "Change rein"],
      ],
      "Regularity and straightness; bend and balance through the corners.",
      [line(along("K", "F", "left", arena)), diag("F", "H")],
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["Between C & M", "Working canter"],
        ["B", "Circle right 20m diameter"],
      ],
      "Willing transition; regularity of canter; size and shape of the circle.",
      [
        line(along("H", "C", "left", arena)),
        line(along("C", "B", "right", arena)),
        circle("B", 20),
      ],
      { pace: "canter" },
    ),
    mv(
      8,
      [["B F", "Working canter"]],
      "Regularity and quality of canter; bend through the corner.",
      line(along("B", "F", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      9,
      [
        ["F", "Working trot"],
        ["A", "Medium walk"],
      ],
      "Willing, calm transitions; regularity of trot and walk.",
      line(along("F", "A", "right", arena)),
      { pace: "walk" },
    ),
    mv(
      10,
      [
        ["K B", "Change rein at free walk on a long rein"],
        ["B M", "Medium walk"],
      ],
      "Regularity and ground cover of the free walk; clear transition to medium walk.",
      [line(along("A", "K", "right", arena)), diag("K", "B"), line(along("B", "M", "left", arena))],
      { pace: "free", coeff: 2 },
    ),
    mv(
      11,
      [
        ["M", "Working trot"],
        ["Between C & H", "Working canter"],
      ],
      "Willing transitions; regularity of trot and canter.",
      line(along("M", "H", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      12,
      [
        ["E", "Circle left 20m diameter"],
        ["E K", "Working canter"],
      ],
      "Regularity of canter; size, shape and bend of the circle.",
      [line(along("H", "E", "left", arena)), circle("E", 20), line(along("E", "K", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["K", "Working trot"],
        ["A", "Down centre line"],
        ["A G", "Working trot"],
      ],
      "Willing transition; straightness on the centre line; bend in the turn.",
      [line(along("K", "A", "left", arena)), line(["A", "X", "G"])],
      { pace: "trot" },
    ),
    mv(14, [["G", "Halt, Salute"]], "Straightness; attentiveness; immobility.", halt("G"), {
      pace: "trot",
    }),
  ],
};
