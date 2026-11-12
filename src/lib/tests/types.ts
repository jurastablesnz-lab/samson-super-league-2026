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
      m: 8 | 10 | 12 | 15 | 20;
      side?: "left" | "right";
      /** 10m circle on the same centre as the 20m circle, spanning the quarterlines. */
      betweenQuarterlines?: boolean;
    }
  | {
      t: "half";
      from: string;
      to: string;
      bulge: "C" | "A";
      hand?: "left" | "right";
      /** Way the horse is going on the track as this half circle starts. The arc continues that way. */
      travel?: "A" | "C";
    }
  | { t: "return-half"; from: string; to: string; bulge: "C" | "A" }
  | { t: "loop"; from: string; to: string; insetM?: number }
  | { t: "yield"; from: string; to: string }
  | { t: "halt"; at: string }
  | { t: "stretch"; at: string }
  | { t: "change"; at: string }
  | { t: "change"; from: string; to: string; along: number }
  | { t: "arc"; from: string; to: string; bulge: "C" | "A" }
  | { t: "half-turn"; at: "G"; side: "H" | "M" }
  | { t: "serpentine"; from: "C" | "A"; first: "left" | "right"; loops?: number; to?: "X" }
  | { t: "zigzag"; from: string; to: string; legs: number; sideM: number; start: "left" | "right" }
  | { t: "rein-back"; at: string; steps?: number }
  | { t: "pirouette"; at: string; direction: "left" | "right" }
  | {
      t: "pirouette";
      direction: "left" | "right";
      turn: "half" | "full";
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
  | { line: true; pts: string[] }
  | { line?: false; from: string; to: string }
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
  /** When set, the caller plays this instead of speaking the movement text. */
  audioUrl?: string;
};

export type SetTest = {
  id: string;
  short: string;
  name: string;
  role?: string;
  year: string;
  time: string;
  drawTime: string;
  arena: string;
  /** Which rectangle to draw. Omitted tests follow `arena` (a sheet that names 60m stays 60×20). */
  arenaSize?: "60x20" | "40x20";
  purpose?: string;
  instructions?: string;
  introduces?: string;
  leave?: string;
  movements: Movement[];
  keys?: { move: string; judge: string; school: string }[];
  collectives?: Collective[];
};

export type Collective = { name: string; detail: string; coeff: 1 | 2 };
