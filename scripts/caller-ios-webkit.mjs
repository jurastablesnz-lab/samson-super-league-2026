/**
 * iPhone-sized WebKit check. Speak runs inside the click, cancel does not,
 * and the microphone is not started in that same tap. If no utterance start
 * arrives, the page shows Voice blocked while Next still changes the text.
 */
import { webkit, devices } from "playwright";

const html = `<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<button id="start" style="min-height:64px;width:100%">Tap to start</button>
<button id="next">Next</button>
<button id="back">Back</button>
<button id="repeat">Repeat</button>
<p id="movement">A</p>
<p id="status"></p>
<p id="hint">Check your phone isn't on silent.</p>
<script>
  window.__events = [];
  window.__spoken = [];
  window.__duringClick = false;
  window.__micStarts = 0;
  const lines = ["A", "B", "C"];
  let index = 0;
  const synth = {
    paused: true,
    speaking: false,
    cancel() { window.__events.push(window.__duringClick ? "cancel-in-click" : "cancel-apart"); },
    resume() { this.paused = false; },
    speak(text) {
      window.__spoken.push(text);
      window.__events.push((window.__duringClick ? "speak-in-click:" : "speak-later:") + text);
    },
  };
  function prime(engine, parts) {
    if (!engine || typeof engine.speak !== "function") return "unavailable";
    try { engine.resume(); } catch (e) {}
    for (const text of parts) engine.speak(text);
    try { engine.resume(); } catch (e) {}
    return "ok";
  }
  function show(label) {
    document.getElementById("movement").textContent = lines[index];
    document.getElementById("status").textContent = label;
  }
  function go(kind) {
    if (kind === "next") index = Math.min(lines.length - 1, index + 1);
    if (kind === "back") index = Math.max(0, index - 1);
    window.__duringClick = true;
    const outcome = prime(synth, [lines[index]]);
    window.__duringClick = false;
    show(outcome === "ok" ? "Reading this movement" : "Voice blocked");
    window.__events.push(kind + ":moved:" + lines[index]);
    if (outcome === "ok") {
      setTimeout(() => {
        if (!window.__started) {
          show("Voice blocked");
          window.__events.push("voice-blocked");
        }
      }, 1500);
    }
  }
  document.getElementById("start").onclick = () => go("start");
  document.getElementById("next").onpointerdown = () => {
    if (synth.speaking) synth.cancel();
  };
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
await page.waitForTimeout(1700);
const result = await page.evaluate(() => ({
  spoken: window.__spoken,
  events: window.__events,
  status: document.getElementById("status").textContent,
  hint: document.getElementById("hint").textContent,
  movement: document.getElementById("movement").textContent,
  mic: window.__micStarts,
}));
await browser.close();

if (result.spoken.join(",") !== "A,B,A,A") {
  console.error(result);
  throw new Error(`unexpected speech order: ${result.spoken.join(",")}`);
}
if (result.events.some((event) => event === "cancel-in-click" || event.startsWith("speak-later"))) {
  console.error(result.events);
  throw new Error("speech left the click or cancel ran inside it");
}
if (result.mic !== 0) throw new Error("microphone started during the taps");
if (result.status !== "Voice blocked") throw new Error(`expected Voice blocked, got ${result.status}`);
if (!result.hint.includes("isn't on silent")) throw new Error("silent hint missing");
if (result.movement !== "A") throw new Error("Back/Repeat did not keep the text moving");
console.log("webkit iPhone caller gesture ok");
