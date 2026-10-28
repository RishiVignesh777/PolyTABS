/**
 * PolyTABS - Battle HUD
 * World-matched, low-occlusion perimeter status cluster with live army gauges,
 * simulation speed controls, sound toggle, and C architecture inspector trigger.
 */

import React from 'react';
import { SimPhase } from '../types/game';
import { CSimulationEngine } from '../engine/c_bridge';
import { Volume2, VolumeX, RotateCcw, Cpu, Pause, Play, FastForward } from 'lucide-react';

interface BattleHUDProps {
  engine: CSimulationEngine;
  phase: SimPhase;
  levelTitle: string;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
  onResetToDeployment: () => void;
  onOpenArchitecture: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isSandbox: boolean;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  engine,
  phase,
  levelTitle,
  speedMultiplier,
  onSetSpeed,
  onResetToDeployment,
  onOpenArchitecture,
  isMuted,
  onToggleMute,
  isSandbox
}) => {
  const state = engine.state;
  const blueHpMax = Math.max(state.blueTotalHp, 1);
  const redHpMax = Math.max(state.redTotalHp, 1);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col gap-2">
      <div className="w-full flex items-center justify-between gap-4">
        
        {/* Left Cluster: Blue Army Status */}
        <div className="bg-slate-900/90 border border-blue-900/60 rounded-lg p-2.5 shadow-xl pointer-events-auto min-w-[180px] sm:min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-blue-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              BLUE FORCES
            </span>
            <span className="text-slate-300 tabular-nums font-bold">
              {state.blueAlive} UNITS
            </span>
          </div>
          {/* Blue HP Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className="h-full bg-blue-500 transition-all duration-150"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (state.blueTotalHp / (state.blueTotalHp + 0.001)) * 100)
                )}%`
              }}
            />
          </div>
        </div>

        {/* Center Cluster: Level Info, Time & Speed Controls */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-4 py-2 shadow-xl pointer-events-auto flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className="text-xs font-display font-bold text-slate-200 tracking-wide">
              {isSandbox ? 'CUSTOM SANDBOX' : levelTitle}
            </span>
            {phase === SimPhase.BATTLE && (
              <span className="text-xs font-mono font-bold text-amber-400 tabular-nums bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                T+ {state.simTime.toFixed(1)}s
              </span>
            )}
          </div>

          {/* Speed Controls during battle */}
          {phase === SimPhase.BATTLE && (
            <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-800/80">
              <button
                onClick={() => onSetSpeed(speedMultiplier === 0 ? 1 : 0)}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  speedMultiplier === 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={speedMultiplier === 0 ? 'Resume' : 'Pause'}
              >
                {speedMultiplier === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => onSetSpeed(s)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                    speedMultiplier === s
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Cluster: Red Army Status */}
        <div className="bg-slate-900/90 border border-rose-900/60 rounded-lg p-2.5 shadow-xl pointer-events-auto min-w-[180px] sm:min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              RED FORCES
            </span>
            <span className="text-slate-300 tabular-nums font-bold">
              {state.redAlive} UNITS
            </span>
          </div>
          {/* Red HP Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className="h-full bg-rose-500 transition-all duration-150"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (state.redTotalHp / (state.redTotalHp + 0.001)) * 100)
                )}%`
              }}
            />
          </div>
        </div>

      </div>

      {/* Top Right Utility Controls (Reset / Deploy, Mute, C-Engine Spec) */}
      <div className="self-end flex items-center gap-2 pointer-events-auto mt-1">
        {phase === SimPhase.BATTLE && (
          <button
            onClick={onResetToDeployment}
            className="px-3 py-1 text-xs font-mono bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-md flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Setup</span>
          </button>
        )}

        <button
          onClick={onToggleMute}
          title="Toggle Audio [M]"
          className="p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-md shadow-md cursor-pointer transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={onOpenArchitecture}
          className="px-2.5 py-1 text-xs font-mono bg-slate-900/90 hover:bg-slate-800 border border-sky-600/60 text-sky-300 rounded-md flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">C Engine Inspector</span>
        </button>
      </div>
    </div>
  );
};
