# Importing EVO Events results (admin)

`/admin` → **Import results · EVO Events CSV**. Upload the results CSV you download
from EVO Events (one event per file is easiest). The file is parsed in the
browser, matched on the server, and you see a preview before anything is saved.

We did not have a sample export when this was built, so the parser
(`src/lib/evo-csv.ts`) is deliberately tolerant. If a real export doesn't map
cleanly, the preview shows which columns were recognised — add the header to
`ALIASES` in `src/lib/evo-csv.ts` (and a test in `src/lib/evo-csv.test.ts`).

## File format accepted

* **Delimiter**: comma, semicolon or tab (auto-detected from the header line).
* **Quotes**: standard CSV double quotes, `""` escapes, line breaks inside quotes.
* **Preamble**: a UTF-8 BOM and any lines above the header are skipped. The header
  is the first line mentioning horse / rider / competitor / athlete. A preamble
  line like `Event: Taihape Christmas Champs` (or `Show:` / `Competition:`) and a
  date are used for every row when the table has no event/date columns.
  "Exported/downloaded on …" lines are ignored.
* **Headers** are matched case-insensitively ignoring spaces, punctuation, `%`
  and accents:

| Field | Accepted headers (examples) |
|---|---|
| Rider | Rider, Rider Name, Competitor, Athlete, Name, Member — or First Name + Surname/Last Name |
| Horse | Horse, Horse Name, Registered Name, Mount |
| ESNZ number | ESNZ, ESNZ No, ESNZ Number, Horse Reg, Reg No, Registration, Horse ID, FEI ID |
| Event | Event, Show, Competition, Meeting, Venue |
| Date | Date, Event Date, Class Date (d/m/yyyy NZ order, yyyy-mm-dd, `10 May 2026`, `May 10, 2026`) |
| Class | Class, Class Name, Class No, Division, Section |
| Test | Test, Test Name, Dressage Test (falls back to Class) |
| Level | Level, Grade, Class Level |
| Percent | Percent, Percentage, %, Score, Result, Total, Final %, Overall, Average |
| Raw score | Points, Marks + Max/Possible/Out Of (converted to %) |
| Place | Place, Placing, Position, Pos, Rank |
| Status | Status, Outcome |
| Judges | J1 %, J2 %, Judge C, C, E, B, H, M … (kept as a summary; averaged when no overall %) |

* **Percent values**: `64.2`, `64.2%`, `64,2`. `E`/`Elim`/`DQ` → eliminated,
  `WD`/`Ret` → withdrawn/retired, `NS`/`DNS`/`Scr` → no-show. Numbers outside
  0–100 are dropped with a warning.
* Unrecognised columns are stored with the result (`results.raw` jsonb), so
  nothing in the file is lost.

## Matching (server, `src/lib/evo-import.server.ts`)

1. **ESNZ number** — exact after normalising (case, spaces, dashes, leading
   zeros, `ESNZ` prefix). Riders add this per horse on `/join` and in the
   setup wizard.
2. **Horse name + rider name** — accents/punctuation/bracketed suffixes like
   `(NZ)` ignored; `Last, First` works.
3. **Horse name only** — only when the row has no rider and exactly one beta
   horse has that name.

Everyone else in the file (non-beta competitors) is reported as unmatched and
ignored — nothing is guessed. Each saved row gets a dedupe key (event, date,
class/test, percent), so importing the same file twice skips duplicates. Every
import is logged in `result_imports`. Imported results show on the rider's Log
tab with an "EVO import" badge and can't be deleted by the rider.
