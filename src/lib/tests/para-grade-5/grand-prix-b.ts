import type { SetTest } from "../types.ts";
import {
  GRADE_V_COLLECTIVES,
  GRADE_V_INSTRUCTIONS,
  GRADE_V_PURPOSE,
  LEAVE,
  circle,
  diag,
  halfPirouette,
  halt,
  lateral,
  line,
  mv,
  reinBack,
} from "./shared.ts";

const halfPassLeft = mv(
  4,
  [["F X", "Half-pass to the left"]],
  "Regularity and quality of trot. Uniform bend, collection, balance, fluency, crossing of legs.",
  { t: "yield", from: "F", to: "X" },
  { coeff: 2 },
);
const shoulderLeft = mv(
  6,
  [
    ["X G", "Shoulder-in left"],
    ["G C", "Collected trot"],
  ],
  "Regularity and quality of trot. Bend and constant angle. Collection, balance, and fluency.",
  line(["X", "G", "C"]),
);
const halfPassRight = mv(
  14,
  [["K X", "Half-pass to the right"]],
  "Regularity and quality of trot. Uniform bend, collection, balance, fluency, crossing of legs.",
  { t: "yield", from: "K", to: "X" },
  { coeff: 2 },
);
const shoulderRight = mv(
  16,
  [["X G", "Shoulder-in right"]],
  "Regularity and quality of trot. Bend and constant angle. Collection, balance, and fluency.",
  line(["X", "G"]),
);
const canterLeft = mv(
  20,
  [
    ["F X", "Half-pass to the left"],
    ["X I", "On the centre line"],
  ],
  "Quality of canter. Collection, balance, uniform bend, fluency.",
  [{ t: "yield", from: "F", to: "X" }, line(["X", "I"])],
  { pace: "canter" },
);
const canterRight = mv(
  24,
  [
    ["K X", "Half-pass to the right"],
    ["X I", "On the centre line"],
  ],
  "Quality of canter. Collection, balance, uniform bend, fluency.",
  [{ t: "yield", from: "K", to: "X" }, line(["X", "I"])],
  { pace: "canter" },
);

