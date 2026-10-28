/**
 * PolyTABS - Title Screen & Game Shell
 * Bespoke geometric SVG title lockup, atmospheric hero showcase, and start handshake.
 */

import React, { useEffect } from 'react';
import { Shield, Play, Box, Cpu, Swords } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenSandbox: () => void;
  onOpenArchitecture: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenSandbox,
  onOpenArchitecture
}) => {
  // Listen for Enter or Space to start
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between items-center p-8 bg-slate-950/90 select-none overflow-hidden">
      {/* Background ambient geometric particles & grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Top Bar with Version & C-ABI Badge */}
      <div className="relative z-10 w-full flex justify-between items-center text-xs tracking-widest text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CORE: C99 / WASM SIMULATION ENGINE</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenArchitecture}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition-colors text-slate-300 font-mono text-xs cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>C-ENGINE SPEC & ARCHITECTURE</span>
          </button>
        </div>
      </div>

      {/* Hero Title & Emblem Centerpiece */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl text-center my-auto">
        {/* Custom SVG Geometric War Crest */}
        <div className="mb-6 relative">
          <svg className="w-32 h-32 drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]" viewBox="0 0 120 120">
            {/* Outer Diamond */}
            <polygon
              points="60,10 110,60 60,110 10,60"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            {/* Square Melee Soldier (Blue) */}
            <rect
              x="26"
              y="38"
              width="24"
              height="24"
              fill="#3b82f6"
              stroke="#93c5fd"
              strokeWidth="2"
              transform="rotate(-15 38 50)"
            />
            {/* Triangle Archer (Emerald) */}
            <polygon
              points="60,24 74,48 46,48"
              fill="#10b981"
              stroke="#6ee7b7"
              strokeWidth="2"
            />
            {/* Pentagon Heavy Tank (Violet) */}
            <polygon
              points="60,68 82,78 74,102 46,102 38,78"
              fill="#8b5cf6"
              stroke="#c4b5fd"
              strokeWidth="2"
            />
            {/* Circle Cavalry (Amber) */}
            <circle
              cx="82"
              cy="52"
              r="12"
              fill="#f59e0b"
              stroke="#fcd34d"
              strokeWidth="2"
            />
            {/* Center Crossed Battle Swords */}
            <line x1="42" y1="42" x2="78" y2="78" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="78" y1="42" x2="42" y2="78" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title Lockup */}
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white uppercase font-display drop-shadow-md">
          POLY<span className="text-sky-400">TABS</span>
        </h1>
        <p className="mt-2 text-sm md:text-base font-semibold tracking-wider text-sky-200/80 uppercase font-mono">
          2D Tactical Battle Simulator
        </p>

        <p className="mt-4 text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed font-sans">
          Deploy geometric regiments, formulate battle lines, and trigger the pure C simulation loop.
          Witness goofy TABS ragdoll physics, elastic unit collisions, and tactical shape synergies!
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            data-start="true"
            onClick={onStartGame}
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold font-display text-lg tracking-wider shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
          >
            <Play className="w-5 h-5 fill-slate-950 transition-transform group-hover:scale-110" />
            <span>START CAMPAIGN</span>
          </button>

          <button
            onClick={onOpenSandbox}
            className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 active:scale-95 text-slate-200 font-display text-base tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Swords className="w-4 h-4 text-amber-400" />
            <span>CUSTOM SANDBOX</span>
          </button>
        </div>
      </div>

      {/* Flat Control Hints Footer */}
      <div className="relative z-10 w-full text-center text-xs font-mono text-slate-500 border-t border-slate-800/80 pt-4">
        <span>WASD / Drag Pan · Scroll Zoom · 1-6 Select Shape · Space Trigger Battle · Esc Return</span>
      </div>
    </div>
  );
};
