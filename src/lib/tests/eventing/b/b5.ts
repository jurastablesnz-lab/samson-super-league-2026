import type { SetTest } from "../../types.ts";
import {
  EVENTING_COLLECTIVES,
  SITTING_OR_RISING,
  along,
  circle,
  diag,
  halt,
  lat,
  line,
  mv,
} from "../shared.ts";

const arena = "60" as const;

/** CCN1* and CCN2*. B5 (2018), 60×20. */
export const TEST_EV_B5: SetTest = {
  id: "ev-b5",
  short: "B5",
  name: "Eventing B5",
  year: "ESNZ 2018",
  time: "4:30",
  drawTime: "6:30",
  arena: "60 × 20",
  purpose: "Novice eventing dressage for CCN1* and CCN2*.",
  instructions: SITTING_OR_RISING,
  introduces: "12m circles, leg yield, and lengthened canter strides",
  leave: "Leave arena at walk on a long rein at A",
  collectives: EVENTING_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter at working trot"],
        ["C", "Track right"],
      ],
      "Regularity of trot; straightness; bend in the turn.",
      [line(["A", "X", "C"]), line(along("C", "P", "right", arena))],
      { pace: "trot" },
    ),
    mv(
      2,
      [["P", "12 metre circle right, working trot"]],
      "Size and shape of the 12m circle.",
      circle("P", 12),
      {
        pace: "trot",
      },
    ),
    mv(
      3,
      [
        ["A", "Turn down centre line"],
        ["L to R", "Leg yield right"],
      ],
      "Straightness on the centre line, then the leg yield.",
      [line(along("P", "A", "right", arena)), line(["A", "L"]), diag("L", "R")],
      { pace: "trot", lateral: lat("leg-yield", "right", "L", "R") },
    ),
    mv(
      4,
      [
        ["R M C H V", "Working trot"],
        ["V", "12 metre circle"],
      ],
      "Regularity of trot. The 12m circle at V does not say left or right; it is drawn as a circle at V.",
      [line(along("R", "V", "left", arena)), circle("V", 12)],
      { pace: "trot" },
    ),
    mv(
      5,
      [
        ["A", "Turn down centre line"],
        ["L to S", "Leg yield left"],
      ],
      "Straightness on the centre line, then the leg yield.",
      [line(along("V", "A", "left", arena)), line(["A", "L"]), diag("L", "S")],
      { pace: "trot", lateral: lat("leg-yield", "left", "L", "S") },
    ),
    mv(
      6,
      [["H", "Working canter right"]],
      "Willing transition to canter.",
      line(along("S", "H", "right", arena)),
      {
        pace: "canter",
      },
    ),
    mv(
      7,
      [["M to P", "Show some lengthened strides"]],
      "Lengthening of the canter stride.",
      line(along("H", "P", "right", arena)),
      { pace: "medium-canter" },
    ),
    mv(
      8,
      [
        ["P", "15 metre circle, and develop working canter"],
        ["A", "Turn down centre line"],
      ],
      "Size of the circle; the return to working canter; straightness.",
      [circle("P", 15), line(along("P", "A", "right", arena)), line(["A", "D", "L"])],
      { pace: "canter" },
    ),
    mv(
      9,
      [["Between D & L", "Transition to working trot"]],
      "Willing transition to trot.",
      line(["L", "X"]),
      { pace: "trot" },
    ),
    mv(
      10,
      [["Between I & G", "Working canter left"]],
      "Willing transition to canter.",
      line(["X", "I", "G"]),
      { pace: "canter" },
    ),
    mv(
      11,
      [
        ["H to V", "Show some lengthened strides"],
        ["V", "15 metre circle, and develop working canter"],
      ],
      "Lengthening of the canter, then the 15m circle and the return to working canter.",
      [line(along("C", "V", "left", arena)), circle("V", 15)],
      { pace: "canter" },
    ),
    mv(
      12,
      [
        ["K", "Working trot"],
        ["F to S", "Show some lengthened strides"],
        ["S to C", "Working trot"],
      ],
      "Willing transitions; the lengthened trot; regularity.",
      [line(along("V", "K", "left", arena)), diag("F", "S"), line(along("S", "C", "right", arena))],
      { pace: "medium" },
    ),
    mv(
      13,
      [
        ["C", "Medium walk"],
        ["M to E", "Free walk on a long rein"],
      ],
      "Regularity of the walk; ground cover of the free walk.",
      [line(along("C", "M", "right", arena)), diag("M", "E")],
      { pace: "free" },
    ),
    mv(
      14,
      [["E to V", "Medium walk (mark for the walk C to M and E to V)"]],
      "Regularity of the medium walk on both stretches.",
      line(along("E", "V", "left", arena)),
      { pace: "walk" },
    ),
    mv(
      15,
      [
        ["V", "Working trot"],
        ["A", "Turn down centre line"],
      ],
      "Willing transition; bend in the turn; straightness.",
      [line(along("V", "A", "left", arena)), line(["A", "X"])],
      { pace: "trot" },
    ),
    mv(
      16,
      [["X", "Halt. Immobility. Salute"]],
      "Straightness; attentiveness; immobility.",
      halt("X"),
      {
        pace: "trot",
      },
    ),
  ],
};
