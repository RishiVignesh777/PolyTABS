/**
 * PolyTABS - Victory / Defeat Modal
 * Shows battle statistics, unlocked unit rewards, and transitions with data-start buttons.
 */

import React, { useEffect } from 'react';
import { SimPhase, UnitType, UNIT_CONFIGS } from '../types/game';
import { Trophy, Skull, ArrowRight, RotateCcw, Sparkles, Home } from 'lucide-react';
import { sound } from '../engine/audio';

interface ModalOutcomeProps {
  phase: SimPhase;
  simTime: number;
  blueInitialCount: number;
  blueAlive: number;
  redInitialCount: number;
  redAlive: number;
  rewardUnlockType?: UnitType;
  onNextLevel: () => void;
  onRetry: () => void;
  onReturnTitle: () => void;
  hasNextLevel: boolean;
  isSandbox: boolean;
}

export const ModalOutcome: React.FC<ModalOutcomeProps> = ({
  phase,
  simTime,
  blueInitialCount,
  blueAlive,
  redInitialCount,
  redAlive,
  rewardUnlockType,
  onNextLevel,
  onRetry,
  onReturnTitle,
  hasNextLevel,
  isSandbox
}) => {
  const isVictory = phase === SimPhase.VICTORY_BLUE;
  const isDraw = phase === SimPhase.DRAW;

  // Play audio on mount
  useEffect(() => {
    if (isVictory) {
      sound.playVictory();
    } else {
      sound.playDefeat();
    }
  }, [isVictory]);

  const blueLosses = Math.max(0, blueInitialCount - blueAlive);
  const redLosses = Math.max(0, redInitialCount - redAlive);

  const unlockedConfig = rewardUnlockType !== undefined ? UNIT_CONFIGS[rewardUnlockType] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        
        {/* Outcome Header Banner */}
        <div className="mb-4">
          {isVictory ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black tracking-wider text-amber-400 uppercase">
                VICTORY ACHIEVED!
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-300 mt-1">
                Opposing geometric forces have been eliminated.
              </p>
            </div>
          ) : isDraw ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/40 border-2 border-slate-400 flex items-center justify-center text-slate-300 mb-3">
                <RotateCcw className="w-8 h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black tracking-wider text-slate-200 uppercase">
                MUTUAL ANNIHILATION
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-400 mt-1">
                Both armies perished simultaneously.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <Skull className="w-8 h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black tracking-wider text-rose-500 uppercase">
                DEFEAT
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-300 mt-1">
                Your formation was broken. Reform your battle line and strike again!
              </p>
            </div>
          )}
        </div>

        {/* Combat Analytics Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-2.5 my-4">
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">DURATION</span>
            <span className="text-lg font-mono font-bold text-sky-400 tabular-nums">
              {simTime.toFixed(1)}s
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">SURVIVORS</span>
            <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
              {blueAlive} / {blueInitialCount}
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">ENEMIES SLAIN</span>
            <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
              {redLosses}
            </span>
          </div>
        </div>

        {/* Reward Card: Permanent Unit Unlock! */}
        {isVictory && unlockedConfig && (
          <div className="w-full bg-gradient-to-r from-sky-950/70 via-blue-900/40 to-sky-950/70 border border-sky-500/50 rounded-xl p-3.5 my-2 flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-lg bg-sky-900/60 border border-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-sky-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  NEW UNIT UNLOCKED
                </span>
                <span className="text-sm font-display font-bold text-white">
                  {unlockedConfig.name} ({unlockedConfig.role})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {unlockedConfig.description}
              </p>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3 mt-4">
          <button
            onClick={onReturnTitle}
            className="w-full sm:w-auto px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Title Screen</span>
          </button>

          {isVictory && hasNextLevel && !isSandbox ? (
            <button
              data-start="true"
              onClick={onNextLevel}
              className="flex-1 w-full px-6 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-display font-bold text-base tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer transition-all"
            >
              <span>NEXT LEVEL</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              data-start="true"
              onClick={onRetry}
              className="flex-1 w-full px-6 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-display font-bold text-base tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30 cursor-pointer transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span>{isVictory ? 'PLAY AGAIN' : 'RETRY BATTLE'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
