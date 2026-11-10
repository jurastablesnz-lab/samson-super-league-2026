import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_DOUBLE,
  along,
  changeOn,
  diag,
  half,
  halt,
  lat,
  line,
  mv,
  reinBack,
} from "../shared.ts";

const arena = "60" as const;

/** CCN4*. British Eventing Advanced Test 122 (2009). Snaffle or simple double. */
export const TEST_EV_D2: SetTest = {
  id: "ev-d2",
  short: "D2",
  name: "Eventing D2",
  year: "ESNZ 2009",
  time: "6:00",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose:
    "Advanced eventing dressage for CCN4*. Entry is in collected canter, and the halt is at I.",
  instructions: SITTING_OR_DOUBLE,
  introduces: "Shoulder-in on the centre line, half pass, counter canter, and flying changes",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter collected canter"],
        ["I", "Halt, immobility, salute. Proceed collected trot"],
      ],
      "The collected canter; the halt is at I; the transition to collected trot.",
      [line(["A", "X", "I"]), halt("I"), line(["I", "C"])],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["M X K", "Change the rein in medium trot, rising"],
      ],
      "Bend in the turn. The medium trot is rising.",
      [line(along("C", "M", "right", arena)), diag("M", "K")],
      { pace: "medium" },
    ),
    mv(
      3,
      [["K", "Collected trot (mark for the transitions at M and K)"]],
      "Both transitions are willing and balanced.",
      line(along("K", "A", "left", arena)),
      { pace: "trot" },
    ),
    mv(
      4,
      [
        ["A", "Down centre line"],
        ["D X", "Shoulder-in left"],
      ],
      "Straightness, then the angle and bend of the shoulder-in.",
      [line(["A", "D"]), line(["D", "X"])],
      { pace: "trot", lateral: lat("shoulder-in", "left", "D", "X") },
    ),
    mv(5, [["X H", "Half pass left"]], "Alignment and bend of the half pass.", diag("X", "H"), {
      pace: "trot",
      lateral: lat("half-pass", "left", "X", "H"),
    }),
    mv(
      6,
      [
        ["C", "Down centre line"],
        ["G X", "Shoulder-in right"],
      ],
      "Straightness, then the angle and bend of the shoulder-in.",
      [line(along("H", "C", "left", arena)), line(["C", "G", "X"])],
      { pace: "trot", lateral: lat("shoulder-in", "right", "G", "X") },
    ),
    mv(7, [["X K", "Half pass right"]], "Alignment and bend of the half pass.", diag("X", "K"), {
      pace: "trot",
      lateral: lat("half-pass", "right", "X", "K"),
    }),
    mv(
      8,
      [
        ["A F P", "Medium walk"],
        ["P X S", "Extended walk"],
      ],
      "The medium walk, then the extended walk.",
      [line(along("K", "P", "left", arena)), diag("P", "S")],
      { pace: "walk" },
    ),
    mv(
      9,
      [["S H C", "Medium walk (mark for medium walk A–P and S–C)"]],
      "Regularity of the medium walk on both stretches.",
      line(along("S", "C", "right", arena)),
      { pace: "walk" },
    ),
    mv(
      10,
      [["C", "Canter right, direct from walk"]],
      "The canter departs directly from walk.",
      line(along("C", "R", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      11,
      [["R B F", "Medium canter"]],
      "The medium canter lengthens and stays balanced.",
      line(along("R", "F", "right", arena)),
      {
        pace: "medium-canter",
      },
    ),
    mv(
      12,
      [["F", "Collected canter (mark for the transitions at R and F)"]],
      "Both transitions are willing and balanced.",
      line(along("F", "A", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["A", "Down centre line"],
        ["D B", "Half pass right"],
      ],
      "Straightness, then alignment and bend of the half pass.",
      [line(["A", "D"]), diag("D", "B")],
      { pace: "canter", lateral: lat("half-pass", "right", "D", "B") },
    ),
    mv(
      14,
      [["B M", "Counter canter"]],
      "The counter canter stays balanced and straight.",
      line(along("B", "M", "left", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      15,
      [["M", "Flying change of leg"]],
      "The flying change is fluent and straight.",
      [line(["M", "C"]), changeOn("B", "M", 1)],
      {
        pace: "canter",
      },
    ),
    mv(
      16,
      [
        ["M C S", "Collected canter left"],
        ["S E K", "Extended canter"],
      ],
      "The collected canter, then the extended canter.",
      [line(along("M", "S", "left", arena)), line(along("S", "K", "left", arena))],
      { pace: "extended-canter" },
    ),
    mv(
      17,
      [["K", "Collected canter (mark for the transitions at S and K)"]],
      "Both transitions are willing and balanced.",
      line(along("K", "A", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      18,
      [
        ["A", "Down centre line"],
        ["D E", "Half pass left"],
      ],
      "Straightness, then alignment and bend of the half pass.",
      [line(["A", "D"]), diag("D", "E")],
      { pace: "canter", lateral: lat("half-pass", "left", "D", "E") },
    ),
    mv(
      19,
      [["E H", "Counter canter"]],
      "The counter canter stays balanced.",
      line(along("E", "H", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      20,
      [["H", "Flying change of leg"]],
      "The flying change is fluent and straight.",
      [line(["H", "C"]), changeOn("E", "H", 1)],
      {
        pace: "canter",
      },
    ),
    mv(
      21,
      [
        ["H C M B", "Collected canter right"],
        ["B", "Half 10 metre diameter circle right to X"],
        ["I", "Halt, immobility 4 seconds"],
      ],
      "Regularity of canter; size of the half circle; the halt.",
      [line(along("H", "B", "right", arena)), half("B", "X", "A"), line(["X", "I"]), halt("I")],
      { pace: "canter" },
    ),
    mv(
      22,
      [
        ["I", "Rein back 5 steps. Proceed at collected trot"],
        ["C", "Track left"],
      ],
      "The rein-back is straight, and the trot that follows is collected.",
      [reinBack("I", 5), line(["I", "C"]), line(along("C", "H", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      23,
      [
        ["H X F", "Change the rein at extended trot"],
        ["F", "Collected trot"],
      ],
      "The extended trot, and the return to collected trot.",
      diag("H", "F"),
      { pace: "extended" },
    ),
    mv(
      24,
      [
        ["A", "Down centre line"],
        ["X", "Halt, immobility, salute"],
      ],
      "Bend in the turn; straightness; immobility.",
      [line(along("F", "A", "right", arena)), line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
