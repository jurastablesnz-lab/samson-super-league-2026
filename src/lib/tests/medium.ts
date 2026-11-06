import type { Collective, Movement } from "./types.ts";
export const COLLECTIVES: Collective[] = [
  { name: "Paces", detail: "Freedom and regularity", coeff: 1 },
  {
    name: "Impulsion",
    detail:
      "Desire to move forward, elasticity of the steps, relaxation of the back and engagement of the hindquarters",
    coeff: 1,
  },
  {
    name: "Submission",
    detail:
      "Willing cooperation, harmony, attention and confidence; acceptance of bit and aids, straightness, lightness of the forehand and ease of movements",
    coeff: 2,
  },
  {
    name: "Rider",
    detail:
      "Position and seat; correctness and effective use of the aids (clarity, subtlety, independence, accuracy of test)",
    coeff: 2,
  },
];
export const MEDIUM_PURPOSE =
  "To confirm that the horse demonstrates correct basics and having begun to develop an uphill balance at Elementary, now demonstrates increased engagement, especially in the medium and extended paces. Transitions between collected, medium and extended gaits should be well defined and performed with engagement. The horse should be reliably on the bit and show a greater degree of straightness, bending, suppleness, throughness, balance and self-carriage than at Elementary Level.";
export const MEDIUM_INSTRUCTIONS = "To be ridden in a snaffle. All trot sitting.";
export const MEDIUM_ENTER: Movement = {
  n: 1,
  steps: [
    { at: "A", do: "Enter in collected trot" },
    { at: "X", do: "Halt, Salute" },
    { at: "", do: "Proceed in collected trot" },
  ],
  directive:
    "Engagement, uphill balance and quality of trot; well defined balanced transitions; straightness, attentiveness, immobility (min. 3 secs)",
  draw: [
    { t: "line", pts: ["A", "X"] },
    { t: "halt", at: "X" },
  ],
};
