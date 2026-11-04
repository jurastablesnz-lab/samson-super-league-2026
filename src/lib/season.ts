import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

export const FREESTYLE = {
  src: "/audio/samson-l2-mfs.mp3",
  title: "Level 2 freestyle",
  horse: "Jura Samson",
  series: "Zilco musical freestyle",
  timeAllowed: "4:00–4:30",
  duration: 297.64,
};

export const PAIR = {
  series: "North Island Super 5",
  horse: "Samson",
  registered: "Jura Samson",
  level: "Level 2 Novice",
  school: "Medium",
  line: "14 · black stationbred · Tiraumea Flint",
};

export const RESULTS_NOTE =
  "Official EvoEvents record (horse 2147389326). Fifteen Level 2 percentages on the board. Personal best 66.2% — 2B at Horowhenua Winter Series, May 2023. Last Super 5 2B was 62.7% at DCD Premier League, October 2025.";

export const TODAY = nzDay(new Date());

function nzDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return parseISO(`${pick("year")}-${pick("month")}-${pick("day")}`);
}

export type Kind = "school" | "test" | "coach" | "show" | "travel" | "rest";

export function kindLabel(kind: Kind) {
  switch (kind) {
    case "coach":
      return "Coach";
    case "show":
      return "Show";
    case "travel":
      return "Travel";
    case "rest":
      return "Rest";
    case "test":
      return "Test";
    default:
      return "School";
  }
}

export type Session = {
  id: string;
  day: string;
  title: string;
  focus: string;
  kind: Kind;
  minutes: number;
  how: string[];
  note?: string;
};

export type Show = {
  id: string;
  short: string;
  start: string;
  end: string;
  venue: string;
  optional?: boolean;
  dateNote: string;
  travel: string;
  stay: string;
  goal: string;
  tests: string[];
  notes: string[];
  /** Usual Evo Events close — Wednesday ~3 weeks out. Confirm on the schedule. */
  entriesClose: string;
  entriesCloseNote?: string;
};

