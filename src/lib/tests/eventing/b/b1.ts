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

/** CCN105, CCN1* and CCN2*. British Eventing Novice Test 123 (2001). */
export const TEST_EV_B1: SetTest = {
  id: "ev-b1",
  short: "B1",
  name: "Eventing B1",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "60 × 20",
  purpose: "Novice eventing dressage for CCN105, CCN1* and CCN2*.",
  instructions: SITTING_OR_RISING,
  introduces: "10m and 20m half circles, 15m canter circles, and free walk",
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
        ["C V", "Working trot"],
        ["V", "Half circle left 10 metres, returning to the track at S"],
      ],
      "Regularity; the half circle returns to the track at S. Drawn from V to S.",
      [line(along("C", "V", "left", arena)), half("V", "S", "C")],
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["S", "Half circle right 20 metres"],
        ["R", "Working trot"],
      ],
      "Size and bend of the half circle.",
      [half("S", "R", "C"), line(along("R", "B", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      4,
      [["P", "Half circle right 10 metres, returning to the track at R"]],
      "Size of the half circle. Drawn from P to R.",
      [line(along("B", "P", "right", arena)), half("P", "R", "A")],
      { pace: "trot" },
    ),
    mv(
      5,
      [
        ["R", "Half circle left 20 metres"],
        ["S", "Working trot"],
      ],
      "Size and bend of the half circle.",
      half("R", "S", "A"),
      { pace: "trot" },
    ),
    mv(
      6,
      [
        ["S F", "Change rein and progressively show some lengthened strides"],
        ["F", "Working trot"],
      ],
      "Lengthening of the stride; straightness; willing return to working trot.",
      diag("S", "F"),
      { pace: "medium" },
    ),
    mv(
      7,
      [
        ["V M", "Change rein and progressively show some lengthened strides"],
        ["M", "Working trot"],
      ],
      "Lengthening of the stride; straightness; willing return to working trot.",
      [line(along("F", "V", "right", arena)), diag("V", "M")],
      { pace: "medium" },
    ),
    mv(
      8,
      [
        ["C", "Medium walk"],
        ["H B", "Change rein at free walk on a long rein"],
      ],
      "Regularity of the walks; ground cover of the free walk.",
      [line(along("M", "H", "left", arena)), diag("H", "B")],
      { pace: "free", coeff: 2 },
    ),
    mv(
      9,
      [
        ["B", "Medium walk"],
        ["P", "Working trot"],
        ["P A", "Working trot"],
      ],
      "Willing transition; regularity of walk and trot.",
      line(along("B", "A", "right", arena)),
      { pace: "trot" },
    ),
    mv(
      10,
      [
        ["A", "Halt. Immobility 4 seconds"],
        ["", "Proceed at working trot"],
      ],
      "Straightness of the halt; immobility; willing transition.",
      [halt("A"), line(along("A", "K", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      11,
      [
        ["K", "Working canter right"],
        ["E", "Circle right 15 metres"],
      ],
      "Willing transition; size and shape of the 15m circle.",
      [line(along("K", "E", "right", arena)), circle("E", 15)],
      { pace: "canter" },
    ),
    mv(
      12,
      [["E C B", "Working canter"]],
      "Regularity of canter; bend through the corners.",
      line(along("E", "B", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      13,
      [
        ["B", "Turn right"],
        ["Before X", "Working trot"],
      ],
      "Bend in the turn; willing transition to trot.",
      line(["B", "X"]),
      { pace: "trot" },
    ),
    mv(
      14,
      [
        ["Before E", "Working canter left"],
        ["E", "Turn left"],
      ],
      "Willing transition; bend in the turn back to the track.",
      [line(["X", "E"]), line(along("E", "A", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      15,
      [["E A B", "Working canter"]],
      "Regularity of canter.",
      line(along("E", "B", "left", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      16,
      [
        ["B", "Circle left 15 metres"],
        ["B C H", "Working canter"],
      ],
      "Size and shape of the circle; regularity of canter.",
      [circle("B", 15), line(along("B", "H", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      17,
      [
        ["H", "Working trot"],
        ["E", "Turn left"],
      ],
      "Willing transition; bend in the turn across the arena.",
      [line(along("H", "E", "left", arena)), line(["E", "X"])],
      { pace: "trot" },
    ),
    mv(
      18,
      [
        ["X", "Turn left"],
        ["X", "Turn down centre line"],
        ["G", "Halt, immobility, salute"],
      ],
      "Bend in the turns; straightness; immobility.",
      [line(["X", "G"]), halt("G")],
      { pace: "trot" },
    ),
  ],
};
