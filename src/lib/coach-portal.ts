/**
 * Coach Portal server functions. Handlers take the signed-in user from
 * authMiddleware and never a client-supplied user id.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import type { CoachVisitDraft } from "./rider-workspace";
import type { GuardianInput } from "./coach-portal-types";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const guardian = (input: Partial<GuardianInput> | undefined) => ({
  under18: input?.under18 === true,
  guardianName: text(input?.guardianName, 120),
  guardianNote: text(input?.guardianNote, 500),
  guardianAgrees: input?.guardianAgrees === true,
});

async function sql() {
  const { getSql } = await import("./db");
  return getSql();
}

export const getCoachHome = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { loadCoachHome } = await import("./coach-portal.server");
    return loadCoachHome(await sql(), context.userId);
  });

export const applyForCoach = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { displayName?: string; phone?: string; region?: string; bio?: string; consent?: boolean }) => ({
    displayName: text(input?.displayName, 120),
    phone: text(input?.phone, 40),
    region: text(input?.region, 80),
    bio: text(input?.bio, 1000),
    consent: input?.consent === true,
  }))
  .handler(async ({ context, data }) => {
    const { applyForCoach: apply } = await import("./coach-portal.server");
    const result = await apply(await sql(), context.userId, data);
    try {
      const { emailEnabled } = await import("./email.server");
      if (emailEnabled()) {
        const { adminEmails } = await import("./beta.server");
        const { env } = await import("./env.server");
        const { sendEmail } = await import("./email.server");
        const raw = env("BETA_NOTIFY_EMAILS");
        const to = raw === "off" ? [] : raw ? raw.split(/[,\s]+/).filter(Boolean) : adminEmails();
        const base = env("BETTER_AUTH_URL");
        if (to.length) {
          await sendEmail({
            to,
            subject: `Coach Portal application — ${data.displayName}`,
            text: [`New Coach Portal application`, ``, `Name: ${data.displayName}`, `Region: ${data.region}`, ``, base ? `Review it: ${base.replace(/\/+$/, "")}/admin` : `Review it on the /admin page.`].join("\n"),
          });
        }
      }
    } catch (err) {
      console.error("[coach-portal] application alert failed:", err instanceof Error ? err.message : err);
    }
    return result;
  });

export const saveCoachPackage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { displayName?: string; bio?: string; offerings?: unknown; pupilCap?: number; acceptingPupils?: boolean }) => ({
      displayName: text(input?.displayName, 120),
      bio: text(input?.bio, 1000),
      offerings: input?.offerings ?? [],
      pupilCap: Number(input?.pupilCap),
      acceptingPupils: input?.acceptingPupils === true,
    }),
  )
  .handler(async ({ context, data }) => {
    const { saveCoachPackage: save } = await import("./coach-portal.server");
    return save(await sql(), context.userId, data);
  });

export const getPupil = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { linkId?: string }) => ({ linkId: text(input?.linkId, 80) }))
  .handler(async ({ context, data }) => {
    const { loadPupil } = await import("./coach-portal.server");
    return loadPupil(await sql(), context.userId, data.linkId);
  });

export const setPupilHomework = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { linkId?: string; horseId?: string; visit?: CoachVisitDraft }) => {
    if (!input?.visit || typeof input.visit !== "object") throw new Error("Add a focus or some homework");
    return { linkId: text(input.linkId, 80), horseId: text(input.horseId, 80), ...input.visit };
  })
  .handler(async ({ context, data }) => {
    const { setPupilHomework: save } = await import("./coach-portal.server");
    return save(await sql(), context.userId, data);
  });

export const requestPupil = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email?: string }) => ({ email: text(input?.email, 200) }))
  .handler(async ({ context, data }) => {
    const { requestPupil: request } = await import("./coach-portal.server");
    return request(await sql(), context.userId, data);
  });

export const acceptCoachLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    linkId?: string;
    scopes?: unknown;
    under18?: boolean;
    guardianName?: string;
    guardianNote?: string;
    guardianAgrees?: boolean;
  }) => ({
    linkId: text(input?.linkId, 80),
    scopes: input?.scopes ?? {},
    ...guardian(input),
  }))
  .handler(async ({ context, data }) => {
    const { acceptLink } = await import("./coach-portal.server");
    return acceptLink(await sql(), context.userId, data);
  });

export const endCoachLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { linkId?: string }) => ({ linkId: text(input?.linkId, 80) }))
  .handler(async ({ context, data }) => {
    const { endLink } = await import("./coach-portal.server");
    return endLink(await sql(), context.userId, data.linkId);
  });

export const getRiderCoaches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireAccess } = await import("./rider.server");
    await requireAccess(context.userId);
    const { loadRiderCoaches } = await import("./coach-portal.server");
    return loadRiderCoaches(await sql(), context.userId);
  });

export const inviteCoach = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: GuardianInput & { email?: string; scopes?: unknown }) => ({
    email: text(input?.email, 200),
    scopes: input?.scopes ?? {},
    ...guardian(input),
  }))
  .handler(async ({ context, data }) => {
    const { requireAccess } = await import("./rider.server");
    await requireAccess(context.userId);
    const { inviteCoach: invite } = await import("./coach-portal.server");
    return invite(await sql(), context.userId, data);
  });

export const updateCoachScopes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { linkId?: string; scopes?: unknown }) => ({
    linkId: text(input?.linkId, 80),
    scopes: input?.scopes ?? {},
  }))
  .handler(async ({ context, data }) => {
    const { requireAccess } = await import("./rider.server");
    await requireAccess(context.userId);
    const { updateLinkScopes } = await import("./coach-portal.server");
    return updateLinkScopes(await sql(), context.userId, data);
  });

export const getCoachApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireAdminUser } = await import("./rider.server");
    await requireAdminUser(context.userId);
    const { listCoachApplications } = await import("./coach-portal.server");
    return listCoachApplications(await sql());
  });

export const decideCoachApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string; status?: string; notes?: string }): {
    userId: string;
    status: "pending" | "approved" | "declined";
    notes: string;
  } => {
    if (input?.status !== "pending" && input?.status !== "approved" && input?.status !== "declined") {
      throw new Error("Bad status");
    }
    return { userId: text(input.userId, 120), status: input.status, notes: text(input.notes, 2000) };
  })
  .handler(async ({ context, data }) => {
    const { requireAdminUser } = await import("./rider.server");
    const admin = await requireAdminUser(context.userId);
    const { decideCoach } = await import("./coach-portal.server");
    await decideCoach(await sql(), admin.email ?? "", data);
    return { ok: true as const };
  });

export const seedCoachDemo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { loadUser, authOff } = await import("./beta.server");
    const user = await loadUser(context.userId);
    if (!user.isAdmin && !authOff()) throw new Error("Admins only");
    const { seedCoachDemo: seed } = await import("./coach-portal.server");
    return seed(await sql(), context.userId, { riderPreview: authOff() });
  });