export const SHOWS: Show[] = [
  {
    id: "bop",
    short: "BOP",
    start: "2026-10-24",
    end: "2026-10-25",
    venue: "Fiber Fresh NEC, Taupō",
    dateNote:
      "Dressage Bay of Plenty Premier League at Taupō NEC. Official window 24–25 October. Confirm classes on Evo Events.",
    travel: "About three hours from the Manawatū. Leave the afternoon before.",
    stay: "One night in Taupō. Yards at the NEC if they still run them.",
    goal: "First Super 5 2B of the season. A clean 64% is a win. Do not chase 70 on day one.",
    tests: ["2B Super 5", "2C", "L2 MFS if the music is ready"],
    entriesClose: "2026-09-30",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "2B from memory. Walk the arena the evening before.",
      "No Medium in the ten days before.",
      "Film the 2B warm-up and the test.",
      "NHB is two weeks later. One Super 5, not two, if his back is talking.",
    ],
  },
  {
    id: "nhb",
    short: "Nth Hawkes Bay",
    start: "2026-11-07",
    end: "2026-11-08",
    venue: "Hastings A&P",
    dateNote:
      "Dressage Northern Hawkes Bay Premier League at Hastings A&P. Super 5. Confirm the class on Evo Events — entries are not up yet.",
    travel: "About 2 hours 15 from the Manawatū via SH2. Early start if you day-trip.",
    stay: "Optional one night in Hastings if the draw is early. Yards at the A&P if they still run them.",
    goal: "A counting score two weeks after BOP. Same 2B. Skip this if Taupō took a lot out of him.",
    tests: ["2B Super 5", "2C"],
    entriesClose: "2026-10-14",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "This is Super 5. Dressage NHB at Hastings A&P — not eventing NHB.",
      "Two weeks after BOP. Do not stack both unless he is travelling well.",
      "Coach visit is 4 Nov — that sits between them. Use it as the last school, not a new programme.",
    ],
  },
  {
    id: "akl",
    short: "Auckland",
    start: "2026-11-22",
    end: "2026-11-23",
    venue: "Pukekohe",
    dateNote: "Longest haul. Confirm the venue and the Super 5 class number on Evo Events.",
    travel: "About 7 hours. Split the drive if the truck feels like it.",
    stay: "Two nights. He needs a walk and a pick of grass on arrival, not a test off the ramp.",
    goal: "Second counting score. Same 2B, better accuracy.",
    tests: ["2B Super 5", "2C"],
    entriesClose: "2026-10-28",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "Debrief from BOP (and NHB if you went) sits in the 4 Nov coach visit — do not invent a new 2B at home.",
      "Freestyle only if the file is inside 4:00–4:30.",
    ],
  },
  {
    id: "wko",
    short: "Waikato",
    start: "2026-12-06",
    end: "2026-12-06",
    venue: "Mystery Creek, Hamilton",
    dateNote: "Day-trip range. Confirm on Evo Events — this one often runs a single Super 5 day.",
    travel: "About 2.5 hours. Early start, home the same night if he is settled.",
    stay: "Optional one night if the class is late or the weather turns.",
    goal: "Third counting score before Christmas. Keep him generous, not tired.",
    tests: ["2B Super 5"],
    entriesClose: "2026-11-18",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "Coach training peak is 5–6 Dec. If your coach is there, the show is the gymnastic.",
      "Taihape is two weeks later. Do not school 2B every day in between.",
    ],
  },
  {
    id: "taihape",
    short: "Taihape",
    start: "2026-12-19",
    end: "2026-12-20",
    venue: "Taihape A&P Showgrounds",
    dateNote:
      "Dressage Taihape Christmas Champs — Super 5 Premier League. Official window 19–20 December. Confirm the Super 5 class on Evo Events.",
    travel: "About an hour 20 from the Manawatū up SH1. Day-trip is realistic.",
    stay: "Optional one night in Taihape if the draw is early. Grounds are walking distance of town.",
    goal: "Fourth counting score before Christmas. Same 2B. Keep him generous — last one until January.",
    tests: ["2B Super 5", "2C", "L2 MFS if the music is ready"],
    entriesClose: "2026-11-25",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "This is Super 5. Dressage Taihape Christmas Champs — not the February jumping show.",
      "Two weeks after Waikato. Stretch and one 2B from memory, not a new programme.",
      "Walk the arena. The A&P rides different to home.",
    ],
  },
  {
    id: "taranaki",
    short: "Taranaki",
    start: "2027-01-09",
    end: "2027-01-10",
    venue: "Egmont A&P, Hawera",
    dateNote:
      "Yes — Taranaki is Super 5. Dressage Taranaki Premier League at Egmont A&P. Last season was 10 January 2026. Confirm the 2027 Super 5 class on Evo Events.",
    travel: "About 1 hour 45 from the Manawatū via SH3. Day-trip is realistic.",
    stay: "Optional one night in Hawera if the draw is early. Indoor and yards at Egmont if you stay on the grounds.",
    goal: "A counting score without the long haul. Same 2B. Do not stack this and CD unless he is travelling well.",
    tests: ["2B Super 5", "2C"],
    entriesClose: "2026-12-16",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "This is Super 5. It always has been.",
      "A week before Central Districts — pick one if his back is talking.",
      "Walk the indoor if they use it. Surface can ride different to home.",
    ],
  },
  {
    id: "cd",
    short: "Central Dist",
    start: "2027-01-16",
    end: "2027-01-17",
    venue: "Feilding",
    dateNote: "Home turf. Still confirm the Super 5 class — local shows move rooms.",
    travel: "Twenty minutes. Treat it like a show, not a school.",
    stay: "Home. Arrive with time to walk the arena.",
    goal: "Home-turf counting score. This is the one that should feel ordinary.",
    tests: ["2B Super 5", "2C"],
    entriesClose: "2026-12-23",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "Do not over-school in the home arena the morning of.",
      "Same warm-up as Taupō so the test feels familiar.",
      "A week after Taranaki. If you already have a January score, this is the one you can skip.",
    ],
  },
  {
    id: "wlg",
    short: "Wellington",
    start: "2027-02-06",
    end: "2027-02-07",
    venue: "QEII Park, Kapiti",
    dateNote: "Last Super 5 before Nationals. Confirm on Evo Events.",
    travel: "About two hours. Day-trip is fine if the class is not first thing.",
    stay: "Optional one night at the coast if the draw is early.",
    goal: "Fifth counting score. A 65% here makes the league average honest.",
    tests: ["2B Super 5"],
    entriesClose: "2027-01-13",
    entriesCloseNote: "Usual 5pm on Evo Events — confirm on the schedule.",
    notes: [
      "Medium stays parked.",
      "Nationals entries close around this window — check ESNZ, not memory.",
    ],
  },
  {
    id: "nats",
    short: "Nationals",
    start: "2027-03-12",
    end: "2027-03-14",
    venue: "Taupō",
    optional: true,
    dateNote: "Locked: 12–14 March 2027, Taupō.",
    travel: "About three hours. Leave Thursday.",
    stay: "Three nights. He walks every evening. You do not school 2B on the Thursday.",
    goal: "Ride the test you have. No new tricks in the warm-up box.",
    tests: ["2B", "2C", "L2 MFS if qualified"],
    entriesClose: "2027-02-17",
    entriesCloseNote: "Confirm close date on ESNZ and Evo Events — Nationals fills early.",
    notes: [
      "Championship phase is light Medium and 2B from memory twice a week.",
      "Protect the back. He is 14.",
    ],
  },
];

