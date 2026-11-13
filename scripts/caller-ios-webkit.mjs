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

const layout = `<!doctype html>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{margin:0;height:100%;background:#0b1020;color:#fff;font-family:sans-serif}
  .app{height:100dvh;display:flex;flex-direction:column}
  .mid{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:16px}
  .arena{flex:1;min-height:0;overflow:hidden;pointer-events:none;display:flex;align-items:center;justify-content:center}
  .arena svg{pointer-events:none;height:100%;max-height:100%;width:auto;max-width:100%;display:block}
  .bar{position:relative;z-index:20;flex-shrink:0;background:#0b1020;padding:12px 16px 28px}
  button{min-height:56px;font-size:16px;position:relative;z-index:30}
</style>
<div class="app">
  <div class="mid">
    <p>NOVICE 2B</p>
    <h1>A · X</h1>
    <p>Enter in working trot. Halt, salute.</p>
    <div class="arena" id="arena"><svg viewBox="0 0 220 272" width="800" height="1000"><rect width="800" height="1000" fill="#f00"/></svg></div>
  </div>
  <div class="bar" id="bar">
    <p id="voice">Voice: not started</p>
    <button id="test">Test sound</button>
    <button id="start">Tap to start</button>
    <button id="back">Back</button>
    <button id="repeat">Repeat</button>
    <button id="next">Next</button>
  </div>
</div>
<script>
  window.__during = false;
  window.__spoken = [];
  const synth = { resume(){}, speak(t){ window.__spoken.push(t); window.__inClick = window.__during; } };
  document.getElementById("test").onclick = () => {
    window.__during = true;
    try { synth.resume(); } catch (e) {}
    synth.speak("Hello Susan, testing");
    window.__during = false;
    document.getElementById("voice").textContent = "Voice: speaking";
  };
</script>`;

const layoutPage = await (await webkit.launch()).newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }).then(async (ctx) => {
  const p = await ctx.newPage();
  await p.setContent(layout);
  return p;
});
const boxes = await layoutPage.evaluate(() => {
  const box = (id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  };
  const hit = (id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el && (el.id || el.tagName);
  };
  return {
    arena: box("arena"),
    bar: box("bar"),
    start: box("start"),
    back: box("back"),
    next: box("next"),
    hitStart: hit("start"),
    hitBack: hit("back"),
    hitNext: hit("next"),
    voice: document.getElementById("voice").textContent,
  };
});
if (boxes.arena.bottom > boxes.bar.top + 1) {
  console.error(boxes);
  throw new Error("diagram overlaps the control bar");
}
if (boxes.hitStart !== "start" || boxes.hitBack !== "back" || boxes.hitNext !== "next") {
  console.error(boxes);
  throw new Error("a control is covered");
}
if (boxes.voice !== "Voice: not started") throw new Error("voice status missing");
await layoutPage.getByRole("button", { name: "Test sound" }).click();
const said = await layoutPage.evaluate(() => ({ spoken: window.__spoken, inClick: window.__inClick }));
if (said.spoken[0] !== "Hello Susan, testing" || said.inClick !== true) {
  console.error(said);
  throw new Error("Test sound did not speak inside the click");
}
await layoutPage.context().browser().close();
console.log("webkit 390x844 caller layout ok");

const listen = `<!doctype html>
<p id="mic">The home-screen app cannot hear you. Open this page in Safari, or allow the microphone and tap here.</p>
<p id="heard"></p>
<script>
  window.__starts = 0;
  let speaking = false;
  class Rec {
    constructor() { this.onresult = null; this.onend = null; this.onerror = null; }
    start() {
      window.__starts += 1;
      const mine = this;
      setTimeout(() => {
        if (speaking) return;
        mine.onresult && mine.onresult({ resultIndex: 0, results: [{ 0: { transcript: "okay next" }, isFinal: true }] });
        mine.onend && mine.onend();
      }, 10);
    }
    stop() { this.onend && this.onend(); }
  }
  window.webkitSpeechRecognition = Rec;
  let current = null;
  let want = true;
  function start() {
    if (!want || speaking || current) return;
    const rec = new Rec();
    current = rec;
    rec.onresult = (event) => {
      if (speaking) return;
      document.getElementById("heard").textContent = event.results[0][0].transcript;
    };
    rec.onend = () => {
      if (current === rec) current = null;
      if (want && !speaking) setTimeout(start, 20);
    };
    rec.start();
  }
  document.getElementById("mic").onclick = () => { speaking = false; start(); };
  window.__speak = () => { speaking = true; };
</script>`;
const listenPage = await (await webkit.launch()).newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }).then(async (ctx) => {
  const p = await ctx.newPage();
  await p.setContent(listen);
  return p;
});
const home = await listenPage.locator("#mic").innerText();
if (!home.includes("home-screen") || !home.includes("Safari")) throw new Error("home-screen help missing");
await listenPage.locator("#mic").click();
await listenPage.waitForTimeout(80);
const first = await listenPage.evaluate(() => ({ starts: window.__starts, heard: document.getElementById("heard").textContent }));
if (first.starts < 2 || first.heard !== "okay next") {
  console.error(first);
  throw new Error("recognition did not restart or hear next");
}
await listenPage.evaluate(() => window.__speak());
await listenPage.waitForTimeout(40);
const during = await listenPage.evaluate(() => document.getElementById("heard").textContent);
if (during !== "okay next") throw new Error("a word was accepted while Ara was speaking");
await listenPage.context().browser().close();
console.log("webkit voice command restart ok");
