import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_UNLESS_RISING,
  along,
  circle,
  diag,
  halt,
  lat,
  line,
  mv,
} from "../shared.ts";

const arena = "40" as const;

/** CCN3*. British Eventing Intermediate Test 116 (2009). */
export const TEST_EV_C1: SetTest = {
  id: "ev-c1",
  short: "C1",
  name: "Eventing C1",
  year: "ESNZ 2009",
  time: "4:00",
  drawTime: "6:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose: "Intermediate eventing dressage for CCN3*.",
  instructions: SITTING_UNLESS_RISING,
  introduces: "Shoulder-in, medium trot, and a simple change through walk",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot"],
        ["X", "Halt, immobility, salute. Proceed working trot"],
        ["C", "Track right"],
      ],
      "Straightness; the halt; bend in the turn.",
      [line(["A", "X"]), halt("X"), line(["X", "C"]), line(along("C", "B", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["B", "Turn right"],
        ["X", "Circle right 10 metres diameter"],
      ],
      "Bend in the turn; size of the 10m circle.",
      [line(["B", "X"]), circle("X", 10)],
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["X", "Circle left 10 metres diameter"],
        ["E", "Track left"],
      ],
      "Size of the circle; bend back onto the track.",
      [circle("X", 10), line(["X", "E"]), line(along("E", "F", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      4,
      [["F M", "Shoulder-in left"]],
      "Angle, bend and balance of the shoulder-in.",
      line(along("F", "M", "left", arena)),
      {
        pace: "trot",
        lateral: lat("shoulder-in", "left", "F", "M"),
      },
    ),
    mv(
      5,
      [["H X F", "Change rein at medium trot (rising)"]],
      "The medium trot is rising, straight, and lengthened.",
      diag("H", "F"),
      { pace: "medium" },
    ),
    mv(
      6,
      [["F", "Working trot (mark for the transitions at H and F)"]],
      "Both transitions are willing and balanced.",
      line(along("F", "K", "right", arena)),
      { pace: "trot" },
    ),
    mv(
      7,
      [["K H", "Shoulder-in right"]],
      "Angle, bend and balance of the shoulder-in.",
      line(along("K", "H", "right", arena)),
      {
        pace: "trot",
        lateral: lat("shoulder-in", "right", "K", "H"),
      },
    ),
    mv(
      8,
      [["M X K", "Change rein at medium trot"]],
      "The medium trot is straight and lengthened.",
      diag("M", "K"),
      {
        pace: "medium",
      },
    ),
    mv(
      9,
      [["K", "Working trot (mark for the transitions at M and K)"]],
      "Both transitions are willing and balanced.",
      line(along("K", "A", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      10,
      [["A", "Working canter left"]],
      "Willing transition to canter.",
      line(along("A", "B", "left", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      11,
      [
        ["B", "Circle left 20 metres diameter, showing lengthened strides"],
        ["B", "Working canter left"],
      ],
      "Size of the circle; the lengthening, and the return to working canter.",
      circle("B", 20),
      { pace: "medium-canter" },
    ),
    mv(
      12,
      [
        ["M H", "Working canter left"],
        ["H X F", "Change the rein with a simple change through walk between X and F"],
      ],
      "The simple change is straight and calm. It is not drawn as a flying change.",
      [line(along("B", "H", "left", arena)), diag("H", "F")],
      { pace: "canter" },
    ),
    mv(
      13,
      [["F K E", "Working canter right"]],
      "Regularity of the new canter lead.",
      line(along("F", "E", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      14,
      [
        ["E", "Circle right 20 metres diameter, showing lengthened strides"],
        ["E", "Working canter right"],
      ],
      "Size of the circle; the lengthening, and the return to working canter.",
      circle("E", 20),
      { pace: "medium-canter" },
    ),
    mv(
      15,
      [
        ["H C", "Working canter right"],
        ["Between C & M", "Medium walk"],
      ],
      "Regularity of canter; willing transition to walk.",
      line(along("E", "M", "right", arena)),
      { pace: "walk" },
    ),
    mv(
      16,
      [["M E", "Extended walk"]],
      "The extended walk covers ground and stays regular.",
      diag("M", "E"),
      {
        pace: "walk",
      },
    ),
    mv(
      17,
      [["E K", "Medium walk"]],
      "Willing transition; regularity of the medium walk.",
      line(along("E", "K", "left", arena)),
      {
        pace: "walk",
      },
    ),
    mv(
      18,
      [
        ["K", "Working trot"],
        ["A", "Down centre line"],
        ["G", "Halt, salute"],
      ],
      "Willing transition; straightness; immobility.",
      [line(along("K", "A", "left", arena)), line(["A", "X", "G"]), halt("G")],
      { pace: "trot" },
    ),
  ],
};
