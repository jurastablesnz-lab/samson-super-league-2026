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
          grade, competition level, horses, ESNZ membership, coach, goals) and its review status. Training data you
          enter in the app is stored on your own device.
        </p>
        <p>
          Beta terms: places are limited and selected by Virtual Dressage NZ. Features may change, break or be removed
          while we test. Please send feedback — that is the deal!
        </p>
      </Panel>
    </BrandShell>
  );
}
