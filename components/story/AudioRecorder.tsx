"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError?: (error: string) => void;
  maxDurationSeconds?: number;
  maxSizeBytes?: number;
}

const MAX_DURATION_SECONDS = 30;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function AudioRecorder({
  onRecordingComplete,
  onError,
  maxDurationSeconds = MAX_DURATION_SECONDS,
  maxSizeBytes = MAX_SIZE_BYTES,
}: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "paused" | "preview">("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const reset = useCallback(() => {
    cleanup();
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
    setError(null);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    chunksRef.current = [];
  }, [cleanup]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setMicPermission("granted");
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
        if (blob.size > 0) {
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setState("preview");
        } else {
          setError("Recording is empty. Please try again.");
          setState("idle");
        }
        cleanup();
      };

      mediaRecorder.start(100);
      setState("recording");
      // eslint-disable-next-line react-hooks/purity
      startTimeRef.current = Date.now() - pausedTimeRef.current;

      timerRef.current = setInterval(() => {
        // eslint-disable-next-line react-hooks/purity
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording failed. Please try again.");
        stopRecording();
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicPermission("denied");
        setError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
      } else {
        console.error("Recording error:", err);
        setError("Failed to start recording. Please try again.");
      }
      setState("idle");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      // eslint-disable-next-line react-hooks/purity
      pausedTimeRef.current = Date.now() - startTimeRef.current;
      setState("paused");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      // eslint-disable-next-line react-hooks/purity
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      setState("recording");
      timerRef.current = setInterval(() => {
        // eslint-disable-next-line react-hooks/purity
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (state === "recording" || state === "paused")) {
      mediaRecorderRef.current.stop();
    }
  };

  const discardRecording = () => {
    cleanup();
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
    pausedTimeRef.current = 0;
  };

  const handleConfirm = () => {
    if (audioBlob && audioBlob.size > 0) {
      if (audioBlob.size > maxSizeBytes) {
        setError(`Recording is too large (${Math.round(audioBlob.size / 1024)} KB). Maximum size is ${Math.round(maxSizeBytes / 1024)} KB.`);
        return;
      }
      onRecordingComplete(audioBlob, duration);
      reset();
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-kg-cream/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-kg-cream">Record your memory</h3>
        <span className={`text-sm font-mono ${state === "recording" ? "text-kg-danger" : "text-kg-cream/60"}`}>
          {formatTime(duration)} / {formatTime(maxDurationSeconds)}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-kg-danger/20 border border-kg-danger/30 text-sm text-kg-danger" role="alert">
          {error}
        </div>
      )}

      {micPermission === "denied" && (
        <div className="mb-4 p-3 rounded-lg bg-kg-danger/20 border border-kg-danger/30 text-sm text-kg-danger">
          Microphone access is blocked. Please enable microphone permissions in your browser settings and refresh the page.
        </div>
      )}

      {state === "idle" && (
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-kg-teal/20">
            <svg className="h-10 w-10 text-kg-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h10m-7 4a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
          <p className="text-kg-cream/60 mb-4">Tap the button below to start recording your memory</p>
          <p className="text-xs text-kg-cream/40 mb-6">Maximum {Math.round(maxDurationSeconds / 60)} minute, max 5 MB</p>
          <button
            onClick={startRecording}
            disabled={micPermission === "denied"}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kg-amber text-kg-night text-2xl focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night transition-transform hover:scale-105 active:scale-95"
            aria-label="Start recording"
          >
            🎙
          </button>
        </div>
      )}

      {state === "recording" && (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 relative">
            <div className="mx-auto h-20 w-20 rounded-full bg-kg-danger/20 animate-pulse" />
            <div className="absolute inset-0 flex h-20 w-20 items-center justify-center">
              <svg className="h-10 w-10 text-kg-danger animate-pulse" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path fillRule="evenodd" d="M9 15c0 1.66 1.34 3 3 3h6c1.66 0 3-1.34 3-3v-2H9v2zm9-6c0 1.11-.89 2-2 2s-2-.89-2-2H9c0 1.11.89 2 2 2h10zm-6 8c1.11 0 2-.89 2-2s-.89-2-2-2H9c-1.11 0-2 .89-2 2v2h10v-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={pauseRecording}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-kg-cream/10 text-kg-cream focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Pause recording"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </button>
            <button
              onClick={stopRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-kg-danger text-white focus:outline-none focus:ring-2 focus:ring-kg-danger focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Stop recording"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {state === "paused" && (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-kg-amber/20">
            <svg className="h-10 w-10 text-kg-amber" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </div>
          <p className="text-kg-cream/60 mb-4">Recording paused</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={resumeRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-kg-amber text-kg-night focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Resume recording"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4v16h4V4H6zm8 0v16h4V4h-4z" />
              </svg>
            </button>
            <button
              onClick={stopRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-kg-danger text-white focus:outline-none focus:ring-2 focus:ring-kg-danger focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Stop and save recording"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </button>
            <button
              onClick={discardRecording}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-kg-cream/10 text-kg-cream focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Discard recording"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {state === "preview" && audioUrl && (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-kg-teal/20">
            <svg className="h-10 w-10 text-kg-teal" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <p className="text-kg-cream/60 mb-4">Preview your recording</p>
          <audio controls className="w-full max-w-xs mx-auto mb-4" src={audioUrl} />
          <div className="text-sm text-kg-cream/50 mb-4">
            Duration: {formatTime(duration)} • Size: {Math.round((audioBlob?.size || 0) / 1024)} KB
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={discardRecording}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-kg-cream/10 text-kg-cream focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Re-record"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleConfirm}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-kg-amber text-kg-night focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              aria-label="Use this recording"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-center text-kg-cream/40">
        Maximum {Math.round(maxDurationSeconds / 60)} minute recording • Maximum 5 MB • Audio recorded in browser
      </p>
    </div>
  );
}