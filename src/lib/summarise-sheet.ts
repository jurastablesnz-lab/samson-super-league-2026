import { createServerFn } from "@tanstack/react-start";
import type { SheetInput, SheetRead } from "./review-types";

export const summariseSheet = createServerFn({ method: "POST" })
  .validator((input: SheetInput) => {
    if (!input || typeof input.imageBase64 !== "string" || input.imageBase64.length < 80) {
      throw new Error("Photo missing");
    }
    if (input.imageBase64.length > 2_200_000) throw new Error("Photo too large");
    const mime = input.mime === "image/png" ? "image/png" : "image/jpeg";
    return {
      imageBase64: input.imageBase64,
      mime,
      testHint: String(input.testHint ?? "").slice(0, 40),
      showName: String(input.showName ?? "").slice(0, 80),
    };
  })
  .handler(async ({ data }): Promise<{ ok: true; sheet: SheetRead } | { ok: false; error: string }> => {
    const { summariseSheetOnServer } = await import("./summarise-sheet.server");
    return summariseSheetOnServer(data);
  });
