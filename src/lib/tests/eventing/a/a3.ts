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

/** CCN95 and CCN105. British Eventing Test 103 (2009). */
export const TEST_EV_A3: SetTest = {
  id: "ev-a3",
  short: "A3",
  name: "Eventing A3",
  year: "ESNZ 2009",
  time: "4:00",
  drawTime: "6:00",
  arena: "60 × 20",
  purpose: "Novice eventing dressage for CCN95 and CCN105, ridden in the 60×20 arena.",
  instructions: SITTING_OR_RISING,
  introduces: "15m and 20m circles, give and retake, and free walk on a circle",
  leave: "Leave arena at walk on a long rein at A",
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
      [["H B", "Change the rein"]],
      "Regularity and straightness on the diagonal.",
      diag("H", "B"),
      {
        pace: "trot",
      },
    ),
    mv(
      3,
      [["B", "Circle right, working trot, 15 metres diameter"]],
      "Regularity; size, shape and bend of the 15m circle.",
      circle("B", 15),
      { pace: "trot" },
    ),
    mv(
      4,
      [["B K", "Change the rein with transition to walk. Proceed working trot"]],
      "Willing transitions through walk; straightness.",
      diag("B", "K"),
      { pace: "trot" },
    ),
    mv(
      5,
      [["Between K & A", "Working canter left"]],
      "Willing transition to canter.",
      line(along("K", "A", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      6,
      [
        ["A F P", "Working canter left"],
        ["P", "Circle left 20 metres diameter. Give and retake the inside rein past V"],
      ],
      "Regularity of canter; size of the circle; balance through the give and retake.",
      [line(along("A", "P", "left", arena)), circle("P", 20)],
      { pace: "canter" },
    ),
    mv(
      7,
      [
        ["P B I", "Working canter left"],
        ["I", "Transition to working trot"],
      ],
      "Regularity of canter; willing transition on the centre line.",
      [line(along("P", "B", "left", arena)), line(["B", "X", "I"])],
      { pace: "trot" },
    ),
    mv(
      8,
      [
        ["I H C M", "Working trot"],
        ["M E", "Change the rein"],
      ],
      "Regularity of trot; straightness on the diagonal.",
      [line(["I", "C"]), line(along("C", "M", "right", arena)), diag("M", "E")],
      { pace: "trot" },
    ),
    mv(
      9,
      [["E", "Circle left 15 metres diameter"]],
      "Regularity; size and shape of the 15m circle.",
      circle("E", 15),
      {
        pace: "trot",
      },
    ),
    mv(
      10,
      [["E F", "Change the rein with transition to walk, 3–5 steps. Proceed working trot"]],
      "Willing transitions through a few walk steps; straightness.",
      diag("E", "F"),
      { pace: "trot" },
    ),
    mv(
      11,
      [["Between F & A", "Working canter right"]],
      "Willing transition to canter.",
      line(along("F", "A", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      12,
      [
        ["A K V", "Working canter right"],
        ["V", "Circle right 20 metres diameter. Give and retake the inside rein past P"],
      ],
      "Regularity of canter; size of the circle; balance through the give and retake.",
      [line(along("A", "V", "right", arena)), circle("V", 20)],
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["V E I", "Working canter right"],
        ["I", "Transition to working trot"],
        ["I M C", "Working trot"],
        ["C H S", "Medium walk"],
      ],
      "Willing transitions; regularity of canter, trot and walk.",
      [
        line(along("V", "E", "right", arena)),
        line(["E", "X", "I", "C"]),
        line(along("C", "S", "left", arena)),
      ],
      { pace: "walk" },
    ),
    mv(
      14,
      [["S", "Circle left 20 metres diameter, free walk on a long rein"]],
      "Size of the circle; ground cover and stretch of the free walk.",
      circle("S", 20),
      { pace: "free" },
    ),
    mv(
      15,
      [["S E", "Medium walk (mark for medium walk C–S and S–E)"]],
      "Regularity and activity of the medium walk on both stretches.",
      line(along("S", "E", "left", arena)),
      { pace: "walk" },
    ),
    mv(
      16,
      [
        ["E", "Working trot"],
        ["V", "Half circle left to L"],
        ["L", "Down centre line"],
        ["X", "Halt, immobility, salute"],
      ],
      "Willing transition; size of the half circle; straightness; immobility.",
      [line(along("E", "V", "left", arena)), half("V", "L", "A"), line(["L", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
