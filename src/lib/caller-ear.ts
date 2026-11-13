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
 * short clip instead. The first arm() must run inside a tap.
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

  function log(line: string) {
    options.onLog(line);
  }

  function accept(heard: string) {
    options.onHeard?.(heard);
    const command = commandFromTranscript(heard, suspended);
    log(`mic: heard ${JSON.stringify(heard)}`);
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

  function finishClip(blob: Blob, seconds: number) {
    if (discardClip || !options.transcribe) return;
    if (blob.size < 400) {
      log(`mic: clip too small (${blob.size})`);
      options.onHeard?.("");
      return;
    }
    log("mic: sending a clip");
    void options
      .transcribe(blob, seconds)
      .then((text) => {
        if (text) accept(text);
        else options.onHeard?.("");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        log(`mic: error ${message}`);
        options.onHeard?.(message);
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

  function onRms(rms: number) {
    const stepped = stepVad(vad, rms, 100, suspended);
    vad = stepped.next;
    if (stepped.action === "start" && stream && !recorder) {
      try {
        const mime = mimeType();
        const next = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        const started = now();
        const chunks: Blob[] = [];
        next.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        next.onstop = () => {
          const blob = new Blob(chunks, { type: next.mimeType || mime || "audio/mp4" });
          finishClip(blob, Math.max(1, (now() - started) / 1000));
        };
        recorder = next;
        discardClip = false;
        next.start(250);
        log("mic: clip");
      } catch (err) {
        log(`mic: error ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (stepped.action === "stop") stopRecorder(false);
    if (stepped.action === "discard") stopRecorder(true);
  }

  function listenLevel() {
    if (!context || !stream) return;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
      onRms(Math.sqrt(sum / data.length));
    }, 100) as unknown as number;
  }

  function armMic() {
    if (!options.openMic && !navigator.mediaDevices?.getUserMedia) {
      options.onStatus("unsupported");
      return;
    }
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx || typeof MediaRecorder === "undefined") {
      options.onStatus("unsupported");
      return;
    }
    if (!context) context = new AudioCtx();
    void context.resume();
    const open = options.openMic ?? (() => navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    }));
    void open()
      .then((opened) => {
        if (stopped || !want) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        options.onStatus("listening");
        log("mic: ready");
        listenLevel();
      })
      .catch((err) => {
        const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
        log(`mic: error ${name || (err instanceof Error ? err.message : String(err))}`);
        options.onStatus(name === "NotAllowedError" || name === "SecurityError" ? "permission" : "unsupported");
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
      else options.onStatus("listening");
    },
    suspend() {
      suspended = true;
      vad = idleVad();
      stopRecorder(true);
      stopWebkit();
    },
    resume() {
      suspended = false;
      void context?.resume();
      if (!want || stopped) return;
      if (mode === "webkit") beginWebkit();
      else if (stream) options.onStatus("listening");
    },
    stop() {
      stopped = true;
      want = false;
      suspended = false;
      stopWebkit();
      stopRecorder(true);
      if (timer != null) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      void context?.close();
      context = null;
    },
  };
}
