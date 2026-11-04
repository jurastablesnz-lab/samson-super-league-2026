import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseSheetImages, parseSheetRead, sheetPhotoIds } from "./review-types.ts";

const b64 = "A".repeat(200);

test("old single-judge read still parses without judges", () => {
  const read = parseSheetRead(
    '{"readable":true,"test":"2B","percent":64.2,"summary":"Steady test.","lowMarks":[],"strengths":[],"workOns":[{"title":"T","how":"H"}]}',
  );
  assert.ok(read);
  assert.equal(read.percent, 64.2);
  assert.equal(read.judges, undefined);
});

test("multi-judge read keeps judges, agreement and disagreement", () => {
  const read = parseSheetRead(
    'x {"summary":"All three wanted more bend.","percent":63.1,"judges":[{"position":"C","percent":62.5,"remarks":["needs bend"]},{"position":"E","percent":"63.7","remarks":[]},{"position":"B","remarks":[]}],"agreement":"Bend","disagreement":"Halt marks spread"} y',
  );
  assert.ok(read);
  assert.equal(read.judges?.length, 2);
  assert.equal(read.judges?.[1].percent, 63.7);
  assert.equal(read.disagreement, "Halt marks spread");
});

test("legacy single image input and photo ids are compatible", () => {
  assert.equal(normaliseSheetImages({ imageBase64: b64, mime: "image/jpeg", testHint: "", showName: "" }).length, 1);
  assert.deepEqual(sheetPhotoIds({ id: "s-1" }), [{ id: "s-1" }]);
  assert.equal(sheetPhotoIds({ id: "s-1", photos: [{ id: "s-1" }, { id: "s-1-2" }] }).length, 2);
});

test("image limits enforced", () => {
  const img = { imageBase64: b64, mime: "image/jpeg" };
  assert.equal(normaliseSheetImages({ images: Array(6).fill(img), testHint: "", showName: "" }).length, 6);
  assert.throws(() => normaliseSheetImages({ images: Array(7).fill(img), testHint: "", showName: "" }));
  assert.throws(() => normaliseSheetImages({ images: [], testHint: "", showName: "" }));
});
