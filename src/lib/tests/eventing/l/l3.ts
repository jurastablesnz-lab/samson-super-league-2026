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

/** CCN65, CCN80, CCN95. British Eventing Intro Test 103 (2005). Ridden in the 60×20 arena. */
export const TEST_EV_L3: SetTest = {
  id: "ev-l3",
  short: "L3",
  name: "Eventing L3",
  year: "ESNZ 2009",
  time: "6:00",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose: "Introductory eventing dressage for CCN65, CCN80 and CCN95, ridden in the 60×20 arena.",
  instructions: SITTING_OR_RISING,
  introduces: "20m circles at S and V, free walk on a long rein, and canter departs on the circle",
  leave: "Leave arena at walk at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at working trot"],
        ["", "Proceed down centre line without halting"],
        ["C", "Track left"],
      ],
      "Regularity and quality of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "S", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["S", "Circle left 20m diameter"],
        ["S E", "Working trot"],
      ],
      "Regularity; size, shape and bend of the circle.",
      [circle("S", 20), line(along("S", "E", "left", arena))],
      { pace: "trot" },
    ),
    mv(
      3,
      [["E F", "Change the rein at working trot"]],
      "Regularity and straightness on the diagonal.",
      diag("E", "F"),
      { pace: "trot" },
    ),
    mv(
      4,
      [
        ["V", "Circle right 20m diameter"],
        ["V S", "Working trot"],
      ],
      "Regularity; size, shape and bend of the circle.",
      [
        line(along("F", "V", "right", arena)),
        circle("V", 20),
        line(along("V", "S", "right", arena)),
      ],
      { pace: "trot" },
    ),
    mv(
      5,
      [
        ["S", "Half circle 20m diameter to R with transition to walk across the centre line"],
        ["R V", "Change the rein, free walk on a long rein"],
        ["V K A", "Medium walk"],
      ],
      "Size of the half circle; willing transition; ground cover of the free walk.",
      [half("S", "R", "A"), diag("R", "V"), line(along("V", "A", "left", arena))],
      { pace: "free", coeff: 2 },
    ),
    mv(
      6,
      [
        [
          "A",
          "Working trot and commence 20m circle left, with transition to working canter across the centre line",
        ],
        ["A F B", "Working canter"],
      ],
      "Willing transition on the circle; regularity of canter.",
      [circle("A", 20), line(along("A", "B", "left", arena))],
      { pace: "canter" },
    ),
    mv(
      7,
      [["B", "20m circle left, between the centre line and B working trot"]],
      "Size and shape of the circle; willing transition to trot.",
      circle("B", 20),
      { pace: "trot" },
    ),
    mv(
      8,
      [["B H", "Change the rein in working trot"]],
      "Regularity and straightness on the diagonal.",
      diag("B", "H"),
      { pace: "trot" },
    ),
    mv(
      9,
      [
        ["C", "Circle right 20m with transition to working canter at the centre line"],
        ["C M B", "Working canter"],
      ],
      "Willing transition on the circle; regularity of canter.",
      [
        line(along("H", "C", "left", arena)),
        circle("C", 20),
        line(along("C", "B", "right", arena)),
      ],
      { pace: "canter" },
    ),
    mv(
      10,
      [["B", "Circle right 20m, between the centre line and B working trot"]],
      "Size and shape of the circle; willing transition to trot.",
      circle("B", 20),
      { pace: "trot" },
    ),
    mv(
      11,
      [["B K", "Change the rein in working trot"]],
      "Regularity and straightness on the diagonal.",
      diag("B", "K"),
      { pace: "trot" },
    ),
    mv(
      12,
      [
        ["A", "Down centre line"],
        ["G", "Halt, Salute"],
      ],
      "Bend in the turn; straightness; attentiveness; immobility.",
      [line(along("K", "A", "left", arena)), line(["A", "X", "G"]), halt("G")],
      { pace: "trot" },
    ),
  ],
};
