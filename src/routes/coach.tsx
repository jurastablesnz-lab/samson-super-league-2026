import { createFileRoute } from "@tanstack/react-router";
import { CoachPortal } from "@/components/coach-portal";

type CoachSearch = { pupil: string; settings: boolean };

export const Route = createFileRoute("/coach")({
  validateSearch: (search: Record<string, unknown>): CoachSearch => ({
    pupil: typeof search.pupil === "string" ? search.pupil.slice(0, 80) : "",
    settings: search.settings === true || search.settings === "1" || search.settings === "true",
  }),
  component: CoachRoute,
});

function CoachRoute() {
  const { pupil, settings } = Route.useSearch();
  return <CoachPortal pupilId={pupil} settings={settings} />;
}