export const SUPER5_POINTS = [
  { min: 70, label: "70%", pts: 10 },
  { min: 65, label: "65%", pts: 7 },
  { min: 60, label: "60%", pts: 5 },
  { min: 55, label: "55%", pts: 3 },
] as const;

export function pointsForPercent(percent: number) {
  for (const band of SUPER5_POINTS) {
    if (percent >= band.min) return band.pts;
  }
  return 0;
}

export type Phase = {
  id: string;
  name: string;
  start: string;
  end: string;
  intent: string;
  schoolAbove: string;
};

export const PHASES: Phase[] = [
  {
    id: "foundation",
    name: "Foundation",
    start: "2026-09-14",
    end: "2026-10-17",
    intent: "Get him in front of the leg again. 2C as the homework test. Medium three times a week.",
    schoolAbove: "4B transitions, simple changes, stretch circle",
  },
  {
    id: "consolidate",
    name: "Consolidate",
    start: "2026-10-18",
    end: "2026-12-21",
    intent: "Super 5s through to Taihape. Keep Medium, add collected canter and simple changes as the gymnastic.",
    schoolAbove: "4B + simple changes + collected canter",
  },
  {
    id: "strength",
    name: "Strength",
    start: "2026-12-22",
    end: "2027-02-05",
    intent: "Holiday rest, then Taranaki and/or CD, then Wellington. Medium stays. Do not start 4B as a competing test.",
    schoolAbove: "maintain Medium, no competing 4B",
  },
  {
    id: "championship",
    name: "Championship",
    start: "2027-02-06",
    end: "2027-03-14",
    intent: "Wellington, then Nationals. School Medium lightly. Test 2B from memory twice a week.",
    schoolAbove: "light Medium only",
  },
];

export const PRINCIPLES = [
  {
    title: "School above the test",
    body: "Medium work makes 2B feel ordinary. Park it ten days before a Super 5.",
  },
  {
    title: "Accuracy is cheap points",
    body: "Letters, centre line, halt. The stretch circle is the expensive one.",
  },
  {
    title: "Protect the back",
    body: "He is 14. Walk breaks are the work. Soreness is a stop, not a mood.",
  },
  {
    title: "One job per ride",
    body: "2B or Medium, not both. Freestyle lives in the last three minutes of a stretch day.",
  },
];

export const LEVEL4 = [
  {
    title: "Simple changes",
    why: "Balance through the change is what makes 2B canter feel easy.",
    how: "Prepare three strides. Change, walk three, change. Quit while he is still thinking forward.",
  },
  {
    title: "Collected canter",
    why: "Collection at Medium is the gymnastic. You are not competing 4B.",
    how: "20m circle, sit, half-halt, a few steps, send on. If he gets tight, stretch and finish.",
  },
  {
    title: "4B transitions",
    why: "Walk–canter–walk keeps the hind leg under him for the 2B corners.",
    how: "From a walk that is already marching. No jig. If it gets ugly, trot and start again.",
  },
  {
    title: "Stretch circle at Medium",
    why: "The 2B stretch circle is the high coefficient. He has to seek the contact, not duck.",
    how: "Give both reins, keep the leg, count six strides, retake. Long and low is not behind the bit.",
  },
];

