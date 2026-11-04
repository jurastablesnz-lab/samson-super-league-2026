import { createServerFn } from "@tanstack/react-start";
import { normaliseSheetImages, type SheetInput, type SheetRead } from "./review-types";

export const summariseSheet = createServerFn({ method: "POST" })
  .validator((input: SheetInput) => {
    const images = normaliseSheetImages(input);
    return {
      images,
      testHint: String(input.testHint ?? "").slice(0, 40),
      showName: String(input.showName ?? "").slice(0, 80),
    };
  })
  .handler(
    async ({ data }): Promise<{ ok: true; sheet: SheetRead } | { ok: false; error: string }> => {
      const { summariseSheetOnServer } = await import("./summarise-sheet.server");
      return summariseSheetOnServer(data);
    },
  );
