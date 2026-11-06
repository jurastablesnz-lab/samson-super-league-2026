# Importing EVO Events results (admin)

`/admin` → **Import results · EVO Events CSV**. Upload the results CSV you download
from EVO Events (one event per file is easiest). The file is parsed in the
browser, matched on the server, and you see a preview before anything is saved.
Matched scores are **pending suggestions**, sent to the horse's owner for review;
they do not immediately become part of that horse's results.

We did not have a sample export when this was built, so the parser
(`src/lib/evo-csv.ts`) is deliberately tolerant. If a real export doesn't map
cleanly, the preview shows which columns were recognised — add the header to
`ALIASES` in `src/lib/evo-csv.ts` (and a test in `src/lib/evo-csv.test.ts`).

## File format accepted

- **Delimiter**: comma, semicolon or tab (auto-detected from the header line).
- **Quotes**: standard CSV double quotes, `""` escapes, line breaks inside quotes.
- **Preamble**: a UTF-8 BOM and any lines above the header are skipped. The header
  is the first line mentioning horse / rider / competitor / athlete. A preamble
  line like `Event: Taihape Christmas Champs` (or `Show:` / `Competition:`) and a
  date are used for every row when the table has no event/date columns.
  "Exported/downloaded on …" lines are ignored.
- **Headers** are matched case-insensitively ignoring spaces, punctuation, `%`
  and accents:

| Field       | Accepted headers (examples)                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| Rider       | Rider, Rider Name, Competitor, Athlete, Name, Member — or First Name + Surname/Last Name    |
| Horse       | Horse, Horse Name, Registered Name, Mount                                                   |
| ESNZ number | ESNZ, ESNZ No, ESNZ Number, Horse Reg, Reg No, Registration, Horse ID, FEI ID               |
| Event       | Event, Show, Competition, Meeting, Venue                                                    |
| Date        | Date, Event Date, Class Date (d/m/yyyy NZ order, yyyy-mm-dd, `10 May 2026`, `May 10, 2026`) |
| Class       | Class, Class Name, Class No, Division, Section                                              |
| Test        | Test, Test Name, Dressage Test (falls back to Class)                                        |
| Level       | Level, Grade, Class Level                                                                   |
| Percent     | Percent, Percentage, %, Score, Result, Total, Final %, Overall, Average                     |
| Raw score   | Points, Marks + Max/Possible/Out Of (converted to %)                                        |
| Place       | Place, Placing, Position, Pos, Rank                                                         |
| Status      | Status, Outcome                                                                             |
| Judges      | J1 %, J2 %, Judge C, C, E, B, H, M … (kept as a summary; averaged when no overall %)        |

- **Percent values**: `64.2`, `64.2%`, `64,2`. `E`/`Elim`/`DQ` → eliminated,
  `WD`/`Ret` → withdrawn/retired, `NS`/`DNS`/`Scr` → no-show. Numbers outside
  0–100 are dropped with a warning.
- Unrecognised columns are stored with the result (`results.raw` jsonb), so
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
import is logged in `result_imports`.

## Rider review

The rider opens their horse's **Log** tab. Under **Found on EVO Events**, every
pending score shows its date, competition, test/class, percentage or status,
placing, and the rider name from the file. All scores start selected. The rider
can untick individual scores or use **Select all**, then:

- **Keep selected** moves those scores into the horse's normal results. They
  appear below with an "EVO import" badge, use `source = 'evo_csv'`, and count
  towards the horse's best score.
- **Not mine** rejects the selected scores. If the horse had another rider
  before them, the rider unticks that rider's scores before keeping the rest, or
  selects them and chooses **Not mine**. Rejected scores stay hidden.

Both actions are server-side and require beta access plus ownership of the
horse. Only pending `evo_csv` rows belonging to that horse and user can change.
Pending and rejected scores never appear in the normal results or best score.

`results.review_status` is `pending`, `kept` or `rejected`. Migration
`0005_evo_result_review.sql` adds it with a default of `kept`, so results
imported before that migration remain visible and need no data reset. Rejected
rows keep their original horse and dedupe key; the unique
`results_horse_dedupe_uidx` constraint therefore stops a later import from
re-suggesting them. The CSV rider name is stored separately in `rider_name`.

Run `npx tsc --noEmit` and `npm test` after changes. The review integration test
uses an in-memory PGLite database and applies all numbered migrations.

## Rider self-import

A rider can open their horse's **Log** tab and use **Bring in my EVO results**.
They sign in to EVO Events themselves, select and copy their horse's results
table, and paste it into the box. XSalute does not access EVO or the rider's EVO
account. `src/lib/evo-paste.ts` accepts the copied nine-column EVO table
(Date, Event, Discipline, Rider, Class, Level/Type, Place, Result, Detail) or
the existing CSV format. It reassembles cells wrapped across physical lines.

The preview reports the number of dressage scores, date range and rider names.
Eliminated, blank-result, cancelled and non-dressage informational rows are
skipped; Para and Para Equestrian dressage results are retained. **Send to
review** inserts up to 500 rows for that signed-in rider's chosen horse only,
without matching any other user. The server checks beta access and ownership,
then creates pending `evo_csv` suggestions with the same dedupe key as the admin
import. Already pending, kept or rejected rows are skipped. No schema change is
needed.