export type CoachVisit = {
  id: string;
  dates: string[];
  title: string;
  subtitle: string;
  agenda: { title: string; detail: string }[];
  film: string;
  homework: string[];
  doNot: string[];
};

export const COACH: CoachVisit[] = [
  {
    id: "oct",
    dates: ["2026-10-14"],
    title: "14 Oct — First visit — polish",
    subtitle: "2B + 2C as they are, then the Medium work that will lift them.",
    agenda: [
      {
        title: "Warm-up",
        detail: "Let your coach see him as he is. 10 minutes. Film the whole ride.",
      },
      {
        title: "2B from memory",
        detail: "Ride it once, then the corners and the stretch circle again. Ask what your coach would change before Super 5 1.",
      },
      {
        title: "2C school",
        detail: "The test you will keep riding at home. Accuracy over expression.",
      },
      {
        title: "Medium gymnastic",
        detail: "Simple changes, collected canter, 4B transitions. This is the point of the visit.",
      },
    ],
    film: "Whole 2B, the stretch circle, both simple changes, one collected canter.",
    homework: [
      "Ride 2C twice before BOP.",
      "One 2B from memory midweek, not the day after your coach comes.",
      "Medium three times a week until ten days out from Tauranga.",
    ],
    doNot: [
      "A fourth programme the next morning.",
      "A new bit.",
      "Schooling 4B as a test.",
    ],
  },
  {
    id: "nov",
    dates: ["2026-11-04"],
    title: "4 Nov — Second visit — debrief",
    subtitle: "BOP is done. Watch the film with your coach. Change one thing, not five.",
    agenda: [
      {
        title: "The test film",
        detail: "What the judges marked versus what your coach saw. Stretch circle, medium trot, the halt.",
      },
      {
        title: "The warm-up",
        detail: "If Tauranga ran long or got tight, fix the warm-up, not the test.",
      },
      {
        title: "One Medium correction",
        detail: "Whatever leaked in the 2B — usually the canter or the stretch — school it above the level.",
      },
    ],
    film: "The BOP 2B, plus one homework 2C from the week after.",
    homework: [
      "If you go to NHB, this visit is the last school — do not invent a new 2B.",
      "If you skip Hastings, the one correction three times a week until Auckland.",
      "Park Medium ten days out from Pukekohe either way.",
    ],
    doNot: [
      "A new floorplan for 2B.",
      "Chasing 70% with more collection.",
      "Riding him into the ground because Auckland is a long drive.",
    ],
  },
  {
    id: "dec",
    dates: ["2026-12-05", "2026-12-06"],
    title: "5–6 Dec — Third visit — training peak",
    subtitle: "Two days. Fitness, Medium, then Waikato if the draw works. Then he gets Christmas.",
    agenda: [
      {
        title: "Saturday — gymnastic",
        detail: "Simple changes, collected canter, stretch. This is the last big Medium block before the holiday.",
      },
      {
        title: "Sunday — the test or the show",
        detail: "If Waikato is that day, your coach watches the Super 5. If not, ride 2B from memory once and finish.",
      },
    ],
    film: "Saturday’s simple changes and Sunday’s 2B. That is the Christmas homework.",
    homework: [
      "Holiday rest after Taihape. Paddock, walks, one stretch ride a week if he asks for it.",
      "Pick up 2C in the first week of January, not on New Year’s Day.",
      "Taranaki is the first weekend back — do not over-school in the holiday.",
    ],
    doNot: [
      "A January clinic because you feel behind.",
      "Starting 4B as a competing test.",
      "Drilling 2B every day after Mystery Creek.",
    ],
  },
];

export const PACK = [
  {
    id: "horse",
    title: "Horse",
    items: [
      "Bridle + spare snaffle",
      "Saddle, two numnahs, girth",
      "Boots / bandages",
      "Fly spray, sponge, sweat scraper",
      "Quarter markers, plaiting kit",
      "Cooler and rug for the weather",
    ],
  },
  {
    id: "rider",
    title: "Rider",
    items: [
      "Jacket, hat, gloves",
      "Stock or tie, hairnet",
      "White breeches, boots",
      "Spare shirt",
      "Sunscreen, water, something to eat",
    ],
  },
  {
    id: "truck",
    title: "Truck",
    items: ["Hay and haynets", "Water and buckets", "First aid", "Shovel, fork, manure bag", "Lead, spare halter"],
  },
  {
    id: "paper",
    title: "Paper",
    items: [
      "ESNZ membership + horse rego",
      "Entry confirmation",
      "Printed 2B and 2C",
      "Bridle number",
      "Coach notes from the last visit",
    ],
  },
];

