import type { SetTest } from "../types.ts";
import {
  GRADE_V_COLLECTIVES,
  GRADE_V_INSTRUCTIONS,
  GRADE_V_PURPOSE,
  LEAVE,
  change,
  circle,
  diag,
  half,
  halfPirouette,
  halt,
  lateral,
  line,
  mv,
  reinBack,
} from "./shared.ts";

const shoulderLeft = mv(
  3,
  [["S V", "Shoulder-in left"]],
  "Regularity and quality of trot. Bend and constant angle. Collection, balance, and fluency.",
  line(["S", "V"]),
);
const halfPassLeft = mv(
  4,
  [
    ["V L", "Half volte left (10m Ø)"],
    ["L S", "Half-pass to the left"],
    ["S H", "Collected trot"],
  ],
  "Regularity and quality of trot. Uniform bend, collection, balance, fluency, crossing of legs.",
  [{ ...half("V", "L", "A"), travel: "A" }, { t: "yield", from: "L", to: "S" }, line(["S", "H"])],
  { coeff: 2 },
);
const shoulderRight = mv(
  7,
  [["R P", "Shoulder-in right"]],
  "Regularity and quality of trot. Bend and constant angle. Collection, balance, and fluency.",
  line(["R", "P"]),
);
const halfPassRight = mv(
  8,
  [
    ["P L", "Half volte right (10m Ø)"],
    ["L R", "Half-pass to the right"],
    ["R M C H", "Collected trot"],
  ],
  "Regularity and quality of trot. Uniform bend, collection, balance, fluency, crossing of legs.",
  [half("P", "L", "A"), { t: "yield", from: "L", to: "R" }, line(["R", "M", "C", "H"])],
  { coeff: 2 },
);

