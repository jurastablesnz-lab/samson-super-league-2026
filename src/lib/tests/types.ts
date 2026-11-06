export type Pace =
  | "trot"
  | "medium"
  | "extended"
  | "walk"
  | "free"
  | "canter"
  | "medium-canter"
  | "extended-canter"
  | "yield"
  | "change";

export type Draw =
  | { t: "line"; pts: string[] }
  | { t: "diag"; from: string; to: string }
  | {
      t: "circle";
      at: string;
      m: 10 | 15 | 20;
      side?: "left" | "right";
      /** 10m circle on the same centre as the 20m circle, spanning the quarterlines. */
      betweenQuarterlines?: boolean;
    }
  | { t: "half"; from: string; to: string; bulge: "C" | "A" }
  | { t: "return-half"; from: string; to: string; bulge: "C" | "A" }
  | { t: "loop"; from: string; to: string; insetM?: number }
  | { t: "yield"; from: string; to: string }
  | { t: "halt"; at: string }
  | { t: "stretch"; at: string }
  | { t: "change"; at: string }
  | { t: "change"; from: string; to: string; along: number }
  | { t: "arc"; from: string; to: string; bulge: "C" | "A" }
  | { t: "half-turn"; at: "G"; side: "H" | "M" }
  | { t: "serpentine"; from: "C" | "A"; first: "left" | "right" }
  | { t: "rein-back"; at: string }
  | { t: "pirouette"; at: string; direction: "left" | "right" }
  | {
      t: "pirouette";
      direction: "left" | "right";
      turn: "half";
      from: string;
      to: string;
      along: number;
      diameterM?: number;
    }
  | {
      t: "pirouette";
      direction: "left" | "right";
      turn: "quarter";
      at: string;
      from: string;
      aim: string;
    };

export type LateralKind = "shoulder-in" | "travers" | "renvers" | "half-pass" | "leg-yield";
export type LateralDirection = "left" | "right";
export type Lateral = { kind: LateralKind; direction: LateralDirection } & (
  { line: true; pts: string[] } | { line?: false; from: string; to: string }
);

export type Step = { at: string; do: string };

export type Movement = {
  n: number;
  coeff?: 2;
  steps: Step[];
  directive: string;
  draw: Draw[];
  pace?: Pace;
  lateral?: Lateral;
};

export type SetTest = {
  id: `${number}${"a" | "b" | "c" | "d"}`;
  short: string;
  name: string;
  role?: string;
  year: string;
  time: string;
  drawTime: string;
  arena: string;
  purpose?: string;
  instructions?: string;
  introduces?: string;
  leave?: string;
  movements: Movement[];
  keys?: { move: string; judge: string; school: string }[];
  collectives?: Collective[];
};

export type Collective = { name: string; detail: string; coeff: 1 | 2 };