export const TEST_OPTIONS = ["2B Super 5", "2A", "2B", "2C", "L2 MFS", "Other"] as const;

export type TestSheet = {
  id: string;
  name: string;
  role: string;
  time: string;
  purpose: string;
  keys: { move: string; judge: string; school: string }[];
};

export const TESTS: TestSheet[] = [
  {
    id: "2a",
    name: "Novice 2A",
    role: "The other novice test",
    time: "ESNZ 2024 Novice 2A · ~5:00",
    purpose: "Accuracy and a clean stretch. Ride it at home when 2B is stale, not as a Super 5 substitute.",
    keys: [
      {
        move: "Halt at C / A",
        judge: "Immobility, straightness, square",
        school: "Walk the last three steps. Do not collapse into the halt.",
      },
      {
        move: "20m circles",
        judge: "Geometry, bend, regularity",
        school: "Letter to letter. If the circle is egg-shaped the mark is gone before the stretch.",
      },
      {
        move: "Stretchy circle",
        judge: "Horse stretching forward and downward",
        school: "Same rule as 2B. He seeks the contact. You do not throw the reins.",
      },
      {
        move: "Medium trot",
        judge: "Moderate lengthening, regularity",
        school: "Up and out, not faster. Half-halt before the letter.",
      },
    ],
  },
  {
    id: "2b",
    name: "Novice 2B",
    role: "The one that counts",
    time: "ESNZ 2024 Novice 2B · ~5:00",
    purpose: "North Island league test. Ridden from memory. Highest coefficient is the stretchy circle.",
    keys: [
      {
        move: "Stretchy circle 20m",
        judge: "Horse stretching forward and downward",
        school: "Long and low is not the same as behind the bit. He has to seek the contact.",
      },
      {
        move: "Medium trot",
        judge: "Moderate lengthening, regularity",
        school: "Think up and out, not faster. Half-halt before the letter.",
      },
      {
        move: "Give and retake",
        judge: "Both reins, horse stays in self-carriage",
        school: "Don't throw the reins. Soften for two steps, retake.",
      },
      {
        move: "Transitions",
        judge: "Balance, promptness",
        school: "Prepare three strides out. The mark is the transition, not the pace after it.",
      },
    ],
  },
  {
    id: "2c",
    name: "Novice 2C",
    role: "The homework test",
    time: "ESNZ 2024 Novice 2C · ~5:00",
    purpose: "The school test. Ride it from the sheet at home until the letters are boring. Super 5 2B is ridden from memory.",
    keys: [
      {
        move: "Letters and centre line",
        judge: "Accuracy, straightness",
        school: "Pick a letter, ride to it. Cheap points. This is why 2C is the homework.",
      },
      {
        move: "10m / smaller circles",
        judge: "Balance, bend, geometry",
        school: "Sit, half-halt, then the circle. If he falls in, too much hand.",
      },
      {
        move: "Medium canter",
        judge: "Lengthening, regularity, transitions",
        school: "Same as the trot — up and out. Come back before the corner, not in it.",
      },
      {
        move: "Stretchy circle",
        judge: "Forward and downward, contact kept",
        school: "If 2C stretch is honest, 2B stretch is available on the day.",
      },
    ],
  },
  {
    id: "mfs",
    name: "Level 2 musical freestyle",
    role: "The optional extra",
    time: "Zilco L2 MFS · finish 4:00–4:30",
    purpose: "Music from A. Last Super 5 outing it was an elimination — only take it to a show when the file and the floorplan are both quiet.",
    keys: [
      {
        move: "Time window",
        judge: "Penalties outside 4:00–4:30",
        school: "The current file runs long. If the extra is silence, trim it before BOP.",
      },
      {
        move: "Enter on the music",
        judge: "First halt and salute on the phrase",
        school: "Walk a practice enter at home with the player. Do not guess in the box.",
      },
      {
        move: "Artistic marks",
        judge: "Music, interpretation, choreography",
        school: "He has to look like the music, not just survive it. Stretch where the phrase breathes.",
      },
      {
        move: "Technical floorplan",
        judge: "Required movements at Novice",
        school: "Put the hard stuff where he is still fresh. Finish in halt, not a scramble.",
      },
    ],
  },
];

