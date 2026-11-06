import { createFileRoute } from "@tanstack/react-router";
import { BrandShell, Kicker, Panel, PrivacyNote, Title } from "@/components/beta-ui";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 font-display text-base font-extrabold text-ink">{children}</h2>;
}

function Privacy() {
  return (
    <BrandShell>
      <Kicker>XSalute beta</Kicker>
      <Title>Privacy &amp; beta terms</Title>
      <Panel className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
        <PrivacyNote />

        <H>Our promise</H>
        <p>
          Your information is used only to help you train and to run XSalute. We will never publish, sell, rent or share
          your details, your horses’ details, your scores, ride notes or judge sheets for any other purpose. We will not
          use them for advertising, and we will not share them with sponsors, partners, Equestrian Sports New Zealand or
          any other organisation without your clear permission first.
        </p>

        <H>What we hold</H>
        <p>
          Your account (name, email, password hash), your beta application (contact details, region, grade, competition
          level, horses and their ESNZ numbers, ESNZ membership, coach, goals) and its review status. Your season plan,
          scores, ride notes and judge-sheet summaries are stored in our database against your account so they’re on
          every device. Show results we import from EVO Events are matched to your horses. Photos, videos and freestyle
          music files stay on the device you added them from.
        </p>

        <H>Who sees it</H>
        <p>
          Only you and the Virtual Dressage NZ team. If you choose to connect a coach in future, they will see only what
          you choose to share with them. When you ask for a judge-sheet summary, the photo is sent securely to our AI
          provider to read it and is not used for anything else. We never rate or comment on individual judges.
        </p>

        <H>Anonymous insights</H>
        <p>
          Any insights we build from many riders’ results (for example, “what helps riders improve at Level 2”) will only
          ever use combined, anonymous information that can’t identify you or your horse, and only if you’ve said yes.
        </p>

        <H>Your choices</H>
        <p>
          You can see, correct or delete your information at any time. Email virtualdressagenz@gmail.com and we’ll
          sort it out. This follows the New Zealand Privacy Act 2020, and you can contact the Office of the Privacy
          Commissioner if you have concerns.
        </p>

        <H>Beta terms</H>
        <p>
          Places are limited and selected by Virtual Dressage NZ. Features may change, break or be removed while we test.
          Please send feedback, that is the deal!
        </p>
      </Panel>
    </BrandShell>
  );
}
