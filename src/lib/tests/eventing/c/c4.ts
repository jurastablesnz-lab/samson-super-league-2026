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
  reinBack,
  serpentine,
} from "../shared.ts";

const arena = "60" as const;

/** CCN3*. British Eventing Intermediate Test 120 (2009). */
export const TEST_EV_C4: SetTest = {
  id: "ev-c4",
  short: "C4",
  name: "Eventing C4",
  year: "ESNZ 2009",
  time: "6:00",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose: "Intermediate eventing dressage for CCN3*. Entry is in collected canter.",
  instructions: SITTING_UNLESS_RISING,
  introduces:
    "Half pass, extended walk, a canter serpentine with counter canter, and a simple change",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at collected canter"],
        ["X", "Halt. Salute. Proceed at working trot"],
      ],
      "The collected canter; the halt; the transition to working trot.",
      [line(["A", "X"]), halt("X"), line(["X", "C"])],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["M X K", "Change rein at medium trot"],
        ["K", "Working trot"],
      ],
      "Bend in the turn; the medium trot; the return to working trot.",
      [line(along("C", "M", "right", arena)), diag("M", "K")],
      { pace: "medium" },
    ),
    mv(
      3,
      [["P", "Circle left 10m diameter"]],
      "Size and shape of the 10m circle.",
      [line(along("K", "P", "left", arena)), circle("P", 10)],
      {
        pace: "trot",
      },
    ),
    mv(
      4,
      [
        ["B G", "Half pass left"],
        ["C", "Track left"],
      ],
      "Alignment and bend of the half pass.",
      [
        line(along("P", "B", "left", arena)),
        diag("B", "G"),
        line(["G", "C"]),
        line(along("C", "H", "left", arena)),
      ],
      { pace: "trot", lateral: lat("half-pass", "left", "B", "G") },
    ),
    mv(
      5,
      [
        ["H X F", "Change rein at medium trot"],
        ["F", "Working trot"],
      ],
      "The medium trot; the return to working trot.",
      diag("H", "F"),
      { pace: "medium" },
    ),
    mv(
      6,
      [["V", "Circle right 10m diameter"]],
      "Size and shape of the 10m circle.",
      [line(along("F", "V", "right", arena)), circle("V", 10)],
      {
        pace: "trot",
      },
    ),
    mv(
      7,
      [
        ["E G", "Half pass right"],
        ["C", "Track right"],
      ],
      "Alignment and bend of the half pass.",
      [
        line(along("V", "E", "right", arena)),
        diag("E", "G"),
        line(["G", "C"]),
        line(along("C", "M", "right", arena)),
      ],
      { pace: "trot", lateral: lat("half-pass", "right", "E", "G") },
    ),
    mv(
      8,
      [["M", "Extended walk"]],
      "The walk lengthens and stays regular.",
      line(along("M", "C", "left", arena)),
      {
        pace: "walk",
      },
    ),
    mv(
      9,
      [
        ["M X K", "Change rein at extended walk"],
        ["K", "Medium walk"],
      ],
      "The extended walk covers ground; the medium walk that follows is regular.",
      [diag("M", "K"), line(along("K", "A", "left", arena))],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      10,
      [["A", "Halt. Rein back 5 steps"]],
      "The halt and the rein-back are straight.",
      [halt("A"), reinBack("A")],
      {
        pace: "walk",
      },
    ),
    mv(
      11,
      [["", "Proceed at collected canter left, without halting"]],
      "The canter departs from the rein-back without a second halt.",
      line(along("A", "C", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      12,
      [
        [
          "A C",
          "Serpentine of 3 loops to the long side. The first and third are true canter, the second counter canter",
        ],
      ],
      "Equal loops. The middle loop is counter canter.",
      serpentine("A", "left"),
      { pace: "canter" },
    ),
    mv(
      13,
      [["H X F", "Change rein at extended canter"]],
      "The extended canter covers ground and stays straight.",
      diag("H", "F"),
      {
        pace: "extended-canter",
      },
    ),
    mv(
      14,
      [
        ["Before F", "Collected canter"],
        ["F", "Simple change through walk"],
      ],
      "The return to collected canter, then a calm simple change. Not drawn as a flying change.",
      line(along("F", "K", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      15,
      [
        [
          "A C",
          "Serpentine of 3 loops to the long side. The first and third are true canter, the second counter canter",
        ],
      ],
      "Equal loops. The middle loop is counter canter.",
      [line(along("K", "A", "left", arena)), serpentine("A", "right")],
      { pace: "canter" },
    ),
    mv(
      16,
      [["M X K", "Change rein at extended canter"]],
      "The extended canter covers ground and stays straight.",
      diag("M", "K"),
      {
        pace: "extended-canter",
      },
    ),
    mv(
      17,
      [
        ["Before K", "Collected canter"],
        ["K", "Medium walk"],
        ["A", "Down centre line"],
      ],
      "The return to collected canter; the transition to walk; straightness.",
      [line(along("K", "A", "left", arena)), line(["A", "D"])],
      { pace: "walk" },
    ),
    mv(
      18,
      [["D G", "Working trot"]],
      "Willing transition; straightness on the centre line.",
      line(["D", "X", "G"]),
      {
        pace: "trot",
      },
    ),
    mv(19, [["G", "Halt. Salute"]], "Straightness; attentiveness; immobility.", halt("G"), {
      pace: "trot",
    }),
  ],
};
