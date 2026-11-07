import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_RISING,
  along,
  circle,
  diag,
  half,
  halt,
  lat,
  line,
  loop,
  mv,
  serpentine,
} from "../shared.ts";

const arena = "60" as const;

/** CCN105, CCN1* and CCN2*. British Eventing Novice Test 113 (2009). */
export const TEST_EV_B4: SetTest = {
  id: "ev-b4",
  short: "B4",
  name: "Eventing B4",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "60 × 20",
  purpose: "Novice eventing dressage for CCN105, CCN1* and CCN2*.",
  instructions: SITTING_OR_RISING,
  introduces: "Leg yield, 10m loops, a two-loop serpentine, and a stretching circle",
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
      [line(["A", "X", "C"]), line(along("C", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [["H P", "Change the rein, show some medium strides"]],
      "Lengthening of the stride; straightness.",
      diag("H", "P"),
      { pace: "medium" },
    ),
    mv(
      3,
      [
        ["P", "Working trot"],
        ["A", "Down centre line"],
      ],
      "Willing return to working trot; straightness on the centre line.",
      [line(along("P", "A", "right", arena)), line(["A", "X", "L"])],
      { pace: "trot" },
    ),
    mv(
      4,
      [["L", "Leg yield left to between S and H"]],
      "The leg yield is fluent and reaches the rail between S and H. Drawn to S.",
      diag("L", "S"),
      { pace: "trot", lateral: lat("leg-yield", "left", "L", "S") },
    ),
    mv(
      5,
      [
        ["H C M", "Working trot"],
        ["M V", "Change the rein, show some medium strides"],
      ],
      "The medium trot; straightness.",
      [line(along("S", "M", "right", arena)), diag("M", "V")],
      { pace: "medium" },
    ),
    mv(
      6,
      [
        ["V", "Working trot"],
        ["A", "Down centre line"],
      ],
      "Willing return to working trot; straightness.",
      [line(along("V", "A", "left", arena)), line(["A", "X", "L"])],
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["L", "Leg yield right to between R and M"],
        ["M C", "Working trot"],
      ],
      "The leg yield is fluent and reaches the rail between R and M. Drawn to R.",
      [diag("L", "R"), line(along("R", "C", "left", arena))],
      { pace: "trot", lateral: lat("leg-yield", "right", "L", "R") },
    ),
    mv(
      8,
      [
        ["C H S", "Medium walk"],
        ["S", "Half 20 metre circle to R, free walk on a long rein"],
      ],
      "Regularity of the walk; size of the half circle; stretch of the free walk.",
      [line(along("C", "S", "left", arena)), half("S", "R", "A")],
      { pace: "free" },
    ),
    mv(
      9,
      [["R M", "Medium walk (mark for medium walk R–M)"]],
      "Regularity and activity of the medium walk.",
      line(along("R", "M", "left", arena)),
      { pace: "walk" },
    ),
    mv(
      10,
      [["Between M & C", "Working canter left (the transition may be progressive)"]],
      "Willing transition to canter.",
      line(along("M", "C", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      11,
      [["H X K", "10 metre loop"]],
      "Size of the loop; regularity of canter.",
      [line(along("C", "H", "left", arena)), loop("H", "K", 10)],
      {
        pace: "canter",
      },
    ),
    mv(
      12,
      [
        [
          "A X",
          "Two-loop serpentine, touching the side of the arena, with a change of leg through trot over the centre line",
        ],
      ],
      "The two loops are equal, and the change through trot is straight. Drawn from A to X.",
      [line(along("K", "A", "left", arena)), serpentine("A", "left", 2, "X")],
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["X", "Working canter right"],
        ["B", "Track right"],
        ["B P F A K", "Working canter right"],
      ],
      "Regularity of the new canter lead.",
      [line(["X", "B"]), line(along("B", "K", "right", arena))],
      { pace: "canter" },
    ),
    mv(
      14,
      [
        ["K X H", "10 metre loop"],
        ["C", "Working trot"],
      ],
      "Size of the loop; willing transition to trot.",
      [loop("K", "H", 10)],
      { pace: "trot" },
    ),
    mv(
      15,
      [["R", "20 metre circle right, allowing the horse to stretch down"]],
      "Size of the circle; the stretch forward and downward.",
      [line(along("C", "R", "right", arena)), circle("R", 20)],
      { pace: "free" },
    ),
    mv(
      16,
      [
        ["R", "Working trot"],
        ["B", "Half 10 metre circle right to X"],
        ["I", "Halt. Immobility. Salute"],
      ],
      "Willing transition; size of the half circle; straightness of the halt.",
      [line(along("R", "B", "right", arena)), half("B", "X", "A"), line(["X", "I"]), halt("I")],
      { pace: "trot" },
    ),
  ],
};
