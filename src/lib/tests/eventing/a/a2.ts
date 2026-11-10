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
  loop,
  mv,
} from "../shared.ts";

const arena = "40" as const;

/** CCN95 and CCN105. British Eventing Test 102 (2009). */
export const TEST_EV_A2: SetTest = {
  id: "ev-a2",
  short: "A2",
  name: "Eventing A2",
  year: "ESNZ 2009",
  time: "4:00",
  drawTime: "6:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose: "Novice eventing dressage for CCN95 and CCN105.",
  instructions: SITTING_OR_RISING,
  introduces: "10m loops, give and retake of the rein, and a free-walk half circle",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot and proceed down centre line without halting"],
        ["C", "Track right"],
      ],
      "Regularity of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "M", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["M X F", "10m loop, working trot"],
        ["F A K", "Working trot"],
      ],
      "Size of the loop; regularity; bend through the corners.",
      [loop("M", "F"), line(along("F", "K", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      3,
      [
        [
          "K B",
          "Change the rein with a transition to walk over the centre line. Proceed working trot",
        ],
      ],
      "Willing transitions through a few walk steps; straightness.",
      diag("K", "B"),
      { pace: "trot" },
    ),
    mv(
      4,
      [
        ["B M", "Working trot"],
        ["Between M & C", "Working canter left"],
      ],
      "Willing transition; regularity of trot and canter.",
      line(along("B", "C", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      5,
      [["C", "Circle left 20m diameter. Give and retake the inside rein over X (3–5 strides)"]],
      "Size and shape of the circle; the horse stays in balance as the rein is given and retaken.",
      circle("C", 20),
      { pace: "canter" },
    ),
    mv(
      6,
      [
        ["C H E K", "Working canter left"],
        ["K", "Working trot"],
      ],
      "Regularity of canter; willing transition to trot.",
      line(along("C", "K", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      7,
      [
        ["A F", "Medium walk"],
        ["F", "Free walk on a long rein"],
        ["B", "Half circle left 20m to E"],
      ],
      "Regularity of the walks; size of the half circle.",
      [
        line(along("K", "F", "left", arena)),
        line(along("F", "B", "left", arena)),
        half("B", "E", "A", "left"),
      ],
      { pace: "free" },
    ),
    mv(
      8,
      [
        ["E", "Medium walk"],
        ["E K A", "Medium walk (mark for medium walk A–F and E–A)"],
      ],
      "Regularity and activity of the medium walk over both stretches.",
      [line(along("E", "A", "left", arena))],
      { pace: "walk" },
    ),
    mv(
      9,
      [
        ["A", "Working trot"],
        ["F X M", "10m loop, working trot"],
        ["M C H", "Working trot"],
      ],
      "Willing transition; size of the loop; regularity.",
      [loop("F", "M"), line(along("M", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      10,
      [
        [
          "H B",
          "Change the rein with a transition to walk (3–5 steps) over the centre line. Proceed working trot",
        ],
      ],
      "Willing transitions through a few walk steps; straightness.",
      diag("H", "B"),
      { pace: "trot" },
    ),
    mv(
      11,
      [
        ["B F", "Working trot"],
        ["Between F & A", "Working canter right"],
      ],
      "Willing transition; regularity of trot and canter.",
      line(along("B", "A", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      12,
      [["A K E H", "Working canter right"]],
      "Regularity of canter; bend through the corners.",
      line(along("A", "H", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["C", "Circle right 20m diameter. Give and retake the inside rein over X (3–5 strides)"],
        ["C", "Working trot"],
      ],
      "Size and shape of the circle; balance through the give and retake; willing transition.",
      circle("C", 20),
      { pace: "trot" },
    ),
    mv(
      14,
      [
        ["C M B", "Working trot"],
        ["B", "Turn right"],
      ],
      "Regularity; bend in the turn off the track.",
      [line(along("C", "B", "right", arena)), line(["B", "X"])],
      { pace: "trot" },
    ),
    mv(
      15,
      [
        ["E", "Turn left"],
        ["E K A", "Working trot"],
        ["A", "Down centre line"],
      ],
      "Bend in the turns; regularity; straightness on the centre line.",
      [line(["X", "E"]), line(along("E", "A", "left", arena)), line(["A", "X", "G"])],
      { pace: "trot" },
    ),
    mv(
      16,
      [["G", "Halt, immobility, salute"]],
      "Straightness; attentiveness; immobility.",
      halt("G"),
      {
        pace: "trot",
      },
    ),
  ],
};
