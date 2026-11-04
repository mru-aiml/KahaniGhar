"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create" },
  { href: "/library", label: "My Storybook" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-kg-night/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl text-kg-amber">
          <span className="inline-block h-7 w-7 rounded-full bg-kg-amber/20 text-center leading-7">📖</span>
          KahaniGhar
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-kg-cream/80 hover:text-kg-amber">
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          className="md:hidden rounded-lg p-2 text-kg-cream"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 bg-kg-night px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-kg-cream/80 hover:text-kg-amber"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}