export const TEST_GV_B: SetTest = {
  id: "gv-b",
  short: "GV B",
  name: "Grade V Para Grand Prix B",
  year: "FEI 2023",
  time: "5:30",
  drawTime: "",
  arena: "60 × 20",
  purpose: GRADE_V_PURPOSE,
  instructions: GRADE_V_INSTRUCTIONS,
  introduces:
    "FEI 2025 team medal test. The 2023 index still calls this the former Individual test.",
  leave: LEAVE,
  collectives: GRADE_V_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter in collected canter"],
        ["X", "Halt. Immobility. Salute."],
        ["X C", "Proceed in collected trot"],
      ],
      "Quality of paces, halt, and transitions. Straightness. Contact and poll.",
      [line(["A", "X", "C"]), halt("X")],
      { pace: "canter" },
    ),
    mv(
      2,
      [
        ["C", "Track right"],
        ["M X K", "Extended trot"],
        ["K", "Collected trot"],
      ],
      "Regularity, elasticity, balance, engagement of hindquarters, lengthening of steps and frame.",
      [line(["C", "M"]), diag("M", "K")],
      { pace: "extended" },
    ),
    mv(
      3,
      [
        ["M and K", "Transitions at M and K"],
        ["K A F", "Collected trot"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Quality of trot.",
      [diag("M", "K"), line(["K", "A", "F"])],
    ),
    lateral(halfPassLeft, "half-pass", "left", "F", "X"),
    mv(
      5,
      [["X", "Volte left (8m Ø)"]],
      "Regularity and quality of trot, collection, and balance. Bend, size and shape of the volte.",
      circle("X", 8),
    ),
    lateral(shoulderLeft, "shoulder-in", "left", "X", "G"),
    mv(
      7,
      [
        ["C", "Track to the left"],
        ["C H X", "Collected trot on the diagonal"],
      ],
      "Regularity and quality of trot, collection, bend in turn.",
      [line(["C", "H"]), line(["H", "X"])],
    ),
    mv(
      8,
      [
        ["Before X", "Collected walk"],
        ["X", "Half pirouette to the left, proceed in collected trot"],
      ],
      "Transition from collected trot to collected walk. Regularity, activity, collection, size, flexion, and bend of half pirouette. Forward tendency, maintenance of four beat.",
      [line(["H", "X"]), halfPirouette("H", "X", 0.85, "left")],
      { coeff: 2 },
    ),
    mv(
      9,
      [["X H C M X", "Collected trot on the diagonal"]],
      "Regularity and quality of trot, collection, bend in corners.",
      line(["X", "H", "C", "M", "X"]),
    ),
    mv(
      10,
      [
        ["Before X", "Collected walk"],
        ["X", "Half pirouette to the right, proceed in collected trot"],
      ],
      "Transition from collected trot to collected walk. Regularity, activity, collection, size, flexion, and bend of half pirouette. Forward tendency, maintenance of four beat.",
      [line(["M", "X"]), halfPirouette("M", "X", 0.85, "right")],
      { coeff: 2 },
    ),
    mv(
      11,
      [["X M C H", "Collected trot"]],
      "Regularity and quality of trot, collection, bend in corners.",
      line(["X", "M", "C", "H"]),
    ),
    mv(
      12,
      [
        ["H X F", "Extended trot"],
        ["F", "Collected trot"],
      ],
      "Regularity, elasticity, balance, engagement of hindquarters, lengthening of steps and frame.",
      diag("H", "F"),
      { pace: "extended" },
    ),
    mv(
      13,
      [
        ["H and F", "Transitions at H and F"],
        ["F A K", "Collected trot"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Quality of trot.",
      [diag("H", "F"), line(["F", "A", "K"])],
    ),
    lateral(halfPassRight, "half-pass", "right", "K", "X"),
    mv(
      15,
      [["X", "Volte right (8m Ø)"]],
      "Regularity and quality of trot, collection, and balance. Bend, size and shape of the volte.",
      circle("X", 8),
    ),
    lateral(shoulderRight, "shoulder-in", "right", "X", "G"),
    mv(
      17,
      [
        ["Between G and C", "Medium walk"],
        ["C", "Track to the right"],
        ["C M R", "Medium walk"],
      ],
      "Transition from collected trot to medium walk. Regularity, suppleness of back, activity, overtrack, freedom of shoulder, stretching to the bit.",
      line(["G", "C", "M", "R"]),
      { pace: "walk" },
    ),
    mv(
      18,
      [["R X V", "Extended walk"]],
      "Regularity, suppleness of back, activity, overtrack, freedom of shoulder, stretching to the bit. Differentiation from medium walk.",
      diag("R", "V"),
      { pace: "free" },
    ),
    mv(
      19,
      [
        ["V K", "Collected walk"],
        ["K", "Proceed in collected canter left"],
        ["K A F", "Collected canter"],
      ],
      "Transition from extended walk to collected walk and from collected walk to collected canter, maintenance of rhythm, promptness, fluency, straightness, quality of canter, collection.",
      line(["V", "K", "A", "F"]),
      { pace: "canter" },
    ),
    lateral(canterLeft, "half-pass", "left", "F", "X"),
    mv(
      21,
      [
        ["I", "Simple change of leg"],
        ["I C", "Collected canter"],
        ["C", "Track to the right"],
        ["C M", "Collected canter"],
      ],
      "Promptness, fluency, and balance of both transitions in the change, 3-5 clear walk steps. Quality of the canter before and after the change.",
      [line(["I", "C", "M"]), { t: "change", at: "I" }],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      22,
      [
        ["M F", "Extended canter"],
        ["F", "Collected canter"],
      ],
      "Quality of canter. Impulsion, lengthening of strides and frame, uphill tendency, straightness.",
      line(["M", "R", "B", "P", "F"]),
      { pace: "extended-canter" },
    ),
    mv(
      23,
      [
        ["M and F", "Transitions at M and F"],
        ["F A K", "Collected canter"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Quality and collection of canter.",
      line(["M", "R", "B", "P", "F", "A", "K"]),
      { pace: "extended-canter" },
    ),
    lateral(canterRight, "half-pass", "right", "K", "X"),
    mv(
      25,
      [
        ["I", "Simple change of leg"],
        ["I C", "Collected canter"],
        ["C", "Track to the left"],
        ["C H", "Collected canter"],
      ],
      "Promptness, fluency, and balance of both transitions in the change, 3-5 clear walk steps. Quality of the canter before and after the change.",
      [line(["I", "C", "H"]), { t: "change", at: "I" }],
      { pace: "canter", coeff: 2 },
    ),
    mv(
      26,
      [
        ["H K", "Extended canter"],
        ["K", "Collected canter"],
      ],
      "Quality of canter. Impulsion, lengthening of strides and frame, uphill tendency, straightness.",
      line(["H", "S", "E", "V", "K"]),
      { pace: "extended-canter" },
    ),
    mv(
      27,
      [
        ["H and K", "Transitions at H and K"],
        ["K A", "Collected canter"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Quality and collection of canter.",
      line(["H", "S", "E", "V", "K", "A"]),
      { pace: "extended-canter" },
    ),
    mv(
      28,
      [
        ["A L", "Down the centre line"],
        ["L", "Halt, rein back 4 steps, proceed immediately in collected trot"],
      ],
      "Quality of halt and transitions. Throughness, fluency, straightness. Accuracy in number of diagonal steps.",
      [line(["A", "L"]), halt("L"), reinBack("L")],
      { coeff: 2 },
    ),
    mv(
      29,
      [
        ["L I", "Collected trot"],
        ["I", "Halt. Immobility. Salute."],
      ],
      "Quality of paces, halt, and transitions. Straightness. Contact and poll.",
      [line(["L", "I"]), halt("I")],
    ),
  ],
};
