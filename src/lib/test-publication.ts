/**
 * Published-test reads for any signed-in rider, and approve / unapprove for a
 * Google-signed-in admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";

export const getPublishedTests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<{ ids: string[] }> => {
    const { getSql } = await import("./db");
    const { publishedTestIds } = await import("./test-approvals.server");
    return { ids: await publishedTestIds(await getSql()) };
  });

export const setTestPublished = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { testId: string; approved: boolean }) => {
    const testId = String(input?.testId ?? "")
      .trim()
      .slice(0, 80);
    if (!testId) throw new Error("Choose a test");
    return { testId, approved: input?.approved === true };
  })
  .handler(async ({ context, data }): Promise<{ ids: string[] }> => {
    const { getSql } = await import("./db");
    const { setTestApproval } = await import("./test-approvals.server");
    return { ids: await setTestApproval(await getSql(), context.userId, data.testId, data.approved) };
  });