export type Week = {
  id: string;
  label: string;
  headline: string;
  caution?: string;
  sessions: Session[];
};

const HOW = {
  rest: [
    "Paddock time. Hand-graze if the weather is ugly.",
    "Run a hand down his back and stifles. Soreness is a stop.",
    "No arena unless he is climbing the gate.",
  ],
  stretch: [
    "15 min walk, long and low",
    "10 min stretchy trot, both reins",
    "Walk on a long rein until he sighs",
    "No Medium, no 2B",
  ],
  medium: [
    "Walk until he is marching.",
    "Trot until he is in front of the leg.",
    "Simple changes each way. Collected canter on a 20m.",
    "Finish long and low. Quit while he is still generous.",
  ],
  twoC: [
    "Ride 2C from the sheet once.",
    "Then the errors only — letters and the stretch.",
    "Stop while he is still generous.",
  ],
  twoB: [
    "No sheet. From A.",
    "If you blank, keep riding. Memory is the test.",
    "Film if you can. One 2B, not three.",
  ],
  coach: [
    "Arrive with time to walk.",
    "Film the whole ride.",
    "Write the coach's homework down before you drive home. Do not invent a fourth programme in the morning.",
  ],
  show: [
    "Walk the arena the evening before if you can.",
    "Same warm-up every Super 5.",
    "2B from memory. One test, then he is done.",
  ],
  travel: [
    "Hay in the truck. Water at every stop on the long hauls.",
    "Walk him on arrival. Pick of grass. No test off the ramp.",
  ],
};

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function session(
  day: string,
  kind: Kind,
  title: string,
  focus: string,
  minutes: number,
  how: string[],
  note?: string,
): Session {
  return { id: `${day}-${kind}-${title}`, day, title, focus, kind, minutes, how, note };
}

function showOn(day: string) {
  return SHOWS.find((s) => s.start <= day && day <= s.end);
}

function coachOn(day: string) {
  return COACH.find((c) => c.dates.includes(day));
}

function daysToNextShow(day: string) {
  const upcoming = SHOWS.filter((s) => s.start >= day);
  if (upcoming.length === 0) return 999;
  return differenceInCalendarDays(parseISO(upcoming[0].start), parseISO(day));
}

function defaultFor(dayDate: Date, phase: Phase): Session {
  const day = iso(dayDate);
  const dow = dayDate.getDay();
  const parkMedium = daysToNextShow(day) <= 10 && !SHOWS.some((s) => s.optional && s.start === day);

  if (dow === 0) {
    return session(day, "rest", "Rest / paddock", "Let him be a horse.", 0, HOW.rest);
  }
  if (dow === 1) {
    return session(day, "test", "2C accuracy", "Homework test from the sheet.", 40, HOW.twoC);
  }
  if (dow === 2 || dow === 4) {
    if (parkMedium || phase.id === "championship") {
      return session(day, "school", "Stretch & walk", "Medium is parked this close to a show.", 40, HOW.stretch);
    }
    return session(
      day,
      "school",
      "Medium school",
      phase.id === "foundation" ? "In front of the leg, then 4B transitions." : "Simple changes and collected canter.",
      45,
      HOW.medium,
    );
  }
  if (dow === 3 || dow === 5) {
    return session(day, "school", "Stretch & walk", "Long and low. No 2B.", 40, HOW.stretch);
  }
  return session(day, "test", "2B from memory", "The league test. One time through.", 35, HOW.twoB);
}

function headlineFor(weekStart: Date, phase: Phase, sessions: Session[]): string {
  const show = sessions.find((s) => s.kind === "show");
  const coach = sessions.find((s) => s.kind === "coach");
  const travel = sessions.find((s) => s.kind === "travel");
  if (show) return `${show.title}`;
  if (coach) return "Coach week — ride the plan, then leave it";
  if (travel) return "Travel day. He walks on arrival.";
  if (phase.id === "foundation") return "Quiet week — 2C as homework, Medium three times";
  if (phase.id === "championship") return "Light Medium, 2B from memory twice";
  if (phase.id === "strength") return "Keep Medium. Do not start competing 4B.";
  return "Four Super 5s in this phase — keep him generous";
}

