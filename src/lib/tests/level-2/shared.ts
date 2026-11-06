import type { Movement } from "../types.ts";

export const ENTER: Movement = {
  n: 1,
  steps: [
    { at: "A", do: "Enter in working trot" },
    { at: "X", do: "Halt, salute" },
    { at: "", do: "Proceed in working trot" },
  ],
  directive:
    "Regularity and quality of trot; willing clear transitions; straightness, attentiveness; immobility (min. 3 secs)",
  draw: [
    { t: "line", pts: ["A", "X"] },
    { t: "halt", at: "X" },
  ],
};
