import { parseSheetRead, type SheetImage, type SheetRead } from "./review-types";

const SAMSON_HORSE = `Horse: Jura Samson, 14yo black stationbred, competing Level 2 Novice (tests 2A, 2B, 2C, and Level 2 musical freestyle). Super 5 counting test is 2B. The horse schools Medium at home but this sheet is a competition test.`;

function horseLine(horseName?: string, level?: string) {
  if (!horseName) return SAMSON_HORSE;
  return `Horse: ${horseName}${level ? `, competing ${level}` : ""}. Use the level and tests on the sheet itself if they differ.`;
}

const SYSTEM_HEAD = `You read photographed ESNZ dressage judge sheets for a New Zealand rider.`;
const SYSTEM = `
Return one JSON object only, no markdown.
Shape:
{"readable":true,"test":"2B","percent":64.2,"place":"6th","judge":"name or null","summary":"","lowMarks":[{"movement":"","mark":"6","comment":""}],"strengths":[""],"workOns":[{"title":"","why":"","how":""}],"collectives":"","caveat":null,"judges":[{"position":"C","name":null,"percent":63.8,"remarks":[""]}],"agreement":null,"disagreement":null}
Photos:
- You may get up to 6 photos. They are pages of the same test, often 2 A4 pages per judge, from 1 to 3 judges (for example at C, E and B). Marks and remarks are handwritten.
- Work out which pages belong to which judge (judge position, name, signature, handwriting, page 1 vs page 2) and combine the pages for each judge before reading. The rider may label a photo with a position; trust it unless the sheet clearly says otherwise.
- percent: the overall or final percentage if printed or written. With several judges and no overall written, use the average of the judge percentages you could read. judge: the single judge name, or null when there are several.
- judges: one entry per judge with position (C, E, B, H, M or Judge 1, 2, 3), name if readable, percent if visible, and up to 3 key remarks in the judge's words. With one judge, judges can have one entry or be omitted.
- With several judges, the summary leads with the themes the judges share, and lowMarks prefer movements marked low by more than one judge (name the positions in comment, e.g. "C 5.5, E 6"). agreement: one sentence on what they agreed on. disagreement: one sentence on where marks or remarks clearly differ (a 1+ point spread on a movement, or opposite comments), else null.
- If a photo is unreadable or not part of this test, say which in caveat and read the rest.
Rules:
- Do not invent marks, comments, a percentage, a place, or a judge you cannot read. Use null or omit.
- summary: 2 to 4 plain sentences on what the test actually showed.
- lowMarks: only movements at 6 or below, or ones with a useful comment. Max 6.
- workOns: exactly 3 options the rider can choose between for next week's schooling. Each how is a specific arena exercise (gait, letters or circle size, what good looks like). Not slogans, not more shows, not shopping.
- Prefer the repeated comment and the lowest coefficient movements, especially the stretch circle, transitions, and accuracy.
- If the photo is the wrong page, blurry, or mostly unreadable, set readable to false, say so in caveat, and still offer 3 general options appropriate to the horse's level only if something on the sheet supports them. Otherwise workOns can be empty.
- Tone: direct NZ dressage coach. Gender-neutral: say "your horse", the horse's name or "they", never he/she for horse or rider. No emoji.`;

export async function summariseSheetOnServer(data: {
  images: SheetImage[];
  testHint: string;
  showName: string;
  horseName?: string;
  level?: string;
}): Promise<{ ok: true; sheet: SheetRead } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "Reading sheets is not available right now." };

  const count = data.images.length;
  const prompt =
    count === 1
      ? `The rider thinks this is ${data.testHint || (data.level ? `a ${data.level} test` : "a Level 2 test")} at ${data.showName || "a show"}. Read the sheet.`
      : `The rider thinks this is ${data.testHint || (data.level ? `a ${data.level} test` : "a Level 2 test")} at ${data.showName || "a show"}. There are ${count} photos of judge sheet pages for this one test. Combine the pages per judge, then read the whole test.`;
  const content: (
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  )[] = [{ type: "text", text: prompt }];
  data.images.forEach((img, i) => {
    content.push({
      type: "text",
      text: `Photo ${i + 1} of ${count}${img.label ? `, rider says judge at ${img.label}` : ""}:`,
    });
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mime};base64,${img.imageBase64}` },
    });
  });
  const body = {
    model: "grok-4.5",
    temperature: 0.2,
    max_tokens: count > 1 ? 2500 : 1500,
    messages: [
      { role: "system", content: `${SYSTEM_HEAD}\n${horseLine(data.horseName, data.level)}${SYSTEM}` },
      { role: "user", content },
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
