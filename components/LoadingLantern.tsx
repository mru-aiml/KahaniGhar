"use client";

import { useEffect, useState } from "react";

const lines = ["Lighting the lantern...", "Gathering the words...", "Shaping the story...", "Almost ready..."];

export default function LoadingLantern({ label }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-kg-amber/30" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-kg-amber text-3xl text-kg-night">
          🏮
        </div>
      </div>
      <p className="font-heading text-lg text-kg-amber">{label ?? lines[i]}</p>
      <p className="text-sm text-kg-cream/50">{lines[i]}</p>
    </div>
  );
}