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
  serpentine,
} from "../shared.ts";

const arena = "40" as const;

/** CCN95 and CCN105. British Eventing Novice Test 125 (2001). */
export const TEST_EV_A1: SetTest = {
  id: "ev-a1",
  short: "A1",
  name: "Eventing A1",
  year: "ESNZ 2009",
  time: "5:00",
  drawTime: "7:00",
  arena: "40 × 20",
  arenaSize: "40x20",
  purpose: "Novice eventing dressage for CCN95 and CCN105.",
  instructions: SITTING_OR_RISING,
  introduces: "10m half circles, a three-loop serpentine, lengthened strides, and free walk",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot and proceed down centre line without halting"],
        ["C", "Track right"],
      ],
      "Regularity of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "B", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["B X", "Half circle right 10 metres"],
        ["X E", "Half circle left 10 metres"],
      ],
      "Size, shape and the change of bend of the half circles.",
      [half("B", "X", "A", "right"), half("X", "E", "C", "left")],
      { pace: "trot" },
    ),
    mv(
      3,
      [["K A F", "Working trot"]],
      "Regularity of trot; bend through the corners.",
      line(along("E", "F", "left", arena)),
      {
        pace: "trot",
      },
    ),
    mv(
      4,
      [
        ["F X H", "Change rein and progressively show some lengthened strides"],
        ["H", "Working trot"],
      ],
      "Lengthening of the stride; straightness; willing return to working trot.",
      diag("F", "H"),
      { pace: "medium" },
    ),
    mv(
      5,
      [["C A", "Serpentine 3 loops, each loop to go to the side of the arena"]],
      "Regularity; equal loops; bend and balance.",
      [line(along("H", "C", "left", arena)), serpentine("C", "left")],
      { pace: "trot" },
    ),
    mv(
      6,
      [
        ["K X M", "Change rein and progressively show some lengthened strides"],
        ["M", "Working trot"],
      ],
      "Lengthening of the stride; straightness; willing return to working trot.",
      [line(along("A", "K", "right", arena)), diag("K", "M")],
      { pace: "medium" },
    ),
    mv(
      7,
      [
        ["C", "Medium walk"],
        ["H B", "Change rein at free walk on a long rein"],
        ["B", "Medium walk"],
      ],
      "Regularity of the walks; ground cover of the free walk.",
      [line(along("M", "H", "left", arena)), diag("H", "B")],
      { pace: "free", coeff: 2 },
    ),
    mv(
      8,
      [
        ["F", "Working trot"],
        ["Before A", "Working canter right"],
      ],
      "Willing transitions; regularity of trot and canter.",
      line(along("B", "A", "right", arena)),
      { pace: "canter" },
    ),
    mv(
      9,
      [["A", "Circle right 20 metres"]],
      "Regularity of canter; size and shape of the circle.",
      circle("A", 20),
      {
        pace: "canter",
      },
    ),
    mv(
      10,
      [
        ["K E H", "Progressively show some lengthened strides"],
        ["H M", "Working canter"],
      ],
      "Lengthening of the canter; willing return to working canter.",
      [line(along("A", "H", "right", arena)), line(along("H", "M", "left", arena))],
      { pace: "medium-canter" },
    ),
    mv(
      11,
      [
        ["M X K", "Change rein"],
        ["X", "Working trot"],
        ["K", "Working canter left"],
      ],
      "Straightness; willing transitions through trot to the new canter lead.",
      diag("M", "K"),
      { pace: "canter" },
    ),
    mv(
      12,
      [["A", "Circle left 20 metres"]],
      "Regularity of canter; size and shape of the circle.",
      [line(along("K", "A", "left", arena)), circle("A", 20)],
      { pace: "canter" },
    ),
    mv(
      13,
      [
        ["F B M", "Progressively show some lengthened strides"],
        ["M H", "Working canter"],
      ],
      "Lengthening of the canter; willing return to working canter.",
      [line(along("A", "M", "left", arena)), line(along("M", "H", "left", arena))],
      { pace: "medium-canter" },
    ),
    mv(
      14,
      [
        ["H X F", "Change rein"],
        ["X", "Working trot"],
      ],
      "Willing transition; straightness on the diagonal.",
      diag("H", "F"),
      { pace: "trot" },
    ),
    mv(
      15,
      [
        ["F A", "Working trot"],
        ["A", "Turn down centre line"],
      ],
      "Regularity of trot; bend in the turn; straightness.",
      [line(along("F", "A", "right", arena)), line(["A", "X"])],
      { pace: "trot" },
    ),
    mv(
      16,
      [["X", "Halt, immobility, salute"]],
      "Straightness; attentiveness; immobility.",
      halt("X"),
      { pace: "trot" },
    ),
  ],
};
