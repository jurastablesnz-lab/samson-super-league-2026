import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_UNLESS_RISING,
  along,
  circle,
  diag,
  half,
  halt,
  lat,
  line,
  mv,
  reinBack,
} from "../shared.ts";

const arena = "60" as const;

/** CCN3*. British Eventing Intermediate Test, C2 (2007). */
export const TEST_EV_C2: SetTest = {
  id: "ev-c2",
  short: "C2",
  name: "Eventing C2",
  year: "ESNZ 2007",
  time: "6:00",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose: "Intermediate eventing dressage for CCN3*, ridden in the 60×20 arena.",
  instructions: SITTING_UNLESS_RISING,
  introduces: "Shoulder-in, extended walk, rein-back, medium canter, and counter canter",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot"],
        ["X", "Halt, salute. Proceed working trot"],
        ["C", "Track left"],
      ],
      "Straightness; the halt; bend in the turn.",
      [line(["A", "X"]), halt("X"), line(["X", "C"]), line(along("C", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [["H E", "Shoulder-in left"]],
      "Angle, bend and balance of the shoulder-in.",
      line(along("H", "E", "left", arena)),
      {
        pace: "trot",
        lateral: lat("shoulder-in", "left", "H", "E"),
      },
    ),
    mv(
      3,
      [
        ["E F", "Change the rein at medium trot"],
        ["F", "Working trot"],
      ],
      "The medium trot; straightness; willing return to working trot.",
      diag("E", "F"),
      { pace: "medium" },
    ),
    mv(
      4,
      [["A", "Circle right 10 metres"]],
      "Size and shape of the 10m circle.",
      [line(along("F", "A", "right", arena)), circle("A", 10)],
      {
        pace: "trot",
      },
    ),
    mv(
      5,
      [["K E", "Shoulder-in right"]],
      "Angle, bend and balance of the shoulder-in.",
      line(along("A", "E", "right", arena)),
      {
        pace: "trot",
        lateral: lat("shoulder-in", "right", "K", "E"),
      },
    ),
    mv(
      6,
      [
        ["E M", "Change rein in medium trot"],
        ["M", "Working trot"],
      ],
      "The medium trot; straightness; willing return to working trot.",
      diag("E", "M"),
      { pace: "medium" },
    ),
    mv(
      7,
      [
        ["C", "Circle left 10 metres"],
        ["C H", "Working trot"],
      ],
      "Size of the circle; regularity.",
      [line(along("M", "C", "left", arena)), circle("C", 10), line(along("C", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      8,
      [
        ["H", "Medium walk"],
        ["S P", "Change the rein at extended walk"],
        ["P A", "Medium walk"],
      ],
      "The extended walk covers ground; both medium-walk stretches stay regular.",
      [line(along("H", "S", "left", arena)), diag("S", "P"), line(along("P", "A", "right", arena))],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      9,
      [
        ["A", "Halt, rein back 4–5 steps"],
        ["", "Proceed at medium walk"],
      ],
      "The halt and the rein-back are straight.",
      [halt("A"), reinBack("A", 5)],
      { pace: "walk" },
    ),
    mv(
      10,
      [["Between A & K", "Working canter right"]],
      "Willing transition to canter.",
      line(along("A", "K", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      11,
      [
        ["K S", "Medium canter"],
        ["S", "Working canter"],
      ],
      "The medium canter, and the return to working canter.",
      line(along("K", "S", "right", arena)),
      { pace: "medium-canter" },
    ),
    mv(
      12,
      [["H", "Half circle right 10 metres, returning to the track at E"]],
      "The half circle returns to the track at E. H and E are further apart than 10m, so the diagram joins those letters.",
      [line(along("S", "H", "right", arena)), half("H", "E", "A")],
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["E K", "Counter canter"],
        ["K", "Working trot"],
      ],
      "The counter canter stays balanced; the transition to trot is willing.",
      line(along("E", "K", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      14,
      [
        ["A", "Working canter left"],
        ["F R", "Medium canter"],
        ["R", "Working canter"],
      ],
      "Willing transition; the medium canter, and the return to working canter.",
      [line(along("K", "R", "left", arena))],
      { pace: "medium-canter" },
    ),
    mv(
      15,
      [["M", "Half circle left 10 metres, returning to the track at B"]],
      "The half circle returns to the track at B. M and B are further apart than 10m, so the diagram joins those letters.",
      [line(along("R", "M", "left", arena)), half("M", "B", "C")],
      { pace: "canter" },
    ),
    mv(
      16,
      [
        ["B F", "Counter canter"],
        ["F", "Working trot"],
      ],
      "The counter canter stays balanced; the transition to trot is willing.",
      line(along("B", "F", "right", arena)),
      { pace: "trot" },
    ),
    mv(
      17,
      [
        ["A", "Down centre line"],
        ["A G", "Working trot"],
      ],
      "Bend in the turn; straightness on the centre line.",
      [line(along("F", "A", "right", arena)), line(["A", "X", "G"])],
      { pace: "trot" },
    ),
    mv(
      18,
      [["G", "Halt, immobility, salute"]],
      "Straightness; attentiveness; immobility.",
      halt("G"),
      {
        pace: "trot",
      },
    ),
  ],
};
