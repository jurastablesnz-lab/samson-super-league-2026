import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_RISING,
  along,
  circle,
  diag,
  halt,
  lat,
  line,
  mv,
} from "../shared.ts";

const arena = "40" as const;

/** CCN105, CCN1* and CCN2*. British Eventing Novice Test 112 (2009). */
export const TEST_EV_B3: SetTest = {
  id: "ev-b3",
  short: "B3",
  name: "Eventing B3",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose: "Novice eventing dressage for CCN105, CCN1* and CCN2*.",
  instructions: SITTING_OR_RISING,
  introduces: "Leg yield from the three-quarter line, and a change of lead through trot",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at working trot. Proceed down the centre line without halting"],
        ["C", "Track left"],
      ],
      "Regularity of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "E", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["E", "Circle left 15 metres diameter"],
        ["E A", "Working trot"],
      ],
      "Size and shape of the circle; regularity.",
      [circle("E", 15), line(along("E", "A", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      3,
      [["After A", "Down the three-quarter line to the B–X–E line, then leg yield right to M"]],
      "Straightness on the three-quarter line, then the leg yield. The three-quarter line is drawn as the centre line to X.",
      [line(["A", "X"]), diag("X", "M")],
      { pace: "trot", lateral: lat("leg-yield", "right", "X", "M") },
    ),
    mv(
      4,
      [
        ["M C H", "Working trot"],
        ["H X F", "Change the rein, show some medium trot"],
        ["F", "Working trot"],
      ],
      "The medium trot; straightness; willing return to working trot.",
      [line(along("M", "H", "left", arena)), diag("H", "F")],
      { pace: "medium" },
    ),
    mv(
      5,
      [
        ["A", "Medium walk"],
        ["K B H", "Free walk on a long rein"],
      ],
      "Regularity of the walks; ground cover of the free walk.",
      [line(along("F", "K", "right", arena)), diag("K", "B"), line(along("B", "H", "left", arena))],
      { pace: "free" },
    ),
    mv(
      6,
      [
        ["H", "Medium walk (mark for medium walk A–K and H–C)"],
        ["C", "Working trot"],
      ],
      "Regularity of the medium walk; willing transition to trot.",
      line(along("H", "C", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["B", "Circle right 15 metres diameter"],
        ["B A", "Working trot"],
      ],
      "Size and shape of the circle; regularity.",
      [
        line(along("C", "B", "right", arena)),
        circle("B", 15),
        line(along("B", "A", "right", arena)),
      ],
      { pace: "trot" },
    ),
    mv(
      8,
      [["After A", "Turn down the three-quarter line to the E–X–B line, then leg yield left to H"]],
      "Straightness on the three-quarter line, then the leg yield. The three-quarter line is drawn as the centre line to X.",
      [line(["A", "X"]), diag("X", "H")],
      { pace: "trot", lateral: lat("leg-yield", "left", "X", "H") },
    ),
    mv(
      9,
      [
        ["H C M B", "Working trot"],
        [
          "B",
          "Circle right 20 metres diameter, with the transition to canter right the first time of crossing the centre line",
        ],
      ],
      "Willing transition on the circle; size and shape.",
      [line(along("H", "B", "right", arena)), circle("B", 20)],
      { pace: "canter" },
    ),
    mv(
      10,
      [["B F A K", "Working canter right"]],
      "Regularity of canter.",
      line(along("B", "K", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      11,
      [
        ["K X M", "Change the rein with a change of leg through trot over X"],
        ["M C H E", "Working canter left"],
      ],
      "The change of lead through trot is straight, and the new canter is regular.",
      [diag("K", "M"), line(along("M", "E", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      12,
      [["E", "Circle left 20 metres diameter, show some medium canter strides"]],
      "Size of the circle; the lengthening of the canter.",
      circle("E", 20),
      { pace: "medium-canter" },
    ),
    mv(
      13,
      [
        ["Before E", "Working canter left"],
        ["K A F", "Working canter left"],
      ],
      "The return to working canter; regularity.",
      line(along("E", "F", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      14,
      [
        ["F X H", "Change the rein with a change of leg through trot over X"],
        ["H C M", "Working canter right"],
      ],
      "The change of lead through trot is straight, and the new canter is regular.",
      [diag("F", "H"), line(along("H", "M", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      15,
      [
        ["M B F", "Show some medium canter strides"],
        ["Before F", "Working canter"],
      ],
      "The lengthening of the canter, and the return to working canter.",
      line(along("M", "F", "right", arena)),
      { pace: "medium-canter" },
    ),
    mv(
      16,
      [
        ["A", "Down centre line"],
        ["X", "Working trot"],
        ["G", "Halt. Immobility. Salute"],
      ],
      "Willing transition; straightness; immobility.",
      [line(along("F", "A", "right", arena)), line(["A", "X", "G"]), halt("G")],
      { pace: "trot" },
    ),
  ],
};
