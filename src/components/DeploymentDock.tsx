/**
 * PolyTABS - Deployment Dock
 * Perimeter dock for selecting units, formations, budget allocation, and triggering the C battle loop.
 */

import React from 'react';
import {
  UnitType,
  Team,
  FormationType,
  UNIT_CONFIGS
} from '../types/game';
import { Swords, Trash2, Wand2, Shield, CircleDot, Flame, Crosshair } from 'lucide-react';

interface DeploymentDockProps {
  unlockedUnits: UnitType[];
  selectedType: UnitType;
  onSelectType: (type: UnitType) => void;
  selectedFormation: FormationType;
  onSelectFormation: (formation: FormationType) => void;
  playerBudget: number;
  currentCost: number;
  onClearArmy: () => void;
  onAutoFill: () => void;
  onStartBattle: () => void;
  unitCount: number;
  isSandbox: boolean;
  sandboxTeam: Team;
  onToggleSandboxTeam: () => void;
}

export const DeploymentDock: React.FC<DeploymentDockProps> = ({
  unlockedUnits,
  selectedType,
  onSelectType,
  selectedFormation,
  onSelectFormation,
  playerBudget,
  currentCost,
  onClearArmy,
  onAutoFill,
  onStartBattle,
  unitCount,
  isSandbox,
  sandboxTeam,
  onToggleSandboxTeam
}) => {
  const budgetRatio = isSandbox ? 0 : Math.min(1, currentCost / (playerBudget || 1));
  const isOverBudget = !isSandbox && currentCost > playerBudget;
  const canAttack = isSandbox ? unitCount >= 2 : unitCount > 0 && !isOverBudget;

  const allTypes = [
    UnitType.SQUARE,
    UnitType.TRIANGLE,
    UnitType.CIRCLE,
    UnitType.PENTAGON,
    UnitType.HEXAGON,
    UnitType.STAR
  ];

  const formations: Array<{ type: FormationType; label: string }> = [
    { type: 'single', label: 'Single' },
    { type: 'line', label: 'Line (5)' },
    { type: 'wedge', label: 'Wedge (5)' },
    { type: 'flank', label: 'Flank (4)' },
    { type: 'box', label: 'Box (4)' }
  ];

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col items-center pointer-events-none">
      <div className="w-full max-w-5xl bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-none pointer-events-auto flex flex-col gap-2.5">
        
        {/* Top Dock Bar: Budget & Formation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
          {/* Budget Meter */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-slate-400">
              {isSandbox ? 'SANDBOX RECRUITMENT' : 'ARMY BUDGET:'}
            </span>
            {!isSandbox ? (
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${
                    isOverBudget ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  ${currentCost} / ${playerBudget}
                </span>
                <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isOverBudget ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, budgetRatio * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={onToggleSandboxTeam}
                className={`px-3 py-1 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  sandboxTeam === Team.BLUE
                    ? 'bg-blue-900/60 border-blue-500 text-blue-200'
                    : 'bg-red-900/60 border-red-500 text-red-200'
                }`}
              >
                DEPLOYING AS: {sandboxTeam === Team.BLUE ? 'BLUE ARMY' : 'RED ARMY'} (CLICK TO SWITCH)
              </button>
            )}
          </div>

          {/* Formations Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">FORMATION:</span>
            {formations.map(f => (
              <button
                key={f.type}
                onClick={() => onSelectFormation(f.type)}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                  selectedFormation === f.type
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Actions: Auto-fill & Clear */}
          <div className="flex items-center gap-2">
            {!isSandbox && (
              <button
                onClick={onAutoFill}
                title="Auto-fill army within budget"
                className="px-2.5 py-1 text-xs font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Wand2 className="w-3 h-3 text-amber-400" />
                <span>Auto-Fill</span>
              </button>
            )}
            <button
              onClick={onClearArmy}
              title="Clear all deployed units"
              className="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-rose-300 bg-slate-800/70 hover:bg-rose-950/40 rounded border border-slate-700 hover:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Unit Selection Cards + Big ATTACK Button */}
        <div className="flex items-center justify-between gap-3">
          {/* Unit Cards Roster */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
            {allTypes.map((type, idx) => {
              const cfg = UNIT_CONFIGS[type];
              const isUnlocked = unlockedUnits.includes(type);
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  disabled={!isUnlocked}
                  onClick={() => onSelectType(type)}
                  className={`relative flex flex-col items-center min-w-[76px] sm:min-w-[88px] p-2 rounded-lg border transition-all cursor-pointer ${
                    !isUnlocked
                      ? 'opacity-35 bg-slate-900 border-slate-800 cursor-not-allowed'
                      : isSelected
                      ? 'bg-slate-800 border-sky-400 ring-2 ring-sky-500/30'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {/* Hotkey badge */}
                  <span className="absolute top-1 left-1.5 text-[10px] font-mono text-slate-400">
                    [{idx + 1}]
                  </span>

                  {/* Geometric Shape Icon */}
                  <div className="w-8 h-8 my-1 flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 40 40">
                      {type === UnitType.SQUARE && (
                        <rect x="6" y="6" width="28" height="28" fill="#3b82f6" stroke="#93c5fd" strokeWidth="2" />
                      )}
                      {type === UnitType.TRIANGLE && (
                        <polygon points="20,4 36,34 4,34" fill="#10b981" stroke="#6ee7b7" strokeWidth="2" />
                      )}
                      {type === UnitType.CIRCLE && (
                        <circle cx="20" cy="20" r="16" fill="#f59e0b" stroke="#fcd34d" strokeWidth="2" />
                      )}
                      {type === UnitType.PENTAGON && (
                        <polygon points="20,4 36,16 30,36 10,36 4,16" fill="#8b5cf6" stroke="#c4b5fd" strokeWidth="2" />
                      )}
                      {type === UnitType.HEXAGON && (
                        <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="#06b6d4" stroke="#67e8f9" strokeWidth="2" />
                      )}
                      {type === UnitType.STAR && (
                        <polygon points="20,2 25,14 38,14 27,22 31,34 20,26 9,34 13,22 2,14 15,14" fill="#ec4899" stroke="#f472b6" strokeWidth="2" />
                      )}
                    </svg>
                  </div>

                  {/* Name & Cost */}
                  <span className="text-xs font-display font-semibold text-slate-100 truncate w-full text-center">
                    {cfg.name}
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    ${cfg.cost}
                  </span>

                  {!isUnlocked && (
                    <span className="text-[9px] font-mono text-slate-400 mt-0.5">LOCKED</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ATTACK Button */}
          <button
            onClick={onStartBattle}
            disabled={!canAttack}
            className={`px-6 py-4 rounded-xl font-display font-black tracking-widest text-lg flex items-center gap-3 transition-all ${
              canAttack
                ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:brightness-110 active:scale-95 text-white shadow-lg shadow-rose-600/40 cursor-pointer animate-pulse'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Swords className="w-6 h-6" />
            <span>ATTACK!</span>
          </button>
        </div>

      </div>
    </div>
  );
};
