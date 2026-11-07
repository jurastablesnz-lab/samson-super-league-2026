import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_DOUBLE,
  along,
  changeOn,
  diag,
  half,
  halfPirouette,
  halt,
  lat,
  line,
  mv,
} from "../shared.ts";

const arena = "60" as const;

/** CCN4*. British Eventing Advanced Test 121 (2009). Snaffle or simple double. */
export const TEST_EV_D1: SetTest = {
  id: "ev-d1",
  short: "D1",
  name: "Eventing D1",
  year: "ESNZ 2009",
  time: "7:30",
  drawTime: "9:00",
  arena: "60 × 20",
  purpose: "Advanced eventing dressage for CCN4*. Entry is in collected canter.",
  instructions: SITTING_OR_DOUBLE,
  introduces: "Shoulder-in, half pass, half pirouettes in walk, and flying changes",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter collected canter"],
        ["X", "Halt, salute. Proceed working trot"],
        ["C", "Track right"],
      ],
      "The collected canter; the halt; the transition to working trot.",
      [line(["A", "X"]), halt("X"), line(["X", "C"]), line(along("C", "M", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["M B", "Shoulder-in right"],
        ["B X", "Half circle 10m diameter"],
      ],
      "Angle and bend of the shoulder-in; size of the half circle.",
      [line(along("M", "B", "right", arena)), half("B", "X", "A")],
      { pace: "trot", lateral: lat("shoulder-in", "right", "M", "B") },
    ),
    mv(
      3,
      [
        ["X M", "Half pass right"],
        ["M C H", "Working trot"],
      ],
      "Alignment and bend of the half pass.",
      [diag("X", "M"), line(along("M", "H", "left", arena))],
      { pace: "trot", lateral: lat("half-pass", "right", "X", "M") },
    ),
    mv(
      4,
      [
        ["H E", "Shoulder-in left"],
        ["E X", "Half circle 10m diameter"],
      ],
      "Angle and bend of the shoulder-in; size of the half circle.",
      [line(along("H", "E", "left", arena)), half("E", "X", "C")],
      { pace: "trot", lateral: lat("shoulder-in", "left", "H", "E") },
    ),
    mv(
      5,
      [
        ["X H", "Half pass left"],
        ["H C M", "Working trot"],
      ],
      "Alignment and bend of the half pass.",
      [diag("X", "H"), line(along("H", "M", "right", arena))],
      { pace: "trot", lateral: lat("half-pass", "left", "X", "H") },
    ),
    mv(
      6,
      [
        ["M X K", "Change rein at medium trot"],
        ["K", "Working trot"],
      ],
      "The medium trot; the return to working trot.",
      diag("M", "K"),
      { pace: "medium" },
    ),
    mv(
      7,
      [
        ["A", "Halt. Immobility 4 seconds"],
        ["", "Proceed in working trot"],
      ],
      "Straightness and immobility of the halt.",
      [line(along("K", "A", "left", arena)), halt("A"), line(along("A", "F", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      8,
      [["F X H", "Change rein at extended trot"]],
      "The extended trot covers ground and stays straight.",
      diag("F", "H"),
      {
        pace: "extended",
      },
    ),
    mv(
      9,
      [
        ["H", "Working trot"],
        ["C", "Medium walk"],
      ],
      "Willing transitions.",
      line(along("H", "C", "left", arena)),
      { pace: "walk" },
    ),
    mv(
      10,
      [
        ["M E", "Change rein at extended walk"],
        ["E", "Medium walk"],
      ],
      "The extended walk covers ground; the medium walk that follows is regular.",
      [line(along("C", "M", "right", arena)), diag("M", "E")],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      11,
      [["Between E & V", "Half pirouette left"]],
      "The half pirouette is small and the walk stays active. No diameter is printed; drawn at 3m.",
      [line(along("E", "V", "left", arena)), halfPirouette("E", "V", 0.5, "left")],
      { pace: "walk" },
    ),
    mv(
      12,
      [
        ["Between E & S", "Half pirouette right"],
        ["", "Medium walk"],
      ],
      "The half pirouette is small. No diameter is printed; drawn at 3m.",
      [line(along("V", "S", "right", arena)), halfPirouette("E", "S", 0.5, "right")],
      { pace: "walk" },
    ),
    mv(
      13,
      [
        ["E", "Working trot"],
        ["V", "Collected canter left"],
      ],
      "Willing transitions into collected canter.",
      line(along("S", "V", "left", arena)),
      { pace: "canter" },
    ),
    mv(
      14,
      [
        ["A", "Down centre line"],
        ["D E", "Collected canter left"],
      ],
      "Bend in the turn; the canter stays collected on the half pass line.",
      [line(along("V", "A", "left", arena)), line(["A", "D"]), diag("D", "E")],
      { pace: "canter", lateral: lat("half-pass", "left", "D", "E") },
    ),
    mv(
      15,
      [["Between E & S", "Flying change"]],
      "The flying change is fluent and straight.",
      [line(along("E", "S", "right", arena)), changeOn("E", "S", 0.5)],
      { pace: "canter" },
    ),
    mv(
      16,
      [["S H C M", "Collected canter right"]],
      "Regularity of the new canter lead.",
      line(along("S", "M", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      17,
      [
        ["M B P", "Medium canter"],
        ["P", "Collected canter"],
      ],
      "The medium canter, and the return to collected canter.",
      line(along("M", "P", "right", arena)),
      { pace: "medium-canter" },
    ),
    mv(
      18,
      [
        ["A", "Down centre line"],
        ["D B", "Collected canter right"],
      ],
      "Bend in the turn; the canter stays collected.",
      [line(along("P", "A", "right", arena)), line(["A", "D"]), diag("D", "B")],
      { pace: "canter", lateral: lat("half-pass", "right", "D", "B") },
    ),
    mv(
      19,
      [["Between B & R", "Flying change"]],
      "The flying change is fluent and straight.",
      [line(along("B", "R", "left", arena)), changeOn("B", "R", 0.5)],
      { pace: "canter" },
    ),
    mv(
      20,
      [["R M C H", "Collected canter left"]],
      "Regularity of the new canter lead.",
      line(along("R", "H", "left", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      21,
      [["H E V", "Medium canter"]],
      "The medium canter lengthens and stays balanced.",
      line(along("H", "V", "left", arena)),
      {
        pace: "medium-canter",
      },
    ),
    mv(
      22,
      [
        ["V A", "Collected canter"],
        ["A", "Down centre line"],
        ["A G", "Collected canter"],
      ],
      "The return to collected canter; straightness on the centre line.",
      [line(along("V", "A", "left", arena)), line(["A", "X", "G"])],
      { pace: "canter" },
    ),
    mv(
      23,
      [["G", "Halt, immobility, salute"]],
      "Straightness; attentiveness; immobility.",
      halt("G"),
      {
        pace: "canter",
      },
    ),
  ],
};
