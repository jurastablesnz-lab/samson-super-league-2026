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

/** CCN105. A5 (2018), 60×20. */
export const TEST_EV_A5: SetTest = {
  id: "ev-a5",
  short: "A5",
  name: "Eventing A5",
  year: "ESNZ 2018",
  time: "4:30",
  drawTime: "6:30",
  arena: "60 × 20",
  purpose: "Novice eventing dressage for CCN105, ridden in the 60×20 arena.",
  instructions: SITTING_OR_RISING,
  introduces: "Circles at X, 15m circles, and a stretching half circle",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter working trot"],
        ["C", "Track right"],
      ],
      "Regularity of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "B", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [
        ["B", "Turn right"],
        ["X", "20 metre circle right"],
      ],
      "Bend in the turn; size and shape of the circle.",
      [line(["B", "X"]), circle("X", 20)],
      { pace: "trot" },
    ),
    mv(
      3,
      [
        ["Over X", "Show 3 to 5 walk steps"],
        ["", "Proceed working trot"],
      ],
      "Willing transitions through a few clear walk steps.",
      circle("X", 20),
      { pace: "walk" },
    ),
    mv(
      4,
      [
        ["X", "20 metre circle left, working trot"],
        ["X E K", "Working trot"],
      ],
      "Size and shape of the circle; regularity.",
      [circle("X", 20), line(["X", "E"]), line(along("E", "K", "left", arena))],
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
      [["B", "15 metre circle left"]],
      "Regularity of canter; size and shape of the 15m circle.",
      [line(along("A", "B", "left", arena)), circle("B", 15)],
      { pace: "canter" },
    ),
    mv(
      7,
      [["Between B & M", "Half 15 metre circle, returning to the track between B and F"]],
      "Size of the half circle. The return is between B and F, drawn back to F.",
      half("M", "F", "C"),
      { pace: "canter" },
    ),
    mv(
      8,
      [
        ["F", "Working trot"],
        ["K", "Medium walk"],
      ],
      "Willing transitions; regularity of trot and walk.",
      line(along("F", "K", "right", arena)),
      { pace: "walk" },
    ),
    mv(
      9,
      [
        ["E to M", "Free walk on a long rein"],
        ["M", "Medium walk"],
      ],
      "Ground cover of the free walk; clear transition to medium walk.",
      [line(along("K", "E", "right", arena)), diag("E", "M")],
      { pace: "free" },
    ),
    mv(
      10,
      [
        ["C", "Working trot"],
        ["H X F", "Change the rein"],
      ],
      "Willing transition; straightness on the diagonal.",
      [line(along("M", "H", "left", arena)), diag("H", "F")],
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
      [["E", "15 metre circle right"]],
      "Regularity of canter; size and shape of the 15m circle.",
      [line(along("A", "E", "right", arena)), circle("E", 15)],
      { pace: "canter" },
    ),
    mv(
      13,
      [["Between E & H", "Half 15 metre circle, returning to the track between E and K"]],
      "Size of the half circle. The return is between E and K, drawn back to K.",
      half("H", "K", "A"),
      { pace: "canter" },
    ),
    mv(
      14,
      [["K A F B", "Working trot"]],
      "Willing transition; regularity of trot.",
      line(along("K", "B", "left", arena)),
      {
        pace: "trot",
      },
    ),
    mv(
      15,
      [
        ["B to E", "Half 20 metre circle, allowing the horse to stretch down"],
        ["E K A", "Working trot"],
      ],
      "Size of the half circle; the stretch forward and downward; willing return.",
      [half("B", "E", "A", "left"), line(along("E", "A", "left", arena))],
      { pace: "free" },
    ),
    mv(
      16,
      [
        ["A", "Turn down centre line"],
        ["X", "Halt, salute"],
      ],
      "Bend in the turn; straightness; immobility.",
      [line(["A", "X"]), halt("X")],
      { pace: "trot" },
    ),
  ],
};
