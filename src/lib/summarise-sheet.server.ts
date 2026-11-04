import { parseSheetRead, type SheetInput, type SheetRead } from "./review-types";

const SYSTEM = `You read photographed ESNZ dressage judge sheets for a New Zealand rider.
Horse: Jura Samson, 14yo black stationbred, competing Level 2 Novice (tests 2A, 2B, 2C, and Level 2 musical freestyle). Super 5 counting test is 2B. He schools Medium at home but this sheet is a competition test.
Return one JSON object only, no markdown.
Shape:
{"readable":true,"test":"2B","percent":64.2,"place":"6th","judge":"name or null","summary":"","lowMarks":[{"movement":"","mark":"6","comment":""}],"strengths":[""],"workOns":[{"title":"","why":"","how":""}],"collectives":"","caveat":null}
Rules:
- Do not invent marks, comments, a percentage, a place, or a judge you cannot read. Use null or omit.
- summary: 2 to 4 plain sentences on what the test actually showed.
- lowMarks: only movements at 6 or below, or ones with a useful comment. Max 6.
- workOns: exactly 3 options she can choose between for next week's schooling. Each how is a specific arena exercise (gait, letters or circle size, what good looks like). Not slogans, not more shows, not shopping.
- Prefer the repeated comment and the lowest coefficient movements, especially the stretch circle, transitions, and accuracy.
- If the photo is the wrong page, blurry, or mostly unreadable, set readable to false, say so in caveat, and still offer 3 general Level 2 options only if something on the sheet supports them. Otherwise workOns can be empty.
- Tone: direct NZ dressage coach. No emoji.`;

export async function summariseSheetOnServer(
  data: SheetInput,
): Promise<{ ok: true; sheet: SheetRead } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "Reading sheets is not available right now." };

  const prompt = `The rider thinks this is ${data.testHint || "a Level 2 test"} at ${data.showName || "a show"}. Read the sheet.`;
  const body = {
    model: "grok-4.5",
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${data.mime};base64,${data.imageBase64}` },
          },
        ],
      },
    ],
  };

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
  }
  if (!res || !res.ok) {
    return { ok: false, error: "The sheet could not be read. Try the photo again." };
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const sheet = parseSheetRead(text);
  if (!sheet) return { ok: false, error: "The read came back incomplete. Try the photo again." };
  return { ok: true, sheet };
}
