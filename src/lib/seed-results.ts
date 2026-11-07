/** Client-safe report from the one-tap beta results import. */

export type SeedUnmatchedRow = {
  line: number;
  horse: string;
  esnz: string;
  rider: string;
  reason: string;
};

export type SeedImportReport = {
  imported: number;
  skipped: number;
  unmatched: number;
  total: number;
  unmatchedRows: SeedUnmatchedRow[];
};