export const TEST_GV_A: SetTest = {
  id: "gv-a",
  short: "GV A",
  name: "Grade V Para Grand Prix A",
  year: "FEI 2023",
  time: "5:30",
  drawTime: "",
  arena: "60 × 20",
  purpose: GRADE_V_PURPOSE,
  instructions: GRADE_V_INSTRUCTIONS,
  introduces:
    "FEI 2025 individual medal test. The 2023 index still calls this the former Team test.",
  leave: LEAVE,
  collectives: GRADE_V_COLLECTIVES,
  movements: [
    mv(
      1,
      [
        ["A", "Enter in collected trot"],
        ["X", "Halt. Immobility. Salute."],
        ["X C", "Proceed in collected trot"],
      ],
      "Quality of paces, halt, and transitions. Straightness. Contact and poll.",
      [line(["A", "X", "C"]), halt("X")],
    ),
    mv(
      2,
      [
        ["C", "Track left"],
        ["S", "Volte left (10m Ø)"],
      ],
      "Regularity and quality of trot, collection, and balance. Bend, size and shape of the volte.",
      [line(["C", "H", "S"]), circle("S")],
    ),
    lateral(shoulderLeft, "shoulder-in", "left", "S", "V"),
    lateral(halfPassLeft, "half-pass", "left", "L", "S"),
    mv(
      5,
      [
        ["H", "Turn right"],
        ["G", "Halt. Immobility. Rein back 4 steps and proceed immediately in collected trot"],
        ["G M", "Collected trot"],
      ],
      "Quality of halt and transitions. Throughness, fluency, straightness. Accuracy in number of diagonal steps.",
      [line(["H", "G", "M"]), halt("G"), reinBack("G")],
      { coeff: 2 },
    ),
    mv(
      6,
      [
        ["M", "Track right"],
        ["M R", "Collected trot"],
        ["R", "Volte right (10m Ø)"],
      ],
      "Regularity and quality of trot, collection, and balance. Bend, size and shape of the volte.",
      [line(["M", "R"]), circle("R")],
    ),
    lateral(shoulderRight, "shoulder-in", "right", "R", "P"),
    lateral(halfPassRight, "half-pass", "right", "L", "R"),
    mv(
      9,
      [["H P", "Medium trot"]],
      "Regularity, elasticity, balance, engagement of hindquarters, lengthening of steps and frame.",
      diag("H", "P"),
      { pace: "medium" },
    ),
    mv(
      10,
      [
        ["H and P", "Transitions at H and P"],
        ["P A", "Collected trot"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Quality of trot.",
      [diag("H", "P"), line(["P", "F", "A"])],
    ),
    mv(
      11,
      [
        ["A", "Transition to medium walk"],
        ["A K", "Medium walk"],
      ],
      "Smooth and fluent transition. Regularity, suppleness of back, activity, overtrack, freedom of shoulder, stretching to the bit.",
      line(["A", "K"]),
      { pace: "walk" },
    ),
    mv(
      12,
      [["K L B R", "Extended walk"]],
      "Regularity, suppleness of back, activity, overtrack, freedom of shoulder, stretching to the bit. Differentiation from medium walk.",
      line(["K", "L", "B", "R"]),
      { pace: "free" },
    ),
    mv(
      13,
      [
        ["Before R", "Collected walk"],
        ["R", "Turn left"],
        ["Between I and S", "Half pirouette to the left"],
      ],
      "Regularity, activity, collection, size, flexion, and bend of half pirouette. Forward tendency, maintenance of four beat.",
      [line(["R", "I"]), halfPirouette("I", "S", 0.5, "left")],
      { pace: "walk", coeff: 2 },
    ),
    mv(
      14,
      [["Between I and R", "Half pirouette to the right"]],
      "Regularity, activity, collection, size, flexion, and bend of half pirouette. Forward tendency, maintenance of four beat.",
      halfPirouette("I", "R", 0.5, "right"),
      { pace: "walk", coeff: 2 },
    ),
    mv(
      15,
      [["R I", "The collected walk R I (S) I (R) I"]],
      "Regularity, suppleness of back, activity, shortening and heightening of steps, self-carriage. Transition from extended walk to collected walk.",
      [
        line(["R", "I"]),
        halfPirouette("I", "S", 0.5, "left"),
        halfPirouette("I", "R", 0.5, "right"),
      ],
      { pace: "walk" },
    ),
    mv(
      16,
      [
        ["I", "Proceed in collected canter right"],
        ["S", "Track right"],
        ["S H C M", "Collected canter"],
      ],
      "Precise execution and fluency of transition. Quality and collection of canter.",
      line(["I", "S", "H", "C", "M"]),
      { pace: "canter" },
    ),
    mv(
      17,
      [
        ["M P", "Medium canter"],
        ["P", "Collected canter"],
      ],
      "Quality of canter. Impulsion, lengthening of strides and frame, uphill tendency, straightness.",
      line(["M", "R", "B", "P"]),
      { pace: "medium-canter" },
    ),
    mv(
      18,
      [["M and P", "Transitions at M and P"]],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame.",
      line(["M", "R", "B", "P"]),
      { pace: "medium-canter" },
    ),
    mv(
      19,
      [
        ["P V", "Half circle (20m Ø)"],
        ["V X R", "Change rein without change of leg"],
      ],
      "Quality and collection of canter, accuracy of lines.",
      [half("P", "V", "A"), diag("V", "R")],
      { pace: "canter" },
    ),
    mv(
      20,
      [
        ["R S", "Half circle (20m Ø) in counter canter"],
        ["S E", "Counter canter"],
      ],
      "Quality and collection of counter canter, self-carriage, balance, straightness.",
      [half("R", "S", "C"), line(["S", "E"])],
      { pace: "canter" },
    ),
    mv(
      21,
      [["E", "Simple change of leg"]],
      "Promptness, fluency, and balance of both transitions in the change, 3-5 clear walk steps. Quality of the canter before and after the change.",
      change("E"),
      { pace: "canter", coeff: 2 },
    ),
    mv(
      22,
      [
        ["E V K A F", "Collected canter"],
        ["F R", "Extended canter"],
        ["R", "Collected canter"],
      ],
      "Quality of canter. Impulsion, lengthening of strides and frame, uphill tendency, straightness. Differentiation from medium canter.",
      [line(["E", "V", "K", "A", "F"]), line(["F", "P", "B", "R"])],
      { pace: "extended-canter" },
    ),
    mv(
      23,
      [["F and R", "Transitions at F and R"]],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame.",
      line(["F", "P", "B", "R"]),
      { pace: "extended-canter" },
    ),
    mv(
      24,
      [
        ["R S", "Collected canter and half circle (20m Ø)"],
        ["S X P", "Change rein without change of leg"],
      ],
      "Quality and collection of canter, accuracy of lines.",
      [half("R", "S", "C"), diag("S", "P")],
      { pace: "canter" },
    ),
    mv(
      25,
      [
        ["P V", "Half circle (20m Ø) in counter canter"],
        ["V E", "Counter canter"],
      ],
      "Quality and collection of counter canter, self-carriage, balance, straightness.",
      [half("P", "V", "A"), line(["V", "E"])],
      { pace: "canter" },
    ),
    mv(
      26,
      [["E", "Simple change of leg"]],
      "Promptness, fluency, and balance of both transitions in the change, 3-5 clear walk steps. Quality of the canter before and after the change.",
      change("E"),
      { pace: "canter", coeff: 2 },
    ),
    mv(
      27,
      [["E S H C", "Collected canter"]],
      "Regularity and quality of canter, uphill tendency, carrying power, collection.",
      line(["E", "S", "H", "C"]),
      { pace: "canter" },
    ),
    mv(
      28,
      [
        ["C", "Collected trot"],
        ["M X K", "Extended trot"],
        ["K", "Collected trot"],
      ],
      "Regularity, elasticity, balance, engagement of hindquarters, overtrack, lengthening of steps and frame. Differentiation from medium trot.",
      [line(["C", "M"]), diag("M", "K")],
      { pace: "extended" },
    ),
    mv(
      29,
      [
        ["C, M and K", "Transitions at C, M and K"],
        ["K A", "Collected trot"],
      ],
      "Maintenance of rhythm, fluency, precise and smooth execution of transitions. Change of frame. Quality of trot.",
      [diag("M", "K"), line(["K", "A"])],
    ),
    mv(
      30,
      [
        ["A", "Down the centre line"],
        ["X", "Halt. Immobility. Salute."],
      ],
      "Quality of paces, halt, and transitions. Straightness. Contact and poll.",
      [line(["A", "X"]), halt("X")],
    ),
  ],
};
