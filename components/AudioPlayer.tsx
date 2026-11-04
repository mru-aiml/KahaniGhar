"use client";

import { useEffect, useState } from "react";

const SPEEDS = [0.8, 1, 1.25];

export default function AudioPlayer({
  sceneCount,
  currentScene,
  onSceneChange,
}: {
  sceneCount: number;
  currentScene: number;
  onSceneChange: (i: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          // advance scene
          if (currentScene < sceneCount - 1) {
            onSceneChange(currentScene + 1);
          }
          return 0;
        }
        return p + 4 * speed;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [playing, speed, currentScene, sceneCount, onSceneChange]);

  // Reset progress when scene changes (deferred to avoid synchronous setState in effect).
  useEffect(() => {
    const t = setTimeout(() => setProgress(0), 0);
    return () => clearTimeout(t);
  }, [currentScene]);

  return (
    <div className="rounded-2xl border border-white/10 bg-kg-cream/5 p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-kg-amber text-kg-night text-xl"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-kg-teal transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-kg-cream/50">
            <span>Scene {currentScene + 1} / {sceneCount}</span>
            <span>{playing ? "Playing" : "Paused"}</span>
          </div>
        </div>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-kg-night px-2 py-1 text-xs text-kg-cream"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs text-kg-cream/40">
        Demo audio simulation. Real narration uses Gnani Timbre.
      </p>
    </div>
  );
}