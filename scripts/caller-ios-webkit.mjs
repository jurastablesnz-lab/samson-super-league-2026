/**
 * iPhone-sized WebKit check: speech must start inside the tap, and a throwing
 * cancel or speech-recognition start must not stop Back / Repeat / Next.
 */
import { webkit, devices } from "playwright";

const html = `<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<button id="start" style="min-height:64px;width:100%">Tap to start</button>
<button id="next">Next</button>
<button id="back">Back</button>
<button id="repeat">Repeat</button>
<p id="status"></p>
<p id="hint">Check your phone isn't on silent.</p>
<script>
  window.__events = [];
  window.__spoken = [];
  window.__duringClick = false;
  const synth = {
    paused: true,
    cancel() { throw new Error("cancel"); },
    resume() { this.paused = false; },
    speak(text) {
      window.__spoken.push(text);
      window.__spokenInClick = window.__duringClick;
    },
  };
  const texts = ["Enter at A", "Susan, sit for the halt"];
  function prime(engine, lines) {
    if (!engine || typeof engine.speak !== "function") return "unavailable";
    try { engine.cancel(); } catch (e) { window.__events.push("cancel-threw"); }
    try { engine.resume(); } catch (e) { window.__events.push("resume-threw"); }
    try {
      for (const text of lines) engine.speak(text);
      return "ok";
    } catch (e) {
      return "blocked";
    }
  }
  function go(label) {
    window.__duringClick = true;
    const outcome = prime(synth, texts);
    window.__events.push(label + ":" + outcome + ":" + (window.__spokenInClick ? "in-click" : "later"));
    window.__duringClick = false;
    try { window.__recognition.start(); } catch (e) { window.__events.push("recognition-threw"); }
    document.getElementById("status").textContent = outcome === "ok" ? "Reading this movement" : "Speech is blocked. Check your phone isn't on silent.";
  }
  document.getElementById("start").onclick = () => go("start");
  document.getElementById("next").onclick = () => go("next");
  document.getElementById("back").onclick = () => go("back");
  document.getElementById("repeat").onclick = () => go("repeat");
</script>`;

const browser = await webkit.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
await page.setContent(html);
await page.getByRole("button", { name: "Tap to start" }).click();
await page.getByRole("button", { name: "Next" }).click();
await page.getByRole("button", { name: "Back" }).click();
await page.getByRole("button", { name: "Repeat" }).click();
const result = await page.evaluate(() => ({
  spoken: window.__spoken,
  events: window.__events,
  hint: document.getElementById("hint").textContent,
}));
await browser.close();

const expected = ["Enter at A", "Susan, sit for the halt"];
if (result.spoken.length !== 8) {
  console.error(result);
  throw new Error(`expected 8 spoken clips, got ${result.spoken.length}`);
}
for (let i = 0; i < 4; i++) {
  if (result.spoken[i * 2] !== expected[0] || result.spoken[i * 2 + 1] !== expected[1]) {
    throw new Error("clips were not spoken in order");
  }
}
for (const name of ["start", "next", "back", "repeat"]) {
  if (!result.events.some((event) => event.startsWith(`${name}:ok:in-click`))) {
    console.error(result.events);
    throw new Error(`${name} did not speak inside the click`);
  }
}
if (!result.events.includes("cancel-threw") || !result.events.includes("recognition-threw")) {
  throw new Error("throwing cancel or recognition was not contained");
}
if (!result.hint.includes("isn't on silent")) throw new Error("silent hint missing");
console.log("webkit iPhone caller gesture ok");
