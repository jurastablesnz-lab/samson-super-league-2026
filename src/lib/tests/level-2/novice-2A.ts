import { ENTER } from "./shared.ts";
import type { SetTest } from "../types.ts";

export const TEST_2A: SetTest = {
  id: "2a",
  short: "2A",
  name: "Novice 2A",
  role: "The other novice test",
  year: "ESNZ 2023",
  time: "5:30 from entry at A",
  drawTime: "8:00",
  arena: "60 × 20",
  purpose:
    "Accuracy and a clean stretch. Ride it at home when 2B is stale, not as a Super 5 substitute.",
  introduces: "10m half circle in trot, 15m circle in canter, lengthening of stride in trot",
  leave: "Leave arena in walk on a long rein at A",
  keys: [
    {
      move: "Halt at X / G",
      judge: "Immobility, straightness, square",
      school: "Walk the last three steps. Do not collapse into the halt.",
    },
    {
      move: "10m half circles",
      judge: "Geometry, bend, regularity",
      school: "Sit, half-halt, then the half-circle. If he falls in, too much hand.",
    },
    {
      move: "Stretchy circle",
      judge: "Horse stretching forward and downward",
      school: "He seeks the contact. You do not throw the reins.",
    },
    {
      move: "Medium trot",
      judge: "Moderate lengthening, regularity",
      school: "Up and out, not faster. Half-halt before the letter.",
    },
  ],
  movements: [
    ENTER,
    {
      n: 2,
      steps: [
        { at: "C", do: "Track left" },
        { at: "E X", do: "Half circle left 10m, returning to the track at H" },
        { at: "H B", do: "Working trot" },
      ],
      directive:
        "Regularity and quality of trot; shape and size of half circle; bend; balance; straightness",
      draw: [
        { t: "line", pts: ["C", "H", "S", "E"] },
        { t: "return-half", from: "E", to: "H", bulge: "C" },
        { t: "line", pts: ["H", "C", "M", "B"] },
      ],
    },
    {
      n: 3,
      steps: [
        { at: "B X", do: "Half circle right 10m, returning to the track at M" },
        { at: "M C", do: "Working trot" },
      ],
      directive:
        "Regularity and quality of trot; shape and size of half circle; bend; balance; straightness",
      draw: [
        { t: "line", pts: ["C", "M", "R", "B"] },
        { t: "return-half", from: "B", to: "M", bulge: "A" },
        { t: "line", pts: ["M", "C"] },
      ],
    },
    {
      n: 4,
      coeff: 2,
      steps: [
        {
          at: "C",
          do: "Circle left 20m rising trot, allowing the horse to stretch forward and downward while maintaining contact",
        },
        { at: "Before C", do: "Shorten the reins" },
        { at: "C H", do: "Working trot" },
      ],
      directive:
        "Forward and downward stretch over the back into a light contact maintaining balance and quality of trot; bend; shape and size of circle; willing, clear transitions",
      draw: [
        { t: "stretch", at: "C" },
        { t: "line", pts: ["C", "H"] },
      ],
    },
    {
      n: 5,
      steps: [
        { at: "H P", do: "Change rein, lengthen stride in trot" },
        { at: "P A", do: "Working trot" },
      ],
      directive:
        "Moderate lengthening of frame and stride; regularity and quality of trot; straightness; consistent tempo; willing, clear transitions; bend and balance in corner",
      draw: [
        { t: "diag", from: "H", to: "P" },
        { t: "line", pts: ["P", "F", "A"] },
      ],
    },
    {
      n: 6,
      coeff: 2,
      steps: [{ at: "A V", do: "Medium walk" }],
      directive:
        "Willing, clear transition; regularity, overtrack and quality of walk; bend and balance in corner, straightness",
      draw: [{ t: "line", pts: ["A", "K", "V"] }],
    },
    {
      n: 7,
      coeff: 2,
      steps: [
        { at: "V R", do: "Change rein, free walk on a long rein" },
        { at: "R M", do: "Medium walk" },
      ],
      directive:
        "Regularity and quality of walks; reach and ground cover with overtrack of free walk allowing complete freedom to stretch the neck forward and downward into a light contact; straightness; clear, balanced transitions",
      draw: [
        { t: "diag", from: "V", to: "R" },
        { t: "line", pts: ["R", "M"] },
      ],
    },
    {
      n: 8,
      coeff: 2,
      steps: [
        { at: "M", do: "Working trot" },
        { at: "C", do: "Working canter left lead" },
        { at: "C E", do: "Working canter" },
      ],
      directive:
        "Willing clear transitions; regularity and quality of paces; bend and balance in corners",
      draw: [{ t: "line", pts: ["M", "C", "H", "S", "E"] }],
    },
    {
      n: 9,
      steps: [
        { at: "E", do: "Circle left 15m" },
        { at: "E F", do: "Working canter" },
      ],
      directive: "Regularity and quality of canter; shape and size of circle; bend; balance",
      draw: [
        { t: "circle", at: "E", m: 15 },
        { t: "line", pts: ["E", "V", "K", "A", "F"] },
      ],
    },
    {
      n: 10,
      steps: [
        { at: "F X H", do: "Change rein" },
        { at: "X", do: "Working trot" },
      ],
      directive:
        "Willing, clear transition; regularity and quality of gaits; straightness; bend and balance in corner",
      draw: [{ t: "diag", from: "F", to: "H" }],
    },
    {
      n: 11,
      coeff: 2,
      steps: [
        { at: "C", do: "Working canter right lead" },
        { at: "C B", do: "Working canter" },
      ],
      directive:
        "Willing, clear transition; regularity and quality of canter; bend and balance in corner",
      draw: [{ t: "line", pts: ["H", "C", "M", "R", "B"] }],
    },
    {
      n: 12,
      steps: [
        { at: "B", do: "Circle right 15m" },
        { at: "B A", do: "Working canter" },
      ],
      directive: "Regularity and quality of canter; shape and size of circle; bend; balance",
      draw: [
        { t: "circle", at: "B", m: 15 },
        { t: "line", pts: ["B", "P", "F", "A"] },
      ],
    },
    {
      n: 13,
      steps: [
        { at: "A", do: "Working trot" },
        { at: "A K", do: "Working trot" },
      ],
      directive:
        "Willing, clear transition; regularity and quality of trot; straightness; bend and balance in corner",
      draw: [{ t: "line", pts: ["A", "K"] }],
    },
    {
      n: 14,
      steps: [
        { at: "K R", do: "Change rein, lengthen stride in trot" },
        { at: "R E", do: "Working trot" },
      ],
      directive:
        "Moderate lengthening of frame and stride; regularity and quality of trot; straightness; consistent tempo; willing, clear transitions; bend and balance in corners",
      draw: [
        { t: "diag", from: "K", to: "R" },
        { t: "line", pts: ["R", "B", "E"] },
      ],
    },
    {
      n: 15,
      steps: [
        { at: "E", do: "Half circle left 10m" },
        { at: "X", do: "Down centre line" },
        { at: "G", do: "Halt, salute" },
      ],
      directive:
        "Bend and balance in half circle, regularity and quality of trot, willing, clear transition; straightness, attentiveness; immobility (min. 3 secs)",
      draw: [
        { t: "half", from: "E", to: "X", bulge: "C" },
        { t: "line", pts: ["X", "G"] },
        { t: "halt", at: "G" },
      ],
    },
  ],
};
