import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_VOICE_SECONDS,
  VOICE_BITS_PER_SECOND,
  baseAudioMime,
  pickVoiceMime,
} from "./feedback-rules";

export type VoiceState =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "recording"; startedAt: number }
  | { phase: "ready"; blob: Blob; url: string; ms: number }
  | { phase: "error"; message: string };

export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/**
 * One short voice note with MediaRecorder. The microphone is opened only while
 * recording and every track is stopped the moment recording ends, so it never
 * overlaps the arena caller's own microphone and the phone's audio goes back to
 * normal playback (an open microphone on an iPhone lowers playback volume).
 * start() must run inside a tap so Safari will ask for the microphone.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceState>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const capRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);
  /** Bumped by every start/reset, so a late callback from an old recording is ignored. */
  const genRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    if (capRef.current != null) window.clearTimeout(capRef.current);
    timerRef.current = null;
    capRef.current = null;
  }, []);

  /** Stops the current recording and closes the microphone, keeping nothing. */
  const abandon = useCallback(() => {
    genRef.current += 1;
    clearTimers();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Already stopped.
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, [clearTimers]);

  /** Finish recording. The note becomes ready to play back. */
  const stop = useCallback(() => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, [clearTimers]);

  /** Drop any recording and close the microphone. */
  const reset = useCallback(() => {
    abandon();
    setElapsed(0);
    setState({ phase: "idle" });
  }, [abandon]);

  const start = useCallback(async () => {
    abandon();
    const gen = genRef.current;
    setElapsed(0);
    if (!voiceSupported()) {
      setState({
        phase: "error",
        message: "This browser can't record a voice note. You can still type your feedback.",
      });
      return;
    }
    setState({ phase: "asking" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch (err) {
      if (gen !== genRef.current) return;
      const name = err instanceof DOMException ? err.name : "";
      setState({
        phase: "error",
        message:
          name === "NotAllowedError" || name === "SecurityError"
            ? "Microphone access is off for XSalute. You can turn it on in your phone's settings, or just type your feedback."
            : "The microphone couldn't start. You can still type your feedback.",
      });
      return;
    }
    const closeOwn = () => stream.getTracks().forEach((track) => track.stop());
    if (gen !== genRef.current) {
      closeOwn();
      return;
    }
    streamRef.current = stream;
    const mime = pickVoiceMime((type) => MediaRecorder.isTypeSupported(type));
    let recorder: MediaRecorder;
    try {
      const options: MediaRecorderOptions = { audioBitsPerSecond: VOICE_BITS_PER_SECOND };
      if (mime) options.mimeType = mime;
      recorder = new MediaRecorder(stream, options);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        closeOwn();
        streamRef.current = null;
        setState({
          phase: "error",
          message: "This browser can't record a voice note. You can still type your feedback.",
        });
        return;
      }
    }
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      // Close the microphone straight away, before the note is played back.
      closeOwn();
      if (gen !== genRef.current) return;
      clearTimers();
      recorderRef.current = null;
      streamRef.current = null;
      const type = baseAudioMime(recorder.mimeType || mime || chunks[0]?.type || "") || "audio/mp4";
      const blob = new Blob(chunks, { type });
      const ms = Math.min(Date.now() - startedAt, MAX_VOICE_SECONDS * 1000);
      if (blob.size === 0) {
        setState({
          phase: "error",
          message: "Nothing was recorded. Try again, or type your feedback.",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setElapsed(ms);
      setState({ phase: "ready", blob, url, ms });
    };
    recorder.onerror = () => {
      closeOwn();
      if (gen !== genRef.current) return;
      genRef.current += 1;
      clearTimers();
      recorderRef.current = null;
      streamRef.current = null;
      setState({
        phase: "error",
        message: "The recording stopped unexpectedly. Try again, or type your feedback.",
      });
    };
    recorderRef.current = recorder;
    // A timeslice makes Safari hand over audio as it goes, not only at stop().
    recorder.start(1000);
    setState({ phase: "recording", startedAt });
    timerRef.current = window.setInterval(() => setElapsed(Date.now() - startedAt), 250);
    capRef.current = window.setTimeout(() => stop(), MAX_VOICE_SECONDS * 1000);
  }, [abandon, clearTimers, stop]);

  // Leaving the app or locking the phone ends a recording, so the microphone
  // never stays open in the background.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  useEffect(() => () => abandon(), [abandon]);

  return { state, elapsed, start, stop, reset };
}
