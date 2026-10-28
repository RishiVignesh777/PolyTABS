/**
 * PolyTABS - 2D Battle Arena Canvas
 * High-performance 60fps Canvas2D renderer with camera pan/zoom,
 * TABS-style ragdoll wobble physics, particle pool, and combat feedback.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Unit,
  Projectile,
  UnitType,
  Team,
  SimPhase,
  FormationType,
  UNIT_CONFIGS
} from '../types/game';
import { CSimulationEngine, SimEvent } from '../engine/c_bridge';
import { sound } from '../engine/audio';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

interface ArenaCanvasProps {
  engine: CSimulationEngine;
  phase: SimPhase;
  selectedUnitType: UnitType;
  selectedFormation: FormationType;
  playerBudget: number;
  currentCost: number;
  onPlaceUnit: (type: UnitType, x: number, y: number) => boolean;
  onRemoveUnit: (id: number) => void;
  onAttackTrigger: () => void;
  isSandbox: boolean;
  sandboxTeam: Team;
  speedMultiplier: number;
  onUnitSelectInspect?: (unit: Unit | null) => void;
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  engine,
  phase,
  selectedUnitType,
  selectedFormation,
  playerBudget,
  currentCost,
  onPlaceUnit,
  onRemoveUnit,
  onAttackTrigger,
  isSandbox,
  sandboxTeam,
  speedMultiplier,
  onUnitSelectInspect
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    camStartX: 0,
    camStartY: 0
  });

  // Cursor in world space
  const mouseWorldRef = useRef<{ x: number; y: number; inCanvas: boolean }>({
    x: 0,
    y: 0,
    inCanvas: false
  });

  // Particles & floating text pools (Zero-GC preallocated pools)
  const particlesRef = useRef<Particle[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const nextTextIdRef = useRef(1);

  // Screen shake timer
  const screenShakeRef = useRef({ intensity: 0, duration: 0 });

  // Formation preview offsets
  const getFormationOffsets = useCallback((formation: FormationType): Array<{ dx: number; dy: number }> => {
    switch (formation) {
      case 'line':
        return [
          { dx: 0, dy: -60 },
          { dx: 0, dy: -30 },
          { dx: 0, dy: 0 },
          { dx: 0, dy: 30 },
          { dx: 0, dy: 60 }
        ];
      case 'wedge':
        return [
          { dx: 30, dy: 0 },
          { dx: 0, dy: -35 },
          { dx: 0, dy: 35 },
          { dx: -30, dy: -70 },
          { dx: -30, dy: 70 }
        ];
      case 'flank':
        return [
          { dx: 0, dy: -120 },
          { dx: 0, dy: -80 },
          { dx: 0, dy: 80 },
          { dx: 0, dy: 120 }
        ];
      case 'box':
        return [
          { dx: -20, dy: -20 },
          { dx: 20, dy: -20 },
          { dx: -20, dy: 20 },
          { dx: 20, dy: 20 }
        ];
      case 'spread':
        return [
          { dx: -40, dy: -50 },
          { dx: 20, dy: -30 },
          { dx: 0, dy: 0 },
          { dx: -30, dy: 40 },
          { dx: 30, dy: 50 }
        ];
      case 'single':
      default:
        return [{ dx: 0, dy: 0 }];
    }
  }, []);

  // Screen to World helper
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);

    const x = (screenX - rect.left - cw / 2) / cam.zoom + cam.x;
    const y = (screenY - rect.top - ch / 2) / cam.zoom + cam.y;
    return { x, y };
  }, []);

  // Center camera on arena
  useEffect(() => {
    cameraRef.current.x = engine.state.arenaWidth / 2;
    cameraRef.current.y = engine.state.arenaHeight / 2;
  }, [engine.state.arenaWidth, engine.state.arenaHeight]);

  // Main 60fps Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const spawnParticles = (x: number, y: number, color: string, count: number = 8, speed: number = 100) => {
      const pool = particlesRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * speed;
        pool.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color,
          size: 2 + Math.random() * 3,
          alpha: 1,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.3
        });
      }
    };

    const addFloatingText = (x: number, y: number, text: string, color: string) => {
      textsRef.current.push({
        id: nextTextIdRef.current++,
        x,
        y: y - 10,
        text,
        color,
        alpha: 1,
        life: 0
      });
    };

    // Render shape helper
    const drawGeometricShape = (
      c: CanvasRenderingContext2D,
      type: UnitType,
      radius: number,
      team: Team,
      hitFlash: boolean
    ) => {
      const fill = hitFlash ? '#ffffff' : team === Team.BLUE ? '#3b82f6' : '#ef4444';
      const stroke = hitFlash ? '#ffffff' : team === Team.BLUE ? '#93c5fd' : '#fca5a5';

      c.fillStyle = fill;
      c.strokeStyle = stroke;
      c.lineWidth = 2.5;

      c.beginPath();
      switch (type) {
        case UnitType.SQUARE:
          c.rect(-radius, -radius, radius * 2, radius * 2);
          break;

        case UnitType.TRIANGLE:
          c.moveTo(radius * 1.3, 0);
          c.lineTo(-radius * 0.9, -radius);
          c.lineTo(-radius * 0.9, radius);
          c.closePath();
          break;

        case UnitType.CIRCLE:
          c.arc(0, 0, radius, 0, Math.PI * 2);
          break;

        case UnitType.PENTAGON: {
          const sides = 5;
          for (let s = 0; s < sides; s++) {
            const a = (s * 2 * Math.PI) / sides;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            if (s === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.closePath();
          break;
        }

        case UnitType.HEXAGON: {
          const sides = 6;
          for (let s = 0; s < sides; s++) {
            const a = (s * 2 * Math.PI) / sides;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            if (s === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.closePath();
          break;
        }

        case UnitType.STAR: {
          const points = 5;
          const outer = radius * 1.25;
          const inner = radius * 0.55;
          for (let p = 0; p < points * 2; p++) {
            const r = p % 2 === 0 ? outer : inner;
            const a = (p * Math.PI) / points;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (p === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.closePath();
          break;
        }
      }
      c.fill();
      c.stroke();

      // Eye / Face feature for goofy TABS personality!
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(radius * 0.35, -radius * 0.28, radius * 0.24, 0, Math.PI * 2);
      c.arc(radius * 0.35, radius * 0.28, radius * 0.24, 0, Math.PI * 2);
      c.fill();

      // Googly pupil looking forward
      c.fillStyle = '#0f172a';
      c.beginPath();
      c.arc(radius * 0.42, -radius * 0.28, radius * 0.12, 0, Math.PI * 2);
      c.arc(radius * 0.42, radius * 0.28, radius * 0.12, 0, Math.PI * 2);
      c.fill();
    };

    const render = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05);

      // Simulation step if in battle phase
      if (phase === SimPhase.BATTLE) {
        const steps = Math.round(speedMultiplier);
        for (let s = 0; s < steps; s++) {
          engine.step(dt);
        }

        // Process audio and particle events from C engine
        const events = engine.getEvents();
        for (let i = 0; i < events.length; i++) {
          const ev = events[i];
          if (ev.type === 'attack_hit') {
            sound.playHit(ev.value > 30);
            spawnParticles(ev.x, ev.y, '#f59e0b', 6, 80);
            addFloatingText(ev.x, ev.y, `-${Math.round(ev.value)}`, '#fbbf24');
            // Screen shake
            screenShakeRef.current = { intensity: Math.min(ev.value * 0.2, 6), duration: 0.15 };
          } else if (ev.type === 'projectile_fire') {
            sound.playShoot(ev.sourceType === UnitType.STAR);
          } else if (ev.type === 'unit_killed') {
            sound.playDeath();
            spawnParticles(ev.x, ev.y, '#ef4444', 16, 140);
            screenShakeRef.current = { intensity: 7, duration: 0.22 };
          } else if (ev.type === 'heal_aura') {
            sound.playHeal();
            spawnParticles(ev.x, ev.y, '#06b6d4', 12, 60);
            addFloatingText(ev.x, ev.y, `+${Math.round(ev.value)} HEAL`, '#22d3ee');
          }
        }
        engine.clearEvents();
      }

      // Resize canvas to display size
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background fill
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Apply camera transform + screen shake
      const cam = cameraRef.current;
      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeRef.current.duration > 0) {
        screenShakeRef.current.duration -= dt;
        shakeX = (Math.random() - 0.5) * screenShakeRef.current.intensity * 2;
        shakeY = (Math.random() - 0.5) * screenShakeRef.current.intensity * 2;
      }

      ctx.save();
      ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Arena border & Floor
      const arenaW = engine.state.arenaWidth;
      const arenaH = engine.state.arenaHeight;

      // Arena background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, arenaW, arenaH);

      // Subtle arena grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      ctx.beginPath();
      for (let x = 0; x <= arenaW; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, arenaH);
      }
      for (let y = 0; y <= arenaH; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(arenaW, y);
      }
      ctx.stroke();

      // Deployment Zones tint (Left: Player Blue, Right: Enemy Red)
      const dividerX = arenaW * 0.48;
      const enemyZoneX = arenaW * 0.56;

      // Player zone
      ctx.fillStyle = 'rgba(37, 99, 235, 0.07)';
      ctx.fillRect(0, 0, dividerX, arenaH);

      // Enemy zone
      ctx.fillStyle = 'rgba(239, 68, 68, 0.07)';
      ctx.fillRect(enemyZoneX, 0, arenaW - enemyZoneX, arenaH);

      // Middle divider line (no-man's land)
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX, arenaH);
      ctx.moveTo(enemyZoneX, 0);
      ctx.lineTo(enemyZoneX, arenaH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zone Labels during deployment
      if (phase === SimPhase.DEPLOYMENT) {
        ctx.font = '700 13px "Chakra Petch", sans-serif';
        ctx.fillStyle = 'rgba(96, 165, 250, 0.45)';
        ctx.fillText('◄ BLUE DEPLOYMENT ZONE', 30, 36);

        ctx.fillStyle = 'rgba(248, 113, 113, 0.45)';
        ctx.fillText('ENEMY RED ZONE ►', arenaW - 170, 36);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.fillText('NO-MAN\'S LAND', arenaW / 2 - 45, arenaH / 2);
      }

      // Outer Arena Boundary Border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, arenaW, arenaH);

      // Render Units
      const units = engine.getUnits();
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (!u.isActive) continue;

        ctx.save();
        ctx.translate(u.pos.x, u.pos.y);

        // TABS Wobble & Squash-Stretch effect!
        // Moving units oscillate side to side with ragdoll wobble
        const wobbleAngle = Math.sin(u.wobblePhase) * 0.16;
        const speed = Math.hypot(u.vel.x, u.vel.y);
        const stretchFactor = Math.min(speed / 180, 0.25);
        const sx = 1.0 + stretchFactor;
        const sy = 1.0 - stretchFactor * 0.5;

        ctx.rotate(u.angle + wobbleAngle);
        ctx.scale(sx, sy);

        // Shadow beneath unit
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, u.radius * 0.4, u.radius * 0.9, u.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw geometric shape body
        drawGeometricShape(ctx, u.type, u.radius, u.team, u.hitFlashTimer > 0);

        ctx.restore();

        // Health Bar above unit
        if (phase === SimPhase.BATTLE || u.hp < u.maxHp) {
          const barW = u.radius * 2 + 8;
          const barH = 4;
          const barY = u.pos.y - u.radius - 10;
          const hpRatio = Math.max(0, u.hp / u.maxHp);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(u.pos.x - barW / 2, barY, barW, barH);

          ctx.fillStyle = u.team === Team.BLUE ? '#3b82f6' : '#ef4444';
          ctx.fillRect(u.pos.x - barW / 2, barY, barW * hpRatio, barH);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(u.pos.x - barW / 2, barY, barW, barH);
        }
      }

      // Render Projectiles
      const projs = engine.getProjectiles();
      for (let i = 0; i < projs.length; i++) {
        const p = projs[i];
        if (!p.isActive) continue;

        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);

        const vAngle = Math.atan2(p.vel.y, p.vel.x);
        ctx.rotate(vAngle);

        if (p.sourceType === UnitType.STAR) {
          // Nova projectile (glowing orb)
          ctx.fillStyle = p.team === Team.BLUE ? '#f472b6' : '#fb7185';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Arrow projectile
          ctx.strokeStyle = p.team === Team.BLUE ? '#6ee7b7' : '#fca5a5';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();

          // Arrowhead
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(3, -3);
          ctx.lineTo(3, 3);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // Update & Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.94;
        pt.vy *= 0.94;
        pt.alpha = 1 - pt.life / pt.maxLife;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Update & Render Floating Text Numbers
      const texts = textsRef.current;
      for (let i = texts.length - 1; i >= 0; i--) {
        const ft = texts[i];
        ft.life += dt;
        if (ft.life >= 0.7) {
          texts.splice(i, 1);
          continue;
        }

        ft.y -= 25 * dt;
        ft.alpha = 1 - ft.life / 0.7;

        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillText(ft.text, ft.x - 10, ft.y);
        ctx.globalAlpha = 1;
      }

      // Placement Ghost Preview during DEPLOYMENT
      if (phase === SimPhase.DEPLOYMENT && mouseWorldRef.current.inCanvas) {
        const mx = mouseWorldRef.current.x;
        const my = mouseWorldRef.current.y;
        const offsets = getFormationOffsets(selectedFormation);
        const targetTeam = isSandbox ? sandboxTeam : Team.BLUE;

        ctx.save();
        for (let o = 0; o < offsets.length; o++) {
          const px = mx + offsets[o].dx;
          const py = my + offsets[o].dy;

          // Check if legal placement
          const isBlueZone = px >= 20 && px <= dividerX;
          const isRedZone = px >= enemyZoneX && px <= arenaW - 20;
          const isLegal = (targetTeam === Team.BLUE && isBlueZone) ||
                          (targetTeam === Team.RED && isRedZone);

          ctx.save();
          ctx.translate(px, py);
          ctx.globalAlpha = 0.55;

          // Red or Green ring indicating placement validity
          ctx.strokeStyle = isLegal ? '#10b981' : '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, UNIT_CONFIGS[selectedUnitType].radius + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          drawGeometricShape(ctx, selectedUnitType, UNIT_CONFIGS[selectedUnitType].radius, targetTeam, false);
          ctx.restore();
        }
        ctx.restore();
      }

      ctx.restore(); // Restore camera
      ctx.restore(); // Restore display scale

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    engine,
    phase,
    speedMultiplier,
    selectedUnitType,
    selectedFormation,
    isSandbox,
    sandboxTeam,
    getFormationOffsets
  ]);

  // Mouse & Touch Input Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
      // Middle click, right click, or Shift+Click pans the camera
      cameraRef.current.isDragging = true;
      cameraRef.current.dragStartX = e.clientX;
      cameraRef.current.dragStartY = e.clientY;
      cameraRef.current.camStartX = cameraRef.current.x;
      cameraRef.current.camStartY = cameraRef.current.y;
      return;
    }

    if (e.button === 0) {
      // Left click
      const worldPos = screenToWorld(e.clientX, e.clientY);

      if (phase === SimPhase.DEPLOYMENT) {
        // Check if clicked an existing unit to remove or inspect
        const units = engine.getUnits();
        for (let i = units.length - 1; i >= 0; i--) {
          const u = units[i];
          const d = Math.hypot(u.pos.x - worldPos.x, u.pos.y - worldPos.y);
          if (d <= u.radius + 6) {
            if (e.altKey || e.metaKey) {
              onRemoveUnit(u.id);
              sound.playDeath();
              return;
            } else {
              onUnitSelectInspect?.(u);
              return;
            }
          }
        }

        // Place new formation or single unit
        const offsets = getFormationOffsets(selectedFormation);
        let placedAny = false;

        offsets.forEach(off => {
          const px = worldPos.x + off.dx;
          const py = worldPos.y + off.dy;
          const placed = onPlaceUnit(selectedUnitType, px, py);
          if (placed) placedAny = true;
        });

        if (placedAny) {
          sound.playPlaceUnit();
        }
      } else {
        // In battle phase, inspect clicked unit
        const units = engine.getUnits();
        for (let i = units.length - 1; i >= 0; i--) {
          const u = units[i];
          const d = Math.hypot(u.pos.x - worldPos.x, u.pos.y - worldPos.y);
          if (d <= u.radius + 6) {
            onUnitSelectInspect?.(u);
            return;
          }
        }
        onUnitSelectInspect?.(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (cameraRef.current.isDragging) {
      const dx = (e.clientX - cameraRef.current.dragStartX) / cameraRef.current.zoom;
      const dy = (e.clientY - cameraRef.current.dragStartY) / cameraRef.current.zoom;
      cameraRef.current.x = cameraRef.current.camStartX - dx;
      cameraRef.current.y = cameraRef.current.camStartY - dy;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    mouseWorldRef.current.x = world.x;
    mouseWorldRef.current.y = world.y;
    mouseWorldRef.current.inCanvas = true;
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
  };

  const handleMouseLeave = () => {
    cameraRef.current.isDragging = false;
    mouseWorldRef.current.inCanvas = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.min(Math.max(cameraRef.current.zoom * zoomFactor, 0.4), 2.5);
    cameraRef.current.zoom = newZoom;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (phase === SimPhase.DEPLOYMENT) {
      // Right click removes unit under cursor
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const units = engine.getUnits();
      for (let i = units.length - 1; i >= 0; i--) {
        const u = units[i];
        const d = Math.hypot(u.pos.x - worldPos.x, u.pos.y - worldPos.y);
        if (d <= u.radius + 6) {
          onRemoveUnit(u.id);
          sound.playDeath();
          return;
        }
      }
    }
  };

  // Keyboard controls for WASD panning and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const panSpeed = 30 / cameraRef.current.zoom;
      if (e.key === 'w' || e.key === 'ArrowUp') {
        cameraRef.current.y -= panSpeed;
      } else if (e.key === 's' || e.key === 'ArrowDown') {
        cameraRef.current.y += panSpeed;
      } else if (e.key === 'a' || e.key === 'ArrowLeft') {
        cameraRef.current.x -= panSpeed;
      } else if (e.key === 'd' || e.key === 'ArrowRight') {
        cameraRef.current.x += panSpeed;
      } else if (e.key === ' ') {
        e.preventDefault();
        if (phase === SimPhase.DEPLOYMENT) {
          onAttackTrigger();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, onAttackTrigger]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        data-testid="arena-canvas"
        className="w-full h-full block cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};
