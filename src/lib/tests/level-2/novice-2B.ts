import { ENTER } from "./shared.ts";
import type { SetTest } from "../types.ts";

export const TEST_2B: SetTest = {
  id: "2b",
  short: "2B",
  name: "Novice 2B",
  role: "The one that counts",
  year: "ESNZ 2023",
  time: "5:30 from entry at A",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose:
    "North Island Super 5 test. Ridden from memory. Highest coefficients sit on the leg yields, walks, lengthenings and the stretchy circle.",
  introduces: "Leg yielding, lengthening of stride in canter",
  leave: "Leave arena in walk on a long rein at A",
  keys: [
    {
      move: "Stretchy circle 20m",
      judge: "Horse stretching forward and downward",
      school: "Long and low is not the same as behind the bit. He has to seek the contact.",
    },
    {
      move: "Leg yields L → M and L → H",
      judge: "Alignment, balance and flow",
      school:
        "Straight on the centre line first. Then the yield — he does not lead with the shoulder.",
    },
    {
      move: "Lengthen in trot and canter",
      judge: "Moderate lengthening, regularity, tempo",
      school: "Think up and out, not faster. Half-halt before the letter.",
    },
    {
      move: "15m canter circles",
      judge: "Shape, size, bend, balance",
      school: "Sit, half-halt, then the circle. If he falls in, too much hand.",
    },
  ],
  movements: [
    {
      ...ENTER,
      draw: [
        { t: "line", pts: ["A", "X", "C"] },
        { t: "halt", at: "X" },
      ],
    },
    {
      n: 2,
      steps: [
        { at: "C", do: "Track right" },
        { at: "M V", do: "Change rein, lengthen stride in trot" },
        { at: "V K", do: "Working trot" },
      ],
      directive:
        "Bend and balance in the turns; moderate lengthening of frame and stride; regularity and quality of trot; willing, clear transitions; straightness; consistent tempo",
      draw: [
        { t: "line", pts: ["C", "M"] },
        { t: "diag", from: "M", to: "V" },
        { t: "line", pts: ["V", "K"] },
      ],
    },
    {
      n: 3,
      coeff: 2,
      steps: [
        { at: "A", do: "Turn down centre line" },
        { at: "L M", do: "Leg yield right" },
        { at: "M H", do: "Working trot" },
      ],
      directive:
        "Regularity and quality of trot; straightness on centre line; consistent tempo; alignment; balance and flow",
      draw: [
        { t: "line", pts: ["K", "A", "D", "L"] },
        { t: "yield", from: "L", to: "M" },
        { t: "line", pts: ["M", "C", "H"] },
      ],
      lateral: { kind: "leg-yield", direction: "right", line: true, pts: ["L", "M"] },
    },
    {
      n: 4,
      steps: [
        { at: "H P", do: "Change rein, lengthen stride in trot" },
        { at: "P F", do: "Working trot" },
      ],
      directive:
        "Moderate lengthening of frame and stride; regularity and quality of trot; willing, clear transitions; straightness; consistent tempo",
      draw: [
        { t: "diag", from: "H", to: "P" },
        { t: "line", pts: ["P", "F"] },
      ],
    },
    {
      n: 5,
      coeff: 2,
      steps: [
        { at: "A", do: "Turn down centre line" },
        { at: "L H", do: "Leg yield left" },
        { at: "H C", do: "Working trot" },
      ],
      directive: "Regularity and quality of trot; consistent tempo; alignment; balance and flow",
      draw: [
        { t: "line", pts: ["F", "A", "D", "L"] },
        { t: "yield", from: "L", to: "H" },
        { t: "line", pts: ["H", "C"] },
      ],
      lateral: { kind: "leg-yield", direction: "left", line: true, pts: ["L", "H"] },
    },
    {
      n: 6,
      coeff: 2,
      steps: [{ at: "C M", do: "Medium walk" }],
      directive:
        "Willing, clear transition; regularity and quality of walk; over track, bend and balance in corner",
      draw: [{ t: "line", pts: ["C", "M"] }],
    },
    {
      n: 7,
      coeff: 2,
      steps: [
        { at: "M V", do: "Change rein, free walk on a long rein" },
        { at: "V K", do: "Medium walk" },
      ],
      directive:
        "Regularity and quality of walks; reach and ground cover, with over track of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
      draw: [
        { t: "diag", from: "M", to: "V" },
        { t: "line", pts: ["V", "K"] },
      ],
    },
    {
      n: 8,
      steps: [
        { at: "K", do: "Working trot" },
        { at: "A", do: "Working canter left lead" },
        { at: "A P", do: "Working canter" },
      ],
      directive:
        "Willing, clear transitions; regularity and quality of paces and bend and balance in corners",
      draw: [{ t: "line", pts: ["K", "A", "F", "P"] }],
    },
    {
      n: 9,
      steps: [{ at: "P", do: "Circle left 15m" }],
      directive: "Regularity and quality of canter; shape and size of circle; bend; balance",
      draw: [{ t: "circle", at: "P", m: 15 }],
    },
    {
      n: 10,
      coeff: 2,
      steps: [{ at: "P M", do: "Lengthen stride in canter" }],
      directive:
        "Willing, clear transitions; moderate lengthening of frame and stride; regularity and quality of canter; straightness; consistent tempo",
      draw: [{ t: "line", pts: ["P", "B", "R", "M"] }],
    },
    {
      n: 11,
      steps: [
        { at: "Between M & C", do: "Develop working canter" },
        { at: "C H", do: "Working canter" },
      ],
      directive: "Willing, clear transition; regularity and quality of canter; bend in corners",
      draw: [{ t: "line", pts: ["M", "C", "H"] }],
    },
    {
      n: 12,
      steps: [
        { at: "H X F", do: "Change rein" },
        { at: "X F", do: "Working trot" },
      ],
      directive: "Willing, clear transition; regularity and quality of paces; straightness",
      draw: [{ t: "diag", from: "H", to: "F" }],
    },
    {
      n: 13,
      steps: [
        { at: "F", do: "Working canter right lead" },
        { at: "F V", do: "Working canter" },
      ],
      directive:
        "Willing, clear transitions; regularity and quality of canter; bend and balance in corners",
      draw: [{ t: "line", pts: ["F", "A", "K", "V"] }],
    },
    {
      n: 14,
      steps: [{ at: "V", do: "Circle right 15m" }],
      directive: "Regularity and quality of canter; shape and size of circle; bend; balance",
      draw: [{ t: "circle", at: "V", m: 15 }],
    },
    {
      n: 15,
      coeff: 2,
      steps: [{ at: "V H", do: "Lengthen stride in canter" }],
      directive:
        "Willing, clear transitions; moderate lengthening of frame and stride; regularity and quality of canter; straightness; consistent tempo",
      draw: [{ t: "line", pts: ["V", "E", "S", "H"] }],
    },
    {
      n: 16,
      steps: [
        { at: "Between H & C", do: "Develop working canter" },
        { at: "C M", do: "Working canter" },
      ],
      directive:
        "Willing, clear transition; regularity and quality of trot and canter; bend in corners",
      draw: [{ t: "line", pts: ["H", "C", "M"] }],
    },
    {
      n: 17,
      steps: [{ at: "M", do: "Working trot" }],
      directive:
        "Willing, clear, engaged transition; regularity and quality of paces; straightness",
      draw: [{ t: "line", pts: ["M", "R", "B"] }],
    },
    {
      n: 18,
      coeff: 2,
      steps: [
        {
          at: "B",
          do: "Circle right 20m rising trot, allowing the horse to stretch forward and downward while maintaining contact",
        },
        { at: "Before B", do: "Shorten the reins" },
        { at: "B A", do: "Working trot" },
      ],
      directive:
        "Forward and downward stretch over the back into a light contact maintaining balance and quality of trot; bend; shape and size of circle; willing, clear transitions",
      draw: [
        { t: "stretch", at: "B" },
        { t: "line", pts: ["B", "P", "F", "A"] },
      ],
    },
    {
      n: 19,
      steps: [
        { at: "A", do: "Down centre line" },
        { at: "X", do: "Halt, salute" },
      ],
      directive:
        "Bend and balance in turn, regularity and quality of trot, willing, clear transition; straightness, attentiveness; immobility (min. 3 secs)",
      draw: [
        { t: "line", pts: ["A", "X"] },
        { t: "halt", at: "X" },
      ],
    },
  ],
};
