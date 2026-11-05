import { createFileRoute } from "@tanstack/react-router";
import { BrandShell, Kicker, Panel, PrivacyNote, Title } from "@/components/beta-ui";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <BrandShell>
      <Kicker>XSalute beta</Kicker>
      <Title>Privacy &amp; beta terms</Title>
      <Panel className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
        <PrivacyNote />
        <p>
          What we hold: your account (name, email, password hash), your beta application (contact details, region,
          grade, competition level, horses and their ESNZ numbers, ESNZ membership, coach, goals) and its review
          status. Your season plan, scores, ride notes and judge-sheet summaries are stored in our database against
          your account so they’re on every device. Show results we import from EVO Events are matched to your horses.
          Photos, videos and freestyle music files stay on the device you added them from.
        </p>
        <p>
          Beta terms: places are limited and selected by Virtual Dressage NZ. Features may change, break or be removed
          while we test. Please send feedback — that is the deal!
        </p>
      </Panel>
    </BrandShell>
  );
}
