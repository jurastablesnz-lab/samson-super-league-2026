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

const arena = "60" as const;

/** CCN95 and CCN105. British Eventing Test 104 (2009). */
export const TEST_EV_A4: SetTest = {
  id: "ev-a4",
  short: "A4",
  name: "Eventing A4",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "60 × 20",
  purpose: "Novice eventing dressage for CCN95 and CCN105, ridden in the 60×20 arena.",
  instructions: SITTING_OR_RISING,
  introduces: "Half circles of 15m and 20m, a halt, and canter departs on the circle",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot and proceed down centre line without halting"],
        ["C", "Track left"],
      ],
      "Regularity of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["H E", "Working trot"],
        ["E", "Half circle left 20m diameter to B"],
        ["B R", "Working trot"],
      ],
      "Regularity; size and bend of the half circle.",
      [
        line(along("H", "E", "left", arena)),
        half("E", "B", "A", "left"),
        line(along("B", "R", "left", arena)),
      ],
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["R", "Half circle left 15m diameter returning to the track at P"],
        ["P F A", "Working trot"],
      ],
      "Size of the half circle; regularity of trot. The sheet's 15m half joins R to P.",
      [half("R", "P", "C"), line(along("P", "A", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      4,
      [
        ["A", "Halt. Immobility 5 seconds"],
        ["", "Proceed at working trot"],
      ],
      "Straightness of the halt; immobility; willing transition.",
      [halt("A"), line(along("A", "K", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      5,
      [["A K E", "Working trot"]],
      "Regularity of trot; bend through the corners.",
      line(along("A", "E", "right", arena)),
      {
        pace: "trot",
      },
    ),
    mv(
      6,
      [
        ["E", "Half circle 20m diameter to B"],
        ["B P", "Working trot"],
      ],
      "Size and bend of the half circle.",
      [half("E", "B", "C", "right"), line(along("B", "P", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["P", "Half circle right 15m diameter returning to the track at R"],
        ["R C", "Working trot"],
      ],
      "Size of the half circle; regularity of trot. The sheet's 15m half joins P to R.",
      [half("P", "R", "A"), line(along("R", "C", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      8,
      [
        ["C", "Medium walk"],
        ["H P", "Change rein at free walk on a long rein"],
        ["P F", "Medium walk"],
      ],
      "Regularity of the walks; ground cover of the free walk.",
      [line(along("C", "H", "left", arena)), diag("H", "P"), line(along("P", "F", "right", arena))],
      { pace: "free", coeff: 2 },
    ),
    mv(
      9,
      [
        ["F", "Working trot"],
        [
          "A",
          "Circle right 20m diameter, with transition to working canter between A and the centre line",
        ],
        ["A K V E S", "Working canter"],
      ],
      "Willing transition on the circle; regularity of canter.",
      [
        line(along("F", "A", "right", arena)),
        circle("A", 20),
        line(along("A", "S", "right", arena)),
      ],
      { pace: "canter" },
    ),
    mv(
      10,
      [["S", "Half circle 20m diameter to R, with transition to trot on the centre line"]],
      "Size of the half circle; willing transition to trot.",
      half("S", "R", "A"),
      { pace: "trot" },
    ),
    mv(
      11,
      [
        ["R B", "Working trot"],
        ["B", "Turn right"],
        ["E", "Track left"],
        ["E A", "Working trot"],
      ],
      "Bend in the turns; regularity of trot.",
      [
        line(along("R", "B", "right", arena)),
        line(["B", "X", "E"]),
        line(along("E", "A", "left", arena)),
      ],
      { pace: "trot" },
    ),
    mv(
      12,
      [
        [
          "A",
          "Circle left 20m diameter, with transition to working canter between A and the centre line",
        ],
        ["A F P B R", "Working canter"],
      ],
      "Willing transition on the circle; regularity of canter.",
      [circle("A", 20), line(along("A", "R", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      13,
      [["R", "Half circle left 20m to S, transition to trot on the centre line"]],
      "Size of the half circle; willing transition to trot.",
      half("R", "S", "A"),
      { pace: "trot" },
    ),
    mv(
      14,
      [
        ["S E", "Working trot"],
        ["E", "Turn left"],
        ["X", "Halt. Immobility. Proceed working trot"],
        ["B", "Track right"],
        ["B A", "Working trot"],
      ],
      "Bend in the turns; straightness of the halt; regularity.",
      [
        line(along("S", "E", "left", arena)),
        line(["E", "X"]),
        halt("X"),
        line(["X", "B"]),
        line(along("B", "A", "right", arena)),
      ],
      { pace: "trot" },
    ),
    mv(
      15,
      [
        ["A", "Down centre line"],
        ["X", "Halt. Immobility. Salute"],
      ],
      "Bend in the turn; straightness; immobility.",
      [line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
