import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { normaliseSheetImages, type SheetInput, type SheetRead } from "./review-types";

export const summariseSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SheetInput) => {
    const images = normaliseSheetImages(input);
    return {
      images,
      testHint: String(input.testHint ?? "").slice(0, 40),
      showName: String(input.showName ?? "").slice(0, 80),
      horseName: String(input.horseName ?? "").slice(0, 80),
      level: String(input.level ?? "").slice(0, 60),
    };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; sheet: SheetRead } | { ok: false; error: string }> => {
      const { summariseSheetOnServer } = await import("./summarise-sheet.server");
      return summariseSheetOnServer(context.userId, data);
    },
  );
