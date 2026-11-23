/** Client-safe Coach Portal shapes. No database and no secrets. */

export const COACH_SCOPE_IDS = ["plan", "results", "judges", "notes", "visits", "videos"] as const;
export type CoachScope = (typeof COACH_SCOPE_IDS)[number];
export type CoachScopes = Record<CoachScope, boolean>;

export const COACH_SCOPE_LABELS: Record<CoachScope, string> = {
  plan: "Season plan and ticks",
  results: "Scores and results",
  judges: "Judges' work-ons",
  notes: "Ride notes",
  visits: "Coach visits",
  videos: "Videos",
};

export type CoachOfferingKind = "weekly_check_in" | "ride_reviews" | "lessons" | "other";

export type CoachOffering = {
  id: string;
  kind: CoachOfferingKind;
  label: string;
  detail: string;
  perMonth: number | null;
};

export type CoachSubscriptionStatus = "none" | "comp" | "active" | "past_due" | "cancelled";
export type CoachApplicationStatus = "pending" | "approved" | "declined";
export type CoachLinkStatus = "pending" | "active" | "declined" | "revoked";

export function emptyScopes(): CoachScopes {
  return { plan: false, results: false, judges: false, notes: false, visits: false, videos: false };
}

export function parseScopes(value: unknown): CoachScopes {
  const raw = typeof value === "string" ? safeJson(value) : value;
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const scopes = emptyScopes();
  for (const id of COACH_SCOPE_IDS) scopes[id] = source[id] === true;
  return scopes;
}

export function subscriptionLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "comp":
      return "Complimentary";
    case "past_due":
      return "Payment overdue";
    case "cancelled":
      return "Cancelled";
    default:
      return "Not billed in the app";
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export type GuardianInput = {
  under18: boolean;
  guardianName?: string;
  guardianNote?: string;
  guardianAgrees?: boolean;
};

export function defaultGuardian(under18 = false): GuardianInput {
  return { under18, guardianName: "", guardianNote: "", guardianAgrees: false };
}

export type CoachProfile = {
  userId: string;
  email: string;
  displayName: string;
  phone: string;
  region: string;
  bio: string;
  offerings: CoachOffering[];
  pupilCap: number;
  acceptingPupils: boolean;
  subscriptionStatus: CoachSubscriptionStatus;
  status: CoachApplicationStatus;
  activePupils: number;
};

export type CoachLinkSummary = {
  id: string;
  status: CoachLinkStatus;
  initiatedBy: "rider" | "coach";
  coachEmail: string;
  coachName: string;
  riderEmail: string;
  riderName: string;
  scopes: CoachScopes;
  under18: boolean;
  guardianConsentRequired: boolean;
  guardianName: string;
  guardianNote: string;
  guardianConsented: boolean;
};

export type PupilSummary = {
  linkId: string;
  name: string;
  email: string;
  horses: { id: string; name: string; level: string }[];
  statusLine: string;
};

export type CoachHome = {
  profile: CoachProfile | null;
  pupils: PupilSummary[];
  incoming: CoachLinkSummary[];
  outgoing: CoachLinkSummary[];
};

export type RiderCoachHome = {
  under18: boolean;
  guardianNote: string;
  links: CoachLinkSummary[];
};

export type PupilFocus = {
  id: string;
  date: string;
  endDate: string;
  title: string;
  focus: string;
  homework: string;
  film: string;
  leaveIt: string;
  authorName: string;
  editable: boolean;
};

export type PupilHorseView = {
  id: string;
  name: string;
  level: string;
  focus: PupilFocus | null;
  visits: PupilFocus[] | null;
  workOns: { date: string; test: string; showName: string; items: { title: string; why: string; how: string }[] } | null;
  notes: { date: string; text: string }[] | null;
  plan: { phase: string; intent: string; start: string; end: string; ticked: number } | null;
  scores: { date: string; test: string; showName: string; percent: number | null; place: string }[] | null;
  videos: { id: string; date: string; test: string; showName: string; note: string; ready: boolean }[] | null;
};

export type PupilView = {
  linkId: string;
  pupilName: string;
  pupilEmail: string;
  guardianConsent: boolean;
  horses: PupilHorseView[];
};

export type CoachApplication = {
  userId: string;
  email: string;
  displayName: string;
  phone: string;
  region: string;
  bio: string;
  status: CoachApplicationStatus;
  adminNotes: string;
  createdAt: string;
};
