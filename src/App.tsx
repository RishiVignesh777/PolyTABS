/**
 * PolyTABS - Main Application Entry
 * Orchestrates Game Shell, C-Engine Simulation, Deployment phase, Battle phase,
 * and Level Progression with permanent geometric unit unlocks.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UnitType,
  Team,
  SimPhase,
  FormationType,
  UNIT_CONFIGS
} from './types/game';
import { CSimulationEngine } from './engine/c_bridge';
import { CAMPAIGN_LEVELS } from './engine/campaign';
import { ArenaCanvas } from './components/ArenaCanvas';
import { TitleScreen } from './components/TitleScreen';
import { DeploymentDock } from './components/DeploymentDock';
import { BattleHUD } from './components/BattleHUD';
import { ModalOutcome } from './components/ModalOutcome';
import { ArchitectureModal } from './components/ArchitectureModal';
import { sound } from './engine/audio';

export default function App() {
  // Engine instance reference (persistent across renders)
  const engineRef = useRef<CSimulationEngine>(new CSimulationEngine(1200, 750));

  // Game UI States
  const [gameState, setGameState] = useState<'title' | 'playing'>('title');
  const [phase, setPhase] = useState<SimPhase>(SimPhase.DEPLOYMENT);
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [isSandbox, setIsSandbox] = useState<boolean>(false);
  const [sandboxTeam, setSandboxTeam] = useState<Team>(Team.BLUE);

  // Unlocked geometric units
  const [unlockedUnits, setUnlockedUnits] = useState<UnitType[]>([
    UnitType.SQUARE,
    UnitType.TRIANGLE
  ]);

  // Deployment configuration
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType>(UnitType.SQUARE);
  const [selectedFormation, setSelectedFormation] = useState<FormationType>('single');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);

  // Sync dataset.state on document.body for ultra-mode and zero-filter game shell
  useEffect(() => {
    if (gameState === 'title') {
      document.body.dataset.state = 'title';
    } else if (phase === SimPhase.DEPLOYMENT) {
      document.body.dataset.state = 'playing';
    } else if (phase === SimPhase.BATTLE) {
      document.body.dataset.state = 'playing';
    } else {
      document.body.dataset.state = 'gameover';
    }
  }, [gameState, phase]);

  // Support ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
    }
  }, []);

  // Current Level details
  const currentLevel = CAMPAIGN_LEVELS[currentLevelIdx] || CAMPAIGN_LEVELS[0];
  const playerBudget = isSandbox ? 99999 : currentLevel.playerBudget;

  // Calculate current spent cost for blue army
  const [currentCost, setCurrentCost] = useState<number>(0);
  const [unitCount, setUnitCount] = useState<number>(0);

  const updateArmyCounts = useCallback(() => {
    const units = engineRef.current.getUnits();
    const blueUnits = units.filter(u => u.team === Team.BLUE);
    const cost = blueUnits.reduce((sum, u) => sum + UNIT_CONFIGS[u.type].cost, 0);
    setCurrentCost(cost);
    setUnitCount(isSandbox ? units.length : blueUnits.length);
  }, [isSandbox]);

  // Load a Campaign Level
  const loadCampaignLevel = useCallback((levelIdx: number) => {
    const level = CAMPAIGN_LEVELS[levelIdx];
    if (!level) return;

    setCurrentLevelIdx(levelIdx);
    setIsSandbox(false);
    setPhase(SimPhase.DEPLOYMENT);
    engineRef.current.reset();

    // Spawn Enemy Army
    level.enemies.forEach(e => {
      engineRef.current.addUnit(e.type, Team.RED, e.x, e.y, e.angle);
    });

    updateArmyCounts();
  }, [updateArmyCounts]);

  // Initialize first level
  useEffect(() => {
    loadCampaignLevel(0);
  }, [loadCampaignLevel]);

  const [, setTick] = useState<number>(0);

  // Monitor engine phase changes and tick HUD during battle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === SimPhase.BATTLE) {
      interval = setInterval(() => {
        setTick(t => t + 1);
        const engPhase = engineRef.current.state.phase;
        if (engPhase !== SimPhase.BATTLE && engPhase !== SimPhase.DEPLOYMENT) {
          setPhase(engPhase);

          // Check for unit unlocks on victory
          if (engPhase === SimPhase.VICTORY_BLUE && currentLevel.rewardUnlockType !== undefined) {
            const reward = currentLevel.rewardUnlockType;
            setUnlockedUnits(prev => (prev.includes(reward) ? prev : [...prev, reward]));
          }
        }
      }, 120);
    }
    return () => clearInterval(interval);
  }, [phase, currentLevel]);

  // Unit placement handler
  const handlePlaceUnit = useCallback((type: UnitType, x: number, y: number): boolean => {
    const arenaW = engineRef.current.state.arenaWidth;
    const dividerX = arenaW * 0.48;
    const enemyZoneX = arenaW * 0.56;
    const targetTeam = isSandbox ? sandboxTeam : Team.BLUE;

    // Check bounds
    if (targetTeam === Team.BLUE && (x < 20 || x > dividerX)) return false;
    if (targetTeam === Team.RED && (x < enemyZoneX || x > arenaW - 20)) return false;

    // Check budget
    const cost = UNIT_CONFIGS[type].cost;
    if (!isSandbox && currentCost + cost > playerBudget) {
      return false;
    }

    engineRef.current.addUnit(type, targetTeam, x, y);
    updateArmyCounts();
    return true;
  }, [isSandbox, sandboxTeam, currentCost, playerBudget, updateArmyCounts]);

  // Unit removal handler
  const handleRemoveUnit = useCallback((id: number) => {
    engineRef.current.removeUnit(id);
    updateArmyCounts();
  }, [updateArmyCounts]);

  // Clear Army
  const handleClearArmy = useCallback(() => {
    if (isSandbox) {
      engineRef.current.reset();
    } else {
      const units = engineRef.current.getUnits();
      for (let i = units.length - 1; i >= 0; i--) {
        if (units[i].team === Team.BLUE) {
          engineRef.current.removeUnit(units[i].id);
        }
      }
    }
    updateArmyCounts();
  }, [isSandbox, updateArmyCounts]);

  // Auto-fill army within budget
  const handleAutoFill = useCallback(() => {
    handleClearArmy();
    let remainingBudget = playerBudget;
    const available = unlockedUnits.filter(u => UNIT_CONFIGS[u].cost <= remainingBudget);
    if (available.length === 0) return;

    // Frontline tank/squares + backline archers/support
    let currentX = 280;
    let currentY = 220;

    while (remainingBudget >= 100 && available.length > 0) {
      const type = available[Math.floor(Math.random() * available.length)];
      const cost = UNIT_CONFIGS[type].cost;
      if (remainingBudget >= cost) {
        engineRef.current.addUnit(type, Team.BLUE, currentX, currentY);
        remainingBudget -= cost;
        currentY += 60;
        if (currentY > 600) {
          currentY = 220;
          currentX -= 60;
        }
      } else {
        break;
      }
    }
    updateArmyCounts();
    sound.playPlaceUnit();
  }, [playerBudget, unlockedUnits, handleClearArmy, updateArmyCounts]);

  // Trigger Battle
  const handleStartBattle = useCallback(() => {
    if (unitCount === 0) return;
    sound.playBattleHorn();
    setPhase(SimPhase.BATTLE);
    engineRef.current.startBattle();
  }, [unitCount]);

  // Reset to deployment
  const handleResetToDeployment = useCallback(() => {
    setPhase(SimPhase.DEPLOYMENT);
    engineRef.current.state.phase = SimPhase.DEPLOYMENT;
    // Restore initial unit positions & HPs
    if (!isSandbox) {
      loadCampaignLevel(currentLevelIdx);
    } else {
      setPhase(SimPhase.DEPLOYMENT);
    }
  }, [isSandbox, currentLevelIdx, loadCampaignLevel]);

  // Next level
  const handleNextLevel = useCallback(() => {
    if (currentLevelIdx + 1 < CAMPAIGN_LEVELS.length) {
      loadCampaignLevel(currentLevelIdx + 1);
    } else {
      // Loop or go to sandbox
      setIsSandbox(true);
      setPhase(SimPhase.DEPLOYMENT);
    }
  }, [currentLevelIdx, loadCampaignLevel]);

  // Retry level
  const handleRetry = useCallback(() => {
    setPhase(SimPhase.DEPLOYMENT);
    loadCampaignLevel(currentLevelIdx);
  }, [currentLevelIdx, loadCampaignLevel]);

  // Open Sandbox Mode
  const handleOpenSandbox = useCallback(() => {
    setGameState('playing');
    setIsSandbox(true);
    setPhase(SimPhase.DEPLOYMENT);
    engineRef.current.reset();
    updateArmyCounts();
  }, [updateArmyCounts]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Global Keybindings (1-6 for shapes, Space for Attack, M for Mute)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
        return;
      }

      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 6) {
        const type = (keyNum - 1) as UnitType;
        if (unlockedUnits.includes(type)) {
          setSelectedUnitType(type);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, unlockedUnits, handleToggleMute]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      
      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={() => {
            setGameState('playing');
            loadCampaignLevel(0);
          }}
          onOpenSandbox={handleOpenSandbox}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
        />
      )}

      {/* Main 2D Arena Canvas */}
      <ArenaCanvas
        engine={engineRef.current}
        phase={phase}
        selectedUnitType={selectedUnitType}
        selectedFormation={selectedFormation}
        playerBudget={playerBudget}
        currentCost={currentCost}
        onPlaceUnit={handlePlaceUnit}
        onRemoveUnit={handleRemoveUnit}
        onAttackTrigger={handleStartBattle}
        isSandbox={isSandbox}
        sandboxTeam={sandboxTeam}
        speedMultiplier={speedMultiplier}
      />

      {/* Battle Status HUD (Perimeter Clusters) */}
      {gameState === 'playing' && (
        <BattleHUD
          engine={engineRef.current}
          phase={phase}
          levelTitle={currentLevel.name}
          speedMultiplier={speedMultiplier}
          onSetSpeed={setSpeedMultiplier}
          onResetToDeployment={handleResetToDeployment}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isSandbox={isSandbox}
        />
      )}

      {/* Deployment Dock (Bottom Perimeter) */}
      {gameState === 'playing' && phase === SimPhase.DEPLOYMENT && (
        <DeploymentDock
          unlockedUnits={unlockedUnits}
          selectedType={selectedUnitType}
          onSelectType={setSelectedUnitType}
          selectedFormation={selectedFormation}
          onSelectFormation={setSelectedFormation}
          playerBudget={playerBudget}
          currentCost={currentCost}
          onClearArmy={handleClearArmy}
          onAutoFill={handleAutoFill}
          onStartBattle={handleStartBattle}
          unitCount={unitCount}
          isSandbox={isSandbox}
          sandboxTeam={sandboxTeam}
          onToggleSandboxTeam={() =>
            setSandboxTeam(t => (t === Team.BLUE ? Team.RED : Team.BLUE))
          }
        />
      )}

      {/* Victory / Defeat Modal */}
      {gameState === 'playing' &&
        (phase === SimPhase.VICTORY_BLUE ||
          phase === SimPhase.VICTORY_RED ||
          phase === SimPhase.DRAW) && (
          <ModalOutcome
            phase={phase}
            simTime={engineRef.current.state.simTime}
            blueInitialCount={engineRef.current.state.blueInitialCount}
            blueAlive={engineRef.current.state.blueAlive}
            redInitialCount={engineRef.current.state.redInitialCount}
            redAlive={engineRef.current.state.redAlive}
            rewardUnlockType={currentLevel.rewardUnlockType}
            onNextLevel={handleNextLevel}
            onRetry={handleRetry}
            onReturnTitle={() => setGameState('title')}
            hasNextLevel={currentLevelIdx + 1 < CAMPAIGN_LEVELS.length}
            isSandbox={isSandbox}
          />
        )}

      {/* C Engine & Architecture Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

    </div>
  );
}
