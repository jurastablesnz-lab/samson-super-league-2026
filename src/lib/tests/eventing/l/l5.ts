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

const arena = "60" as const;

/** CCN65, CCN80, CCN95. L5 (2018), 60×20. */
export const TEST_EV_L5: SetTest = {
  id: "ev-l5",
  short: "L5",
  name: "Eventing L5",
  year: "ESNZ 2018",
  time: "4:00",
  drawTime: "6:00",
  arena: "60 × 20",
  purpose: "Introductory eventing dressage for CCN65, CCN80 and CCN95, ridden in the 60×20 arena.",
  instructions: SITTING_OR_RISING,
  introduces: "20m circles in trot and canter, and free walk on a long rein",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [["A", "Enter at working trot"]],
      "Regularity of trot; straightness on the centre line.",
      line(["A", "X", "C"]),
      {
        pace: "trot",
      },
    ),
    mv(
      2,
      [["C", "Track right"]],
      "Bend and balance in the turn.",
      line(along("C", "R", "right", arena)),
      {
        pace: "trot",
      },
    ),
    mv(
      3,
      [["R", "20 metre circle right"]],
      "Regularity; size, shape and bend of the circle.",
      circle("R", 20),
      {
        pace: "trot",
      },
    ),
    mv(
      4,
      [["Between F & A", "Canter right"]],
      "Willing transition to canter.",
      line(along("R", "A", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      5,
      [["A", "20 metre circle right"]],
      "Regularity of canter; size and shape of the circle.",
      circle("A", 20),
      {
        pace: "canter",
      },
    ),
    mv(
      6,
      [
        ["A K V E", "Working canter"],
        ["Between E & S", "Working trot"],
      ],
      "Regularity of canter; willing transition to trot.",
      line(along("A", "S", "right", arena)),
      { pace: "trot" },
    ),
    mv(
      7,
      [["C", "Medium walk"]],
      "Willing transition; regularity of the walk.",
      line(along("S", "C", "right", arena)),
      {
        pace: "walk",
      },
    ),
    mv(
      8,
      [
        ["M to E", "Free walk on a long rein"],
        ["E to V", "Medium walk"],
      ],
      "Ground cover of the free walk; clear transition to medium walk.",
      [diag("M", "E"), line(along("E", "V", "left", arena))],
      { pace: "free" },
    ),
    mv(
      9,
      [
        ["V K A P", "Working trot"],
        ["P", "20 metre circle left"],
      ],
      "Willing transition; size and shape of the circle.",
      [
        line(along("V", "A", "right", arena)),
        line(along("A", "P", "left", arena)),
        circle("P", 20),
      ],
      { pace: "trot" },
    ),
    mv(
      10,
      [["Between M & C", "Working canter left"]],
      "Willing transition to canter.",
      line(along("P", "C", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      11,
      [["C", "20 metre circle left"]],
      "Regularity of canter; size and shape of the circle.",
      circle("C", 20),
      {
        pace: "canter",
      },
    ),
    mv(
      12,
      [
        ["C H S E", "Working canter"],
        ["Between E & V", "Working trot"],
      ],
      "Regularity of canter; willing transition to trot.",
      line(along("C", "V", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      13,
      [
        ["V K A", "Working trot"],
        ["A", "Turn down centre line"],
      ],
      "Regularity of trot; bend in the turn; straightness.",
      [line(along("V", "A", "left", arena)), line(["A", "X"])],
      { pace: "trot" },
    ),
    mv(14, [["X", "Halt, Salute"]], "Straightness; attentiveness; immobility.", halt("X"), {
      pace: "trot",
    }),
  ],
};
