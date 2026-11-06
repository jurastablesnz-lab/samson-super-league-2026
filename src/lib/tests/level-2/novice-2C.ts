import { ENTER } from "./shared.ts";
import type { SetTest } from "../types.ts";

export const TEST_2C: SetTest = {
  id: "2c",
  short: "2C",
  name: "Novice 2C",
  role: "The homework test",
  year: "ESNZ 2023",
  time: "6:00 from entry at A",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose:
    "The school test. Ride it from the sheet at home until the letters are boring. Super 5 2B is ridden from memory.",
  introduces: "10m circle at trot, change of lead through trot, counter canter",
  leave: "Leave arena in walk on a long rein at A",
  keys: [
    {
      move: "Letters and centre line",
      judge: "Accuracy, straightness",
      school: "Pick a letter, ride to it. Cheap points. This is why 2C is the homework.",
    },
    {
      move: "10m circles at I",
      judge: "Balance, bend, geometry",
      school: "Sit, half-halt, then the circle. If he falls in, too much hand.",
    },
    {
      move: "One loop, counter canter",
      judge: "Shape and size of loop, positioning, balance",
      school: "Keep the lead. The loop is a line, not a 10m circle.",
    },
    {
      move: "Change of lead through trot",
      judge: "3–4 steps of trot, straightness",
      school: "Come back before X, three or four steps, pick up. Do not scramble.",
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
        { at: "C", do: "Track left" },
        { at: "H X F", do: "Change rein, lengthen stride in trot" },
        { at: "F V", do: "Working trot" },
      ],
      directive:
        "Bend and balance in turns; moderate lengthening of frame and stride; regularity and quality of trot; willing, clear transitions; straightness; consistent tempo",
      draw: [
        { t: "line", pts: ["C", "H"] },
        { t: "diag", from: "H", to: "F" },
        { t: "line", pts: ["F", "V"] },
      ],
    },
    {
      n: 3,
      coeff: 2,
      steps: [{ at: "V I", do: "Leg yield right" }],
      directive: "Regularity and quality of trot, consistent tempo; alignment, balance and flow",
      draw: [{ t: "yield", from: "V", to: "I" }],
    },
    {
      n: 4,
      steps: [
        { at: "I", do: "Circle left 10m" },
        { at: "I", do: "Straight ahead" },
        { at: "C", do: "Track right" },
        { at: "C B", do: "Working trot" },
      ],
      directive:
        "Regularity and quality of trot; shape and size of circle; bend; balance; straightness on centre line",
      draw: [
        { t: "circle", at: "I", m: 10, side: "left" },
        { t: "line", pts: ["I", "G", "C", "M", "R", "B"] },
      ],
    },
    {
      n: 5,
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
        "Forward and downward stretch over the back into a light contact, maintaining balance and quality of trot; bend; shape and size of circle; willing, clear transitions",
      draw: [
        { t: "stretch", at: "B" },
        { t: "line", pts: ["B", "P", "F", "A"] },
      ],
    },
    {
      n: 6,
      steps: [{ at: "A", do: "Canter right lead" }],
      directive:
        "Willing, clear transition; regularity and quality of canter; bend and balance in corner",
      draw: [{ t: "line", pts: ["A", "K"] }],
    },
    {
      n: 7,
      coeff: 2,
      steps: [
        { at: "K X H", do: "One loop maintaining right lead" },
        { at: "H C", do: "Working canter" },
      ],
      directive: "Regularity and quality of canter; shape and size of loop; positioning; balance",
      draw: [
        { t: "loop", from: "K", to: "H" },
        { t: "line", pts: ["H", "C"] },
      ],
    },
    {
      n: 8,
      steps: [
        { at: "C", do: "Circle right 15m" },
        { at: "C M", do: "Working canter" },
      ],
      directive: "Regularity and quality of canter; shape and size of circle; bend; balance",
      draw: [
        { t: "circle", at: "C", m: 15 },
        { t: "line", pts: ["C", "M"] },
      ],
    },
    {
      n: 9,
      steps: [
        { at: "M F", do: "Lengthen stride in canter" },
        { at: "F K", do: "Working canter" },
      ],
      directive:
        "Moderate lengthening of frame and stride; regularity and quality of canter; willing, clear engaged transition; straightness; and consistent tempo, bend and balance in corners, regularity and quality of canter",
      draw: [{ t: "line", pts: ["M", "R", "B", "P", "F", "A", "K"] }],
    },
    {
      n: 10,
      steps: [
        { at: "K X M", do: "Change rein" },
        { at: "X", do: "Working trot" },
      ],
      directive: "Willing, clear transitions; regularity and quality of paces; straightness",
      draw: [{ t: "diag", from: "K", to: "M" }],
    },
    {
      n: 11,
      coeff: 2,
      steps: [
        { at: "C", do: "Medium walk" },
        { at: "C H", do: "Medium walk" },
      ],
      directive:
        "Willing, clear transition; regularity and quality of walk; over track; bend; balance; straightness",
      draw: [{ t: "line", pts: ["M", "C", "H"] }],
    },
    {
      n: 12,
      coeff: 2,
      steps: [
        { at: "H X K", do: "Free walk on a long rein" },
        { at: "K A", do: "Medium walk" },
      ],
      directive:
        "Regularity and quality of walks; reach, over track and ground cover of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
      draw: [
        { t: "diag", from: "H", to: "K" },
        { t: "line", pts: ["K", "A"] },
      ],
    },
    {
      n: 13,
      steps: [
        { at: "A", do: "Working trot" },
        { at: "A P", do: "Working trot" },
      ],
      directive:
        "Willing, clear, engaged transition; regularity and quality of trot; straightness; bend and balance in corner",
      draw: [{ t: "line", pts: ["A", "F", "P"] }],
    },
    {
      n: 14,
      coeff: 2,
      steps: [{ at: "P I", do: "Leg yield left" }],
      directive: "Regularity and quality of trot; consistent tempo; alignment; balance and flow",
      draw: [{ t: "yield", from: "P", to: "I" }],
    },
    {
      n: 15,
      steps: [
        { at: "I", do: "Circle right 10m" },
        { at: "I", do: "Straight ahead" },
        { at: "C", do: "Track right" },
      ],
      directive: "Regularity and quality of trot; shape and size of circle; bend; balance",
      draw: [
        { t: "circle", at: "I", m: 10, side: "right" },
        { t: "line", pts: ["I", "G", "C", "M"] },
      ],
    },
    {
      n: 16,
      steps: [
        { at: "M X K", do: "Lengthen stride in trot" },
        { at: "K", do: "Working trot" },
      ],
      directive:
        "Moderate lengthening of frame and stride; regularity and quality of trot; willing, clear transitions; straightness; consistent tempo",
      draw: [{ t: "diag", from: "M", to: "K" }],
    },
    {
      n: 17,
      steps: [{ at: "A", do: "Working canter left lead" }],
      directive:
        "Willing, calm transition; regularity and quality of gait; bend and balance in corner",
      draw: [{ t: "line", pts: ["K", "A", "F"] }],
    },
    {
      n: 18,
      coeff: 2,
      steps: [
        { at: "F X M", do: "One loop maintaining left lead" },
        { at: "M C", do: "Working canter" },
      ],
      directive: "Regularity and quality of canter; shape and size of loop; positioning; balance",
      draw: [
        { t: "loop", from: "F", to: "M" },
        { t: "line", pts: ["M", "C"] },
      ],
    },
    {
      n: 19,
      steps: [
        { at: "C", do: "Circle left 15m" },
        { at: "C H", do: "Working canter" },
      ],
      directive: "Regularity and quality of canter; shape and size of circle; bend; balance",
      draw: [
        { t: "circle", at: "C", m: 15 },
        { t: "line", pts: ["C", "H"] },
      ],
    },
    {
      n: 20,
      steps: [
        { at: "H K", do: "Lengthen stride in canter" },
        { at: "K A F", do: "Working canter" },
      ],
      directive:
        "Moderate lengthening of frame and stride; regularity and quality of canter; willing, clear transition; straightness; and consistent tempo",
      draw: [{ t: "line", pts: ["H", "S", "E", "V", "K", "A", "F"] }],
    },
    {
      n: 21,
      steps: [
        { at: "F X H", do: "Change rein" },
        { at: "X", do: "Change of rein through trot (3–4 steps)" },
        { at: "H M", do: "Working canter" },
      ],
      directive: "Willing clear transitions; regularity and quality of paces; straightness",
      draw: [
        { t: "diag", from: "F", to: "H" },
        { t: "line", pts: ["H", "C", "M"] },
      ],
    },
    {
      n: 22,
      steps: [
        { at: "M", do: "Working trot" },
        { at: "B", do: "Half circle right 10m" },
        { at: "X", do: "Down centre line" },
        { at: "G", do: "Halt, salute" },
      ],
      directive:
        "Bend and balance in corner and half circle; regularity and quality of trot; willing, clear transition; straightness; attentiveness; immobility (min. 3 secs)",
      draw: [
        { t: "line", pts: ["M", "R", "B"] },
        { t: "half", from: "B", to: "X", bulge: "C" },
        { t: "line", pts: ["X", "G"] },
        { t: "halt", at: "G" },
      ],
    },
  ],
};
