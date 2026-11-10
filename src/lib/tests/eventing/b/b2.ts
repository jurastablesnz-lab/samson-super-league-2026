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
  reinBack,
  serpentine,
} from "../shared.ts";

const arena = "40" as const;

/** CCN1* and CCN2*. British Eventing Novice Test 111 (2009). */
export const TEST_EV_B2: SetTest = {
  id: "ev-b2",
  short: "B2",
  name: "Eventing B2",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose: "Novice eventing dressage for CCN1* and CCN2*.",
  instructions: SITTING_OR_RISING,
  introduces: "Three-loop serpentines, a rein-back, counter canter, and a half 12m circle",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [["A", "Enter at working trot and proceed down the centre line without halting"]],
      "Regularity of trot; straightness on the centre line.",
      line(["A", "X", "C"]),
      { pace: "trot" },
    ),
    mv(
      2,
      [
        [
          "C",
          "Track left and commence a 3-loop serpentine, each loop touching the side, finishing at A",
        ],
      ],
      "Equal loops; bend and balance; regularity.",
      serpentine("C", "left"),
      { pace: "trot" },
    ),
    mv(
      3,
      [["F X H", "Change the rein, show some medium strides"]],
      "Lengthening of the stride; straightness.",
      [line(along("A", "F", "left", arena)), diag("F", "H")],
      { pace: "medium" },
    ),
    mv(
      4,
      [["Between H & C", "Working canter right"]],
      "Willing transition to canter.",
      line(along("H", "C", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      5,
      [
        ["B", "Circle right 20 metres diameter, show medium canter strides"],
        ["Before B", "Working canter"],
      ],
      "Size of the circle; the lengthening, and the return to working canter.",
      [line(along("C", "B", "right", arena)), circle("B", 20)],
      { pace: "medium-canter" },
    ),
    mv(
      6,
      [
        ["F", "Half 12 metre circle, returning to the track"],
        ["B M", "Counter canter"],
      ],
      "The half circle and the counter canter. Drawn from F back toward B; the sheet says 12m.",
      [
        line(along("B", "F", "right", arena)),
        half("F", "B", "C"),
        line(along("B", "M", "left", arena)),
      ],
      { pace: "canter" },
    ),
    mv(
      7,
      [
        ["M", "Working trot"],
        ["C", "Halt, immobility 3–4 seconds"],
      ],
      "Willing transition; straightness and immobility of the halt.",
      [line(along("M", "C", "left", arena)), halt("C")],
      { pace: "trot" },
    ),
    mv(
      8,
      [["", "Rein back 3–5 steps. Proceed at medium walk"]],
      "The rein-back is straight, and the walk that follows is regular.",
      [reinBack("C", 5), line(along("C", "H", "left", arena))],
      { pace: "walk" },
    ),
    mv(
      9,
      [["H B", "Free walk on a long rein"]],
      "Ground cover and stretch of the free walk.",
      diag("H", "B"),
      {
        pace: "free",
      },
    ),
    mv(
      10,
      [["B A", "Medium walk (mark for medium walk C–H and B–A)"]],
      "Regularity of the medium walk on both stretches.",
      line(along("B", "A", "right", arena)),
      { pace: "walk" },
    ),
    mv(
      11,
      [
        [
          "A",
          "Working trot and commence a 3-loop serpentine, each loop touching the side, finishing at C",
        ],
      ],
      "Equal loops; bend and balance; regularity.",
      serpentine("A", "right"),
      { pace: "trot" },
    ),
    mv(
      12,
      [["M X K", "Change the rein, show some medium strides"]],
      "Lengthening of the stride; straightness.",
      diag("M", "K"),
      { pace: "medium" },
    ),
    mv(
      13,
      [["Between K & A", "Working canter left"]],
      "Willing transition to canter.",
      line(along("K", "A", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      14,
      [
        ["B", "Circle left 20 metres diameter, show medium canter strides"],
        ["Before B", "Working canter"],
      ],
      "Size of the circle; the lengthening, and the return to working canter.",
      [line(along("A", "B", "left", arena)), circle("B", 20)],
      { pace: "medium-canter" },
    ),
    mv(
      15,
      [
        ["M", "Half 12 metre circle, returning to the track"],
        ["B F", "Counter canter"],
      ],
      "The half circle and the counter canter. Drawn from M back toward B; the sheet says 12m.",
      [
        line(along("B", "M", "left", arena)),
        half("M", "B", "A"),
        line(along("B", "F", "right", arena)),
      ],
      { pace: "canter" },
    ),
    mv(
      16,
      [
        ["F", "Working trot"],
        ["A", "Down centre line"],
        ["X", "Halt. Immobility. Salute"],
      ],
      "Willing transition; straightness; immobility.",
      [line(along("F", "A", "right", arena)), line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
