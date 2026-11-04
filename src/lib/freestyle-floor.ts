import type { Movement, Pace } from "./esnz-tests";

function m(
  n: number,
  pace: Pace,
  steps: Movement["steps"],
  draw: Movement["draw"],
  directive = "",
): Movement {
  return { n, pace, steps, draw, directive };
}

/** DCD October 2023 Level 2 musical freestyle floorplan — Jura Samson. */
export const MFS_FLOOR = {
  name: "Level 2 musical freestyle",
  show: "DCD · October 2023",
  horse: "Jura Samson",
  time: "Finish between 4:00 and 4:30",
  arena: "60 × 20",
  purpose:
    "Your floorplan. Walk it from the caller until the letters are boring. Last Super 5 outing it was an elimination — only take it when the file and this floorplan are both quiet.",
  movements: [
    m(1, "trot", [{ at: "A", do: "Enter in working trot" }, { at: "X", do: "Halt, salute" }], [
      { t: "line", pts: ["A", "X"] },
      { t: "halt", at: "X" },
    ]),
    m(2, "trot", [{ at: "I", do: "Working trot to C" }], [{ t: "line", pts: ["I", "C"] }]),
    m(3, "trot", [{ at: "C", do: "Working trot to M, around the short side" }], [{ t: "line", pts: ["C", "M"] }]),
    m(4, "medium", [{ at: "M V", do: "Medium trot" }], [{ t: "diag", from: "M", to: "V" }]),
    m(5, "trot", [{ at: "K V", do: "Working trot" }], [{ t: "line", pts: ["K", "V"] }]),
    m(6, "trot", [{ at: "F", do: "Working trot to K via A" }], [{ t: "line", pts: ["F", "A", "K"] }]),
    m(7, "yield", [{ at: "F I", do: "Leg yield left in working trot" }], [{ t: "yield", from: "F", to: "I" }]),
    m(8, "trot", [{ at: "I", do: "10m circle, right rein, working trot" }], [{ t: "circle", at: "I", m: 10 }]),
    m(9, "trot", [{ at: "Between G & I", do: "Working trot to C" }], [{ t: "line", pts: ["GI", "C"] }]),
    m(10, "trot", [{ at: "C", do: "Working trot toward H, around the short side" }], [{ t: "line", pts: ["C", "CH"] }]),
    m(11, "medium", [{ at: "H P", do: "Medium trot" }], [{ t: "diag", from: "H", to: "P" }]),
    m(12, "trot", [{ at: "F P", do: "Working trot" }], [{ t: "line", pts: ["F", "P"] }]),
    m(13, "trot", [{ at: "K", do: "Working trot to F via A" }], [{ t: "line", pts: ["K", "A", "F"] }]),
    m(14, "yield", [{ at: "K I", do: "Leg yield right in working trot" }], [{ t: "yield", from: "K", to: "I" }]),
    m(15, "trot", [{ at: "S", do: "10m circle, left rein, working trot" }], [{ t: "circle", at: "S", m: 10 }]),
    m(16, "trot", [{ at: "G", do: "Working trot to C" }], [{ t: "line", pts: ["G", "C"] }]),
    m(17, "trot", [{ at: "C", do: "Working trot to M, around the short side" }], [{ t: "line", pts: ["C", "M"] }]),
    m(18, "walk", [{ at: "M R", do: "Collected walk" }], [{ t: "line", pts: ["M", "R"] }]),
    m(19, "free", [{ at: "R", do: "Half 20m circle, free walk, right rein" }], [
      { t: "half", from: "R", to: "S", bulge: "C" },
    ]),
    m(20, "walk", [{ at: "S M", do: "Medium walk" }], [{ t: "diag", from: "S", to: "M" }]),
    m(21, "trot", [{ at: "M C", do: "Working trot" }], [{ t: "line", pts: ["M", "C"] }]),
    m(22, "canter", [{ at: "Between C & H", do: "Working canter to C" }], [{ t: "line", pts: ["CH", "C"] }]),
    m(23, "canter", [{ at: "S", do: "15m circle, left rein, working canter" }], [{ t: "circle", at: "S", m: 15 }]),
    m(24, "medium-canter", [{ at: "S K", do: "Medium canter" }], [{ t: "line", pts: ["S", "K"] }]),
    m(25, "canter", [{ at: "K", do: "Working canter to F via A" }], [{ t: "line", pts: ["K", "A", "F"] }]),
    m(26, "canter", [{ at: "Between F & A", do: "Working canter to X" }], [{ t: "line", pts: ["FA", "X"] }]),
    m(27, "change", [{ at: "X", do: "Change of lead through trot, left to right" }], [{ t: "change", at: "X" }]),
    m(28, "canter", [{ at: "X H", do: "Working canter" }], [{ t: "diag", from: "X", to: "H" }]),
    m(29, "canter", [{ at: "H", do: "Working canter to M via C" }], [{ t: "line", pts: ["H", "C", "M"] }]),
    m(30, "canter", [{ at: "R", do: "15m circle, right rein, working canter" }], [{ t: "circle", at: "R", m: 15 }]),
    m(31, "medium-canter", [{ at: "R F", do: "Medium canter" }], [{ t: "line", pts: ["R", "F"] }]),
    m(32, "canter", [{ at: "F", do: "Working canter to K via A" }], [{ t: "line", pts: ["F", "A", "K"] }]),
    m(33, "canter", [{ at: "K X", do: "Working canter" }], [{ t: "diag", from: "K", to: "X" }]),
    m(34, "change", [{ at: "X", do: "Change of lead through trot, right to left" }], [{ t: "change", at: "X" }]),
    m(35, "canter", [{ at: "X M", do: "Working canter" }], [{ t: "diag", from: "X", to: "M" }]),
    m(36, "canter", [{ at: "M", do: "Working canter to H via C" }], [{ t: "line", pts: ["M", "C", "H"] }]),
    m(37, "trot", [{ at: "H E", do: "Working trot" }], [{ t: "line", pts: ["H", "E"] }]),
    m(38, "trot", [{ at: "E", do: "Half 10m circle, left rein, working trot" }], [
      { t: "half", from: "E", to: "X", bulge: "A" },
    ]),
    m(39, "trot", [{ at: "X", do: "Down the centre line" }, { at: "G", do: "Halt, salute" }], [
      { t: "line", pts: ["X", "G"] },
      { t: "halt", at: "G" },
    ]),
  ] satisfies Movement[],
};

export const PACE_LABEL: Record<Pace, string> = {
  trot: "Working trot",
  medium: "Medium trot",
  walk: "Walk",
  free: "Free walk",
  canter: "Working canter",
  "medium-canter": "Medium canter",
  yield: "Leg yield",
  change: "Through trot",
};