function cautionFor(sessions: Session[], weekStart: string): string | undefined {
  const nearest = daysToNextShow(weekStart);
  if (sessions.some((s) => s.kind === "show")) return "One job: the test you came for. Then rest.";
  if (nearest <= 10 && nearest >= 0) return "Medium is parked. Stretch, 2C, one 2B from memory.";
  return undefined;
}

export const WEEKS: Week[] = buildWeeks();

function buildWeeks(): Week[] {
  const start = startOfWeek(parseISO("2026-09-14"), { weekStartsOn: 0 });
  const end = parseISO("2027-03-21");
  const weeks: Week[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    const sessions = days.map((d) => overlay(d));
    const phase = phaseFor(days[0]);
    const label = `${format(days[0], "d MMM")} – ${format(days[6], "d MMM")}`;
    const caution = cautionFor(sessions, iso(days[0]));
    weeks.push({
      id: iso(days[0]),
      label,
      headline: headlineFor(days[0], phase, sessions),
      caution,
      sessions,
    });
  }
  return weeks;
}

function overlay(dayDate: Date): Session {
  const day = iso(dayDate);
  const show = showOn(day);
  const coach = coachOn(day);
  const tomorrow = iso(addDays(dayDate, 1));
  const yesterday = iso(addDays(dayDate, -1));
  const showTomorrow = showOn(tomorrow);
  const showYesterday = showOn(yesterday);
  const phase = phaseFor(dayDate);

  if (show) {
    return session(
      day,
      "show",
      show.short,
      show.goal,
      0,
      HOW.show,
      show.tests.join(" · "),
    );
  }
  if (showTomorrow && (showTomorrow.id === "bop" || showTomorrow.id === "akl" || showTomorrow.id === "nats")) {
    return session(day, "travel", `Travel to ${showTomorrow.short}`, showTomorrow.travel, 0, HOW.travel);
  }
  if (showYesterday) {
    return session(day, "rest", "Rest after the show", "Paddock. Feel his back. No arena.", 0, HOW.rest);
  }
  if (coach && !show) {
    return session(
      day,
      "coach",
      coach.title.split("—")[1]?.trim() ?? coach.title,
      coach.subtitle,
      60,
      HOW.coach,
    );
  }
  return defaultFor(dayDate, phase);
}

export function phaseFor(date: Date | string): Phase {
  const key = typeof date === "string" ? date : iso(startOfDay(date));
  return PHASES.find((p) => p.start <= key && key <= p.end) ?? PHASES[0];
}

export function weekFor(date: Date): Week {
  const id = iso(startOfWeek(date, { weekStartsOn: 0 }));
  return WEEKS.find((w) => w.id === id) ?? WEEKS[WEEKS.length - 1] ?? WEEKS[0];
}

export function nextShow(): Show | undefined {
  const key = iso(TODAY);
  return SHOWS.find((s) => s.end >= key);
}

export function nextCoach(): CoachVisit | undefined {
  const key = iso(TODAY);
  return COACH.find((c) => c.dates[c.dates.length - 1] >= key);
}

export function daysUntil(isoDate: string) {
  return differenceInCalendarDays(parseISO(isoDate), TODAY);
}

export type EntriesKind = "open" | "soon" | "today" | "closed";

export function entriesState(show: Show) {
  const days = daysUntil(show.entriesClose);
  const when = format(parseISO(show.entriesClose), "d MMM");
  const note = show.entriesCloseNote ?? "Confirm on Evo Events";
  if (days < 0) {
    return { kind: "closed" as EntriesKind, days, when, headline: "Closed", detail: `Closed ${when}` };
  }
  if (days === 0) {
    return { kind: "today" as EntriesKind, days, when, headline: "Today", detail: note };
  }
  if (days <= 7) {
    return {
      kind: "soon" as EntriesKind,
      days,
      when,
      headline: days === 1 ? "Tomorrow" : `${days} days`,
      detail: `${when} · ${note}`,
    };
  }
  return {
    kind: "open" as EntriesKind,
    days,
    when,
    headline: `${days} days`,
    detail: `${when} · ${note}`,
  };
}
