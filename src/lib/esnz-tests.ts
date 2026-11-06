/** ESNZ Novice (Level 2) tests effective 1/9/2023.
 *  Working sheet for schooling — official ESNZ/USDF sheets take precedence.
 *  Source: ESNZ Novice Tests A–C & FS 2023.
 */

export type Pace =
  "trot" | "medium" | "walk" | "free" | "canter" | "medium-canter" | "yield" | "change";

export type Draw =
  | { t: "line"; pts: string[] }
  | { t: "diag"; from: string; to: string }
  | { t: "circle"; at: string; m: 10 | 15 | 20 }
  | { t: "half"; from: string; to: string; bulge: "C" | "A" }
  | { t: "return-half"; from: string; to: string; bulge: "C" | "A" }
  | { t: "loop"; from: string; to: string }
  | { t: "yield"; from: string; to: string }
  | { t: "halt"; at: string }
  | { t: "stretch"; at: string }
  | { t: "change"; at: string };

export type Step = { at: string; do: string };

export type Movement = {
  n: number;
  coeff?: 2;
  steps: Step[];
  directive: string;
  draw: Draw[];
  pace?: Pace;
};

export type SetTest = {
  id: "2a" | "2b" | "2c";
  short: string;
  name: string;
  role: string;
  year: string;
  time: string;
  drawTime: string;
  arena: string;
  purpose: string;
  introduces: string;
  leave: string;
  movements: Movement[];
  keys: { move: string; judge: string; school: string }[];
};

export type Collective = { name: string; detail: string; coeff: 1 | 2 };

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

export const NOVICE_PURPOSE =
  "To confirm that the horse demonstrates correct basics, and in addition to the requirements of Preliminary Level, has developed the thrust to achieve improved balance and throughness and maintains a more consistent contact with the bit.";

export const NOVICE_INSTRUCTIONS =
  "To be ridden in a snaffle. All trot sitting or rising unless stated otherwise.";

const ENTER: Movement = {
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
        { t: "circle", at: "I", m: 10 },
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
        { t: "circle", at: "I", m: 10 },
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

export const SET_TESTS: SetTest[] = [TEST_2A, TEST_2B, TEST_2C];

export const MFS_SHEET = {
  id: "mfs" as const,
  short: "L2 MFS",
  name: "Novice Freestyle (Level 2)",
  role: "The optional extra",
  year: "ESNZ 2023",
  time: "Finish between 4:00 and 4:30",
  bridle: "Ordinary snaffle",
  arena: "60 × 20",
  purpose:
    "Music from A. Last Super 5 outing it was an elimination — only take it to a show when the file and the floorplan are both quiet.",
  technicalTotal: 120,
  artisticTotal: 120,
  compulsory: [
    { n: 1, move: "Medium walk (min 15m continuous)", coeff: 1, max: 10 },
    { n: 2, move: "Free walk on a long rein (min 20m continuous)", coeff: 1, max: 10 },
    { n: 3, move: "Working trot", coeff: 1, max: 10 },
    { n: 4, move: "Leg yield left working trot", coeff: 1, max: 10 },
    { n: 5, move: "Leg yield right working trot", coeff: 1, max: 10 },
    { n: 6, move: "Trot — lengthened strides (sitting or rising)", coeff: 2, max: 10 },
    { n: 7, move: "Working canter", coeff: 1, max: 10 },
    { n: 8, move: "Canter — lengthened strides", coeff: 1, max: 10 },
    { n: 9, move: "Change of lead through trot left to right", coeff: 1, max: 10 },
    { n: 10, move: "Change of lead through trot right to left", coeff: 1, max: 10 },
    { n: 11, move: "The entrance and halts at beginning and end of test", coeff: 1, max: 10 },
  ],
  artistic: [
    { n: 12, move: "Rhythm, energy and elasticity", coeff: 3, max: 10 },
    { n: 13, move: "Harmony between rider and horse", coeff: 3, max: 10 },
    { n: 14, move: "Choreography. Use of arena. Inventiveness", coeff: 3, max: 10 },
    { n: 15, move: "Choice of music and interpretation of the music", coeff: 3, max: 10 },
  ],
  permitted: [
    "Circles of any size",
    "Free walk on a long rein",
    "Leg yield (walk and trot)",
    "Lengthened strides in trot and canter",
    "Trot serpentine",
    "Give and retake reins",
    "Change of lead through trot (3–5 steps)",
    "Counter canter (straight or curved line)",
    "Reinback",
    "Walk to canter",
    "Trot and canter counter change of hand or zigzag",
  ],
  notPermitted: [
    "Travers",
    "Shoulder-in",
    "Renvers",
    "Turn on the hindquarters or walk pirouettes",
    "Half pass",
    "Canter / working pirouettes (half or full)",
    "Flying changes",
    "Piaffe and passage",
  ],
  penalties:
    "Movements not permitted and shown deliberately: 5 points deducted by each judge from technical execution, and the choreography mark may be no higher than 5.5.",
};

export type TestTabId = "2a" | "2b" | "2c" | "mfs";

export function marksFor(test: SetTest) {
  const tech = test.movements.reduce((n, m) => n + 10 * (m.coeff ?? 1), 0);
  const coll = COLLECTIVES.reduce((n, c) => n + 10 * c.coeff, 0);
  return { tech, coll, total: tech + coll };
}
