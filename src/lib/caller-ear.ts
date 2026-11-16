import {
  commandFromTranscript,
  commandMode,
  idleVad,
  stepVad,
  type CommandMode,
  type MicStatus,
  type RideCommand,
  type VadState,
} from "./caller-commands.ts";
import { beginPcm, createPcmRing, encodeWavPcm, endPcm, peakPcm, pushPcm } from "./caller-stt.ts";

type Rec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type RecEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
};

export type CallerEar = {
  mode: CommandMode;
  arm: () => void;
  suspend: () => void;
  resume: () => void;
  stop: () => void;
};

/**
 * Hears next, back, and repeat between movements.
 * On an iPhone the recogniser is not used: playing Ara through an audio element
 * stops it, and a home-screen app does not have it. The microphone records a
 * short clip instead, including a little audio from before the voice detector
 * opens so the start of "next" is not cut off. The microphone stays open for the
 * whole caller session. Playing Ara must not leave that stream muted. The first
 * arm() must run inside a tap.
 */
export function createCallerEar(options: {
  ios: boolean;
  hasRecognition: boolean;
  hasMic: boolean;
  Recognition?: (new () => Rec) | null;
  openMic?: () => Promise<MediaStream>;
  transcribe?: (blob: Blob, seconds: number) => Promise<string>;
  onCommand: (command: RideCommand, heard: string) => void;
  onHeard?: (heard: string) => void;
  onError?: (message: string) => void;
  onLevel?: (rms: number) => void;
  onStatus: (status: MicStatus) => void;
  onLog: (line: string) => void;
  schedule?: (fn: () => void, ms: number) => number;
  clear?: (id: number) => void;
  now?: () => number;
}): CallerEar {
  const mode = commandMode(options);
  const schedule = options.schedule ?? ((fn, ms) => window.setTimeout(fn, ms) as unknown as number);
  const clear = options.clear ?? ((id) => window.clearTimeout(id));
  const now = options.now ?? (() => Date.now());
  let want = false;
  let stopped = false;
  let suspended = false;
  let rec: Rec | null = null;
  let restart: number | null = null;
  let latch = 0;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let discardClip = false;
  let vad: VadState = idleVad();
  let timer: number | null = null;
  let context: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let mute: GainNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let usePcm = false;
  let openGen = 0;
  let lastReopen = 0;
  let clipPeak = 0;
  let contextWasRunning = false;
  let sessionNoted = false;
  let fallbackTried = false;
  let quietSince = 0;
  let sink: MediaStreamAudioDestinationNode | null = null;
  const ring = createPcmRing();

  function log(line: string) {
    options.onLog(line);
  }

  function accept(heard: string) {
    options.onHeard?.(heard);
    const command = commandFromTranscript(heard, suspended);
    log(`mic: heard ${JSON.stringify(heard)}${command ? ` -> ${command}` : ""}`);
    if (!command) return;
    const at = now();
    if (at < latch) return;
    latch = at + 900;
    log(`mic: command ${command}`);
    options.onCommand(command, heard);
  }

  function clearRestart() {
    if (restart != null) clear(restart);
    restart = null;
  }

  function scheduleRestart() {
    clearRestart();
    if (stopped || !want || suspended || mode !== "webkit") return;
    restart = schedule(() => {
      restart = null;
      beginWebkit();
    }, 300);
  }

  function beginWebkit() {
    if (stopped || !want || suspended || mode !== "webkit" || rec) return;
    const Ctor = options.Recognition;
    if (!Ctor) {
      options.onStatus("unsupported");
      return;
    }
    const next = new Ctor();
    next.continuous = true;
    next.interimResults = true;
    next.lang = "en-US";
    next.onresult = (event) => {
      try {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i];
          if (piece?.isFinal === false) continue;
          accept(piece?.[0]?.transcript ?? "");
        }
      } catch (err) {
        log(`mic: error ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    next.onerror = (event) => {
      const code = event.error || "unknown";
      log(`mic: error ${code}`);
      if (code === "not-allowed" || code === "service-not-allowed") {
        want = false;
        options.onStatus("permission");
      }
    };
    next.onend = () => {
      if (rec === next) rec = null;
      log("mic: end");
      scheduleRestart();
    };
    rec = next;
    try {
      next.start();
      log("mic: start");
      options.onStatus("listening");
    } catch (err) {
      rec = null;
      log(`mic: error ${err instanceof Error ? err.message : String(err)}`);
      scheduleRestart();
    }
  }

  function stopWebkit() {
    clearRestart();
    const current = rec;
    rec = null;
    try {
      if (current?.abort) current.abort();
      else current?.stop();
    } catch {
      // Already stopped.
    }
  }

  function mimeType(): string {
    const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  }

  function finishClip(blob: Blob, seconds: number, peak: number) {
    log(`mic: clip ${seconds.toFixed(1)}s ${blob.size}b peak ${peak.toFixed(3)}`);
    if (discardClip || !options.transcribe) return;
    if (peak < 0.008) {
      log("mic: silent — reopening the microphone");
      options.onHeard?.("");
      scheduleReopen("silent");
      return;
    }
    if (blob.size < 400) {
      log(`mic: clip too small (${blob.size})`);
      options.onHeard?.("");
      return;
    }
    log("mic: sending a clip");
    void options
      .transcribe(blob, seconds)
      .then((text) => {
        log(`mic: stt ${text ? JSON.stringify(text) : "empty"}`);
        if (text) accept(text);
        else options.onHeard?.("");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        log(`mic: error ${message}`);
        options.onError?.(message);
      });
  }

  function stopRecorder(discard: boolean) {
    discardClip = discard;
    const current = recorder;
    recorder = null;
    if (!current || current.state === "inactive") return;
    try {
      current.requestData();
    } catch {
      // Some browsers only deliver data from stop().
    }
    try {
      current.stop();
    } catch {
      // Already stopped.
    }
  }

  function notePcm(frame: Float32Array) {
    pushPcm(ring, frame, context?.sampleRate || 48000);
  }

  function openPcm() {
    beginPcm(ring);
    discardClip = false;
    log("mic: clip");
  }

  function closePcm(discard: boolean) {
    const samples = endPcm(ring, discard);
    if (!samples) return;
    const rate = context?.sampleRate || 48000;
    finishClip(encodeWavPcm(samples, rate), Math.max(1, samples.length / rate), peakPcm(samples));
  }

  function stopCapture(discard: boolean) {
    if (ring.capture) closePcm(discard);
    stopRecorder(discard);
  }

  function onRms(rms: number) {
    options.onLevel?.(rms);
    if (ring.capture || recorder) clipPeak = Math.max(clipPeak, rms);
    const stepped = stepVad(vad, rms, 100, suspended);
    vad = stepped.next;
    if (stepped.action === "start") clipPeak = rms;
    if (stepped.action === "start" && stream && !recorder && !ring.capture) {
      if (usePcm && ring.samples > 0) {
        openPcm();
        return;
      }
      try {
        const mime = mimeType();
        const next = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        const started = now();
        const chunks: Blob[] = [];
        next.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        next.onstop = () => {
          const blob = new Blob(chunks, { type: next.mimeType || mime || "audio/mp4" });
          finishClip(blob, Math.max(1, (now() - started) / 1000), clipPeak);
        };
        recorder = next;
        discardClip = false;
        next.start(250);
        log("mic: clip");
      } catch (err) {
        log(`mic: error ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (stepped.action === "stop") stopCapture(false);
    if (stepped.action === "discard") stopCapture(true);
  }

  function holdRecordSession() {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (!session) {
      if (!sessionNoted) log("mic: session auto");
      sessionNoted = true;
      return;
    }
    try {
      session.type = "auto";
      if (!sessionNoted) log("mic: session auto");
      sessionNoted = true;
    } catch (err) {
      log(`mic: error ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function noteContext() {
    if (stopped || !want || mode !== "mic" || suspended) return;
    const running = context?.state === "running";
    if (running === contextWasRunning) return;
    contextWasRunning = running;
    options.onStatus(running ? "listening" : "closed");
  }

  function clearRing() {
    ring.chunks.length = 0;
    ring.samples = 0;
    ring.capture = null;
  }

  function tearGraph() {
    if (timer != null) window.clearInterval(timer);
    timer = null;
    try {
      processor?.disconnect();
      mute?.disconnect();
      sourceNode?.disconnect();
      analyser?.disconnect();
      sink?.disconnect();
    } catch {
      // Already closed.
    }
    processor = null;
    mute = null;
    sourceNode = null;
    analyser = null;
    sink = null;
    usePcm = false;
    clearRing();
  }

  function scheduleReopen(reason: string) {
    if (stopped || !want) return;
    if (now() - lastReopen < 3000) {
      log(`mic: still closed (${reason})`);
      return;
    }
    lastReopen = now();
    log(`mic: reopen ${reason}`);
    stopCapture(true);
    tearGraph();
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    armMic();
  }

  function watchTrack(track: MediaStreamTrack) {
    track.onmute = () => {
      log("mic: muted");
      if (!suspended) options.onStatus("closed");
    };
    track.onended = () => {
      log("mic: ended");
      scheduleReopen("ended");
    };
    track.onunmute = () => log("mic: unmuted");
  }

  function listenLevel() {
    if (!context || !stream) return;
    const node = context.createAnalyser();
    node.fftSize = 1024;
    const source = context.createMediaStreamSource(stream);
    source.connect(node);
    analyser = node;
    sourceNode = source;
    if (typeof context.createScriptProcessor === "function") {
      try {
        const capture = context.createScriptProcessor(4096, 1, 1);
        const gain = context.createGain();
        gain.gain.value = 0;
        capture.onaudioprocess = (event) => notePcm(event.inputBuffer.getChannelData(0));
        source.connect(capture);
        capture.connect(gain);
        const dest = context.createMediaStreamDestination();
        gain.connect(dest);
        processor = capture;
        mute = gain;
        sink = dest;
        usePcm = true;
      } catch (err) {
        usePcm = false;
        log(`mic: error ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const data = new Float32Array(node.fftSize);
    timer = window.setInterval(() => {
      if (!analyser) return;
      noteContext();
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      onRms(rms);
      const hearing = !suspended && context?.state === "running";
      if (!hearing) {
        quietSince = 0;
        return;
      }
      if (rms >= 0.002) {
        quietSince = 0;
        return;
      }
      if (!quietSince) quietSince = now();
      else if (!fallbackTried && now() - quietSince > 3000) {
        fallbackTried = true;
        scheduleReopen("flat");
      }
    }, 100) as unknown as number;
  }

  function armMic() {
    if (!options.openMic && !navigator.mediaDevices?.getUserMedia) {
      options.onStatus("unsupported");
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      options.onStatus("unsupported");
      return;
    }
    holdRecordSession();
    if (!context) context = new AudioCtx();
    context.onstatechange = () => {
      const state = context?.state ?? "";
      log(`mic: audio ${state}`);
      noteContext();
    };
    void context.resume().then(() => noteContext());
    const gen = ++openGen;
    const open =
      options.openMic ??
      (() =>
        navigator.mediaDevices.getUserMedia({
          audio: fallbackTried
            ? true
            : { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        }));
    void open()
      .then((opened) => {
        if (gen !== openGen || stopped || !want) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        const track = opened.getAudioTracks()[0];
        if (track) watchTrack(track);
        const settings = track?.getSettings?.() ?? {};
        options.onStatus(context?.state === "running" ? "listening" : "closed");
        log(
          `mic: ready echo ${settings.echoCancellation === true ? "on" : "off"} noise ${settings.noiseSuppression === true ? "on" : "off"}`,
        );
        listenLevel();
      })
      .catch((err) => {
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: string }).name)
            : "";
        log(`mic: error ${name || (err instanceof Error ? err.message : String(err))}`);
        options.onStatus(
          name === "NotAllowedError" || name === "SecurityError" ? "permission" : "unsupported",
        );
      });
  }

  return {
    mode,
    arm() {
      if (stopped) return;
      want = true;
      if (mode === "none") {
        options.onStatus("unsupported");
        return;
      }
      if (mode === "webkit") beginWebkit();
      else if (!stream) armMic();
      else {
        const pending = context?.resume();
        void Promise.resolve(pending).then(() => {
          const track = stream?.getAudioTracks()[0];
          if (!track || track.readyState !== "live") armMic();
          else options.onStatus(context?.state === "running" ? "listening" : "closed");
        });
      }
    },
    suspend() {
      suspended = true;
      vad = idleVad();
      stopCapture(true);
      stopWebkit();
    },
    resume() {
      suspended = false;
      quietSince = 0;
      holdRecordSession();
      const pending = context?.resume();
      void Promise.resolve(pending).then(() => noteContext());
      if (!want || stopped) return;
      const track = stream?.getAudioTracks()[0];
      if (mode !== "webkit" && (!track || track.readyState !== "live")) {
        scheduleReopen("ended");
        return;
      }
      if (mode === "webkit") beginWebkit();
      else if (stream && context?.state === "running") options.onStatus("listening");
      else if (mode === "mic") options.onStatus("closed");
    },
    stop() {
      stopped = true;
      want = false;
      suspended = false;
      openGen += 1;
      stopWebkit();
      stopCapture(true);
      tearGraph();
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      void context?.close();
      context = null;
    },
  };
}
