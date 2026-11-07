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

/** CCN3*. British Eventing Intermediate Test 118 (2009). The salute on entry is at I. */
export const TEST_EV_C3: SetTest = {
  id: "ev-c3",
  short: "C3",
  name: "Eventing C3",
  year: "ESNZ 2009",
  time: "6:00",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose: "Intermediate eventing dressage for CCN3*. The entry halt is at I.",
  instructions: SITTING_UNLESS_RISING,
  introduces: "Shoulder-in, half 10m circles, a simple change, and a stretching circle",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot"],
        ["I", "Halt, immobility, salute. Proceed working trot"],
        ["C", "Track right"],
      ],
      "Straightness; the halt is at I, as printed; bend in the turn.",
      [line(["A", "X", "I"]), halt("I"), line(["I", "C"]), line(along("C", "M", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [["M X K", "Change the rein, medium trot (sitting or rising)"]],
      "The medium trot may be sitting or rising; it is straight.",
      diag("M", "K"),
      { pace: "medium" },
    ),
    mv(
      3,
      [["K", "Working trot (mark for the transitions at M and K)"]],
      "Both transitions are willing and balanced.",
      line(along("K", "F", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      4,
      [["F B", "Shoulder-in left"]],
      "Angle, bend and balance of the shoulder-in.",
      line(along("F", "B", "left", arena)),
      {
        pace: "trot",
        lateral: lat("shoulder-in", "left", "F", "B"),
      },
    ),
    mv(
      5,
      [
        ["B X", "Half 10 metre circle left"],
        ["X E", "Half 10 metre circle right"],
      ],
      "Size, shape and the change of bend.",
      [half("B", "X", "C", "left"), half("X", "E", "A", "right")],
      { pace: "trot" },
    ),
    mv(
      6,
      [["E H", "Shoulder-in right"]],
      "Angle, bend and balance of the shoulder-in.",
      line(along("E", "H", "right", arena)),
      {
        pace: "trot",
        lateral: lat("shoulder-in", "right", "E", "H"),
      },
    ),
    mv(
      7,
      [["C", "Halt, immobility 6 seconds"]],
      "Straightness and the full immobility.",
      [line(along("H", "C", "right", arena)), halt("C")],
      {
        pace: "trot",
      },
    ),
    mv(
      8,
      [["", "Rein back 4–5 steps. Proceed medium walk"]],
      "The rein-back is straight, and the walk that follows is regular.",
      [reinBack("C"), line(along("C", "M", "right", arena))],
      { pace: "walk" },
    ),
    mv(
      9,
      [["M E", "Change the rein, extended walk"]],
      "The extended walk covers ground and stays regular.",
      diag("M", "E"),
      {
        pace: "walk",
      },
    ),
    mv(
      10,
      [
        ["E", "Medium walk and 20 metre half circle to B"],
        ["B R", "Medium walk"],
      ],
      "Size of the half circle; regularity of the walk.",
      [half("E", "B", "A"), line(along("B", "R", "left", arena))],
      { pace: "walk" },
    ),
    mv(
      11,
      [["R", "Working canter left, directly from walk"]],
      "The canter departs directly from walk.",
      line(along("R", "M", "left", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      12,
      [
        ["R M C H S", "Working canter left"],
        ["S", "20 metre circle left, medium canter"],
      ],
      "Regularity of canter; the medium canter on the circle.",
      [line(along("R", "S", "left", arena)), circle("S", 20)],
      { pace: "medium-canter" },
    ),
    mv(
      13,
      [
        ["S", "Transition to working canter"],
        ["V", "Half 10 metre circle left to L"],
        ["L", "Up the centre line"],
      ],
      "The return to working canter; size of the half circle.",
      [line(along("S", "V", "left", arena)), half("V", "L", "A"), line(["L", "X", "I"])],
      { pace: "canter" },
    ),
    mv(
      14,
      [["Between X & I", "Simple change through walk"]],
      "The simple change is straight and calm. It is not drawn as a flying change.",
      line(["X", "I"]),
      { pace: "canter" },
    ),
    mv(
      15,
      [
        ["I G C M R", "Working canter right"],
        ["R", "20 metre circle right, allowing the horse to stretch down"],
      ],
      "The new canter lead; the stretch on the circle.",
      [line(["I", "C"]), line(along("C", "R", "right", arena)), circle("R", 20)],
      { pace: "free" },
    ),
    mv(
      16,
      [
        ["R", "Working canter"],
        ["P", "Half 10 metre circle right to L"],
        ["L", "Up the centre line"],
      ],
      "Size of the half circle; straightness on the centre line.",
      [line(along("R", "P", "right", arena)), half("P", "L", "C"), line(["L", "X", "I"])],
      { pace: "canter" },
    ),
    mv(
      17,
      [
        ["Between X & I", "Simple change through walk"],
        ["C", "Track left"],
      ],
      "The simple change is straight. It is not drawn as a flying change.",
      [line(["X", "I", "C"]), line(along("C", "E", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      18,
      [
        ["E", "Half 10 metre circle left to the centre line"],
        ["I", "Working trot"],
        ["G", "Halt, immobility, salute"],
      ],
      "Size of the half circle; willing transition; immobility. The centre-line point is drawn at X.",
      [half("E", "X", "C"), line(["X", "I", "G"]), halt("G")],
      { pace: "trot" },
    ),
  ],
};
