/**
 * PolyTABS - Architecture & C-Engine Inspector Modal
 * Details the C-to-WASM bridge, memory layouts, C snippets, and TypeScript glue code.
 */

import React, { useState } from 'react';
import { X, Copy, Check, Cpu, Code2, Layers, BookOpen } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'c_reference' | 'c_snippets' | 'ts_snippets' | 'c_source'>('architecture');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const C_REFERENCE_FOUNDATION = `/* =========================================================================
 * Reference Implementation (Core C Battle Simulation Loop)
 * ========================================================================= */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <stdbool.h>

#define MAX_UNITS 100
#define ARENA_WIDTH 800.0f
#define ARENA_HEIGHT 600.0f

typedef enum {
    UNIT_SQUARE,   // Melee foot soldier
    UNIT_TRIANGLE  // Ranged archer
} UnitType;

typedef enum {
    TEAM_PLAYER,
    TEAM_ENEMY
} Team;

typedef struct {
    int id;
    Team team;
    UnitType type;
    float x, y;         
    float health;       
    float damage;       
    float range;        
    float speed;        
    bool is_alive;
} Unit;

typedef struct {
    Unit units[MAX_UNITS];
    int count;
} Army;

float get_distance(float x1, float y1, float x2, float y2) {
    float dx = x2 - x1;
    float dy = y2 - y1;
    return sqrtf(dx * dx + dy * dy);
}

Unit* find_nearest_enemy(Unit* current_unit, Army* enemy_army) {
    Unit* nearest = NULL;
    float min_dist = 99999.0f;

    for (int i = 0; i < enemy_army->count; i++) {
        Unit* enemy = &enemy_army->units[i];
        if (!enemy->is_alive) continue;

        float dist = get_distance(current_unit->x, current_unit->y, enemy->x, enemy->y);
        if (dist < min_dist) {
            min_dist = dist;
            nearest = enemy;
        }
    }
    return nearest;
}

void update_unit(Unit* unit, Army* enemy_army, float dt) {
    if (!unit->is_alive) return;

    Unit* target = find_nearest_enemy(unit, enemy_army);
    if (!target) return; 

    float dist = get_distance(unit->x, unit->y, target->x, target->y);

    if (dist <= unit->range) {
        target->health -= unit->damage * dt;
        if (target->health <= 0.0f) {
            target->is_alive = false;
        }
    } else {
        float dx = target->x - unit->x;
        float dy = target->y - unit->y;
        float length = sqrtf(dx * dx + dy * dy);
        if (length > 0.0f) {
            unit->x += (dx / length) * unit->speed * dt;
            unit->y += (dy / length) * unit->speed * dt;
        }
    }
}

bool has_army_lost(Army* army) {
    for (int i = 0; i < army->count; i++) {
        if (army->units[i].is_alive) {
            return false; 
        }
    }
    return true; 
}

int simulate_battle_step(Army* player_army, Army* enemy_army, float dt) {
    for (int i = 0; i < player_army->count; i++) {
        update_unit(&player_army->units[i], enemy_army, dt);
    }
    for (int i = 0; i < enemy_army->count; i++) {
        update_unit(&enemy_army->units[i], player_army, dt);
    }

    if (has_army_lost(player_army)) return 2; // Enemy wins
    if (has_army_lost(enemy_army)) return 1;  // Player wins

    return 0; // Ongoing
}`;

  const ARCHITECTURE_EXPLANATION = `
================================================================================
          POLYTABS: C-CORE & TYPESCRIPT WASM ARCHITECTURE PIPELINE
================================================================================

  +--------------------------------------------------------------------------+
  |                        C99 CORE ENGINE (c_src/)                         |
  |                                                                          |
  |  - battle_engine.h: Cache-aligned structs (Vec2, Unit, Projectile)       |
  |  - battle_engine.c: Spatial physics, soft-body spring wobble, AI tree    |
  |  - Pure deterministic C execution: zero garbage collection pauses         |
  +--------------------------------------------------------------------------+
                                      |
                           Emscripten / clang
                           (emcc -O3 -s WASM=1)
                                      v
  +--------------------------------------------------------------------------+
  |                     SHARED WEBASSEMBLY LINEAR MEMORY                     |
  |                                                                          |
  |  - 64KB Page-aligned TypedArray Buffer: HEAPU8, HEAP32, HEAPF32          |
  |  - Direct pointer access to Unit arrays & Projectile arrays              |
  |  - Zero-copy data sharing between C engine and host environment          |
  +--------------------------------------------------------------------------+
                                      |
                             C-ABI FFI Bridge
                             (cwrap / HEAP views)
                                      v
  +--------------------------------------------------------------------------+
  |                    TYPESCRIPT WRAPPER & FRONTEND UI                      |
  |                                                                          |
  |  - Deployment UI: Player selects shapes, sets budgets, places formations|
  |  - Attack Dispatch: Transfers unit coordinates to C memory pool          |
  |  - Canvas2D Render Loop: Pulls coordinates at 60fps with TABS wobble     |
  |  - Procedural Web Audio: Synthesizes sound events triggered by C events  |
  +--------------------------------------------------------------------------+

MEMORY LAYOUT OF THE C UNIT STRUCT (64-byte aligned):
--------------------------------------------------------------------------------
Offset (Bytes) | Field             | Type      | Purpose
--------------------------------------------------------------------------------
0x00           | id                | uint32_t  | Unique entity identifier
0x04           | type              | uint8_t   | Shape archetype (0-5)
0x05           | team              | uint8_t   | Blue (0) or Red (1)
0x06           | state             | uint8_t   | AI behavior tree state
0x07           | is_active         | uint8_t   | Active slot flag
0x08 - 0x0F    | pos (x, y)        | Vec2 (f32)| Current arena coordinates
0x10 - 0x17    | vel (x, y)        | Vec2 (f32)| Linear velocity vector
0x18 - 0x1F    | force (x, y)      | Vec2 (f32)| Accumulated steering forces
0x20           | angle             | float     | Facing angle (radians)
0x24           | target_angle      | float     | Desired steering heading
0x28           | hp                | float     | Current health points
0x2C           | max_hp            | float     | Maximum health points
0x30           | speed             | float     | Max movement velocity
0x34           | attack_range      | float     | Engagement threshold
0x38           | attack_damage     | float     | Damage dealt per strike
0x3C           | attack_cooldown   | float     | Strike cooldown interval
--------------------------------------------------------------------------------
Total: Flat contiguous memory array for SIMD vectorization and cache locality.
`;

  const C_STRUCT_SNIPPET = `/* 1. Core C Structs & Memory Alignment (from battle_engine.h) */
typedef struct {
    float x;
    float y;
} Vec2;

typedef struct {
    uint32_t id;
    uint8_t  type;        /* 0: Square, 1: Triangle, 2: Circle, 3: Pentagon... */
    uint8_t  team;        /* 0: Blue (Player), 1: Red (Enemy) */
    uint8_t  state;       /* 0: Idle, 1: Marching, 2: Pursuing, 4: Attacking */
    uint8_t  is_active;

    Vec2     pos;         /* Position (x, y) */
    Vec2     vel;         /* Velocity (x, y) */
    Vec2     force;       /* Steering Force (x, y) */

    float    angle;
    float    target_angle;

    float    hp;
    float    max_hp;
    float    speed;
    float    attack_range;
    float    attack_damage;
    float    attack_cooldown;
    float    attack_timer;

    float    radius;
    float    mass;
    int32_t  target_id;

    /* TABS Goofy Ragdoll Physics */
    float    wobble_phase;
    float    wobble_freq;
    float    hit_flash_timer;
} Unit;`;

  const C_PHYSICS_SNIPPET = `/* 2. 2D Elastic Collision & Separation Solver (from battle_engine.c) */
void resolve_unit_collisions(Unit* units, uint32_t count) {
    for (uint32_t i = 0; i < count; i++) {
        Unit* u = &units[i];
        if (!u->is_active || u->hp <= 0.0f) continue;

        for (uint32_t j = i + 1; j < count; j++) {
            Unit* b = &units[j];
            if (!b->is_active || b->hp <= 0.0f) continue;

            float min_dist = u->radius + b->radius;
            float dx = u->pos.x - b->pos.x;
            float dy = u->pos.y - b->pos.y;
            float d2 = dx * dx + dy * dy;

            if (d2 < min_dist * min_dist && d2 > 0.0001f) {
                float d = sqrtf(d2);
                float overlap = 0.5f * (min_dist - d);
                float nx = dx / d;
                float ny = dy / d;

                /* Push apart proportionally to relative masses */
                float total_mass = u->mass + b->mass;
                float r_a = b->mass / total_mass;
                float r_b = u->mass / total_mass;

                u->pos.x += nx * overlap * r_a;
                u->pos.y += ny * overlap * r_a;
                b->pos.x -= nx * overlap * r_b;
                b->pos.y -= ny * overlap * r_b;

                /* Elastic velocity impulse along collision normal */
                float rvx = u->vel.x - b->vel.x;
                float rvy = u->vel.y - b->vel.y;
                float vel_norm = rvx * nx + rvy * ny;

                if (vel_norm < 0.0f) {
                    float impulse = -(1.2f) * vel_norm / (1.0f / u->mass + 1.0f / b->mass);
                    u->vel.x += (impulse / u->mass) * nx;
                    u->vel.y += (impulse / u->mass) * ny;
                    b->vel.x -= (impulse / b->mass) * nx;
                    b->vel.y -= (impulse / b->mass) * ny;
                }
            }
        }
    }
}`;

  const C_LOOP_SNIPPET = `/* 3. Battle Loop State Machine Step (from battle_engine.c) */
void engine_step(float dt) {
    if (g_state.phase != SIM_PHASE_BATTLE) return;

    /* Clamp dt for numerical stability */
    dt = (dt > 0.05f) ? 0.05f : ((dt < 0.001f) ? 0.001f : dt);
    g_state.sim_time += dt;

    /* Step 1: AI Behavior Tree (Targeting, Flanking, Lunging) */
    update_unit_ai(g_units, g_state.unit_count, dt);

    /* Step 2: Physics Collision Solver & Spatial Constraints */
    resolve_unit_collisions(g_units, g_state.unit_count);
    integrate_physics_and_bounds(g_units, g_state.unit_count, dt);

    /* Step 3: Ballistic Projectile Integration & Hit Detection */
    update_projectiles(g_projectiles, g_state.projectile_count, dt);

    /* Step 4: Outcome Evaluation */
    check_battle_outcome(&g_state);
}`;

  const TS_BRIDGE_SNIPPET = `/* 1. TypeScript FFI WebAssembly Bridge Wrapper */
export class CEngineBridge {
  private wasmExports: any;
  private memoryView: Float32Array;

  constructor(wasmModule: WebAssembly.Instance) {
    this.wasmExports = wasmModule.exports;
    // Direct zero-copy view of the WebAssembly Linear Memory
    this.memoryView = new Float32Array(this.wasmExports.memory.buffer);
  }

  // Transfer deployment position to C memory
  public deployUnit(type: number, team: number, x: number, y: number): number {
    return this.wasmExports.engine_add_unit(type, team, x, y, 0.0);
  }

  // Dispatch "Attack" button event
  public triggerAttack(): void {
    this.wasmExports.engine_start_battle();
  }

  // Step simulation loop by dt
  public step(dt: number): void {
    this.wasmExports.engine_step(dt);
  }

  // Read unit state directly from C memory
  public getUnitPosition(unitIndex: number): { x: number; y: number } {
    const unitPtr = this.wasmExports.engine_get_units();
    const byteOffset = unitPtr + unitIndex * 64; // 64 bytes per unit
    const floatOffset = byteOffset >> 2;
    return {
      x: this.memoryView[floatOffset + 2], // offset 0x08
      y: this.memoryView[floatOffset + 3]  // offset 0x0C
    };
  }
}`;

  const TS_ATTACK_BUTTON_SNIPPET = `/* 2. TypeScript UI State & Attack Button Dispatcher */
const handleAttackClick = () => {
  if (unitCount === 0) return;
  
  // 1. Play auditory battle horn fanfare
  sound.playBattleHorn();

  // 2. Transition React UI state machine
  setSimPhase(SimPhase.BATTLE);

  // 3. Dispatch execution trigger to C Core Engine
  cEngine.startBattle();

  // 4. Update document state attribute for zero-filter game shell
  document.body.dataset.state = 'playing';
};`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-none select-none">
      <div className="relative w-full max-w-4xl h-[88vh] bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-sky-400" />
            <div>
              <h2 className="text-lg font-display font-bold text-white tracking-wide">
                C SIMULATION CORE & WASM ARCHITECTURE SPEC
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Pure C99 Physics Engine · WebAssembly Linear Memory · TypeScript Glue API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'architecture'
                ? 'border-sky-400 text-sky-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Memory Map</span>
          </button>

          <button
            onClick={() => setActiveTab('c_reference')}
            className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'c_reference'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reference C Foundation</span>
          </button>

          <button
            onClick={() => setActiveTab('c_snippets')}
            className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'c_snippets'
                ? 'border-sky-400 text-sky-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Extended C Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('ts_snippets')}
            className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'ts_snippets'
                ? 'border-sky-400 text-sky-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>TypeScript Glue Code</span>
          </button>

          <button
            onClick={() => setActiveTab('c_source')}
            className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'c_source'
                ? 'border-sky-400 text-sky-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Full C Files (c_src/)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs">
          
          {/* TAB: Reference C Foundation */}
          {activeTab === 'c_reference' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                    Core C Battle Simulation Loop (Reference Specification)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    The foundational entity structures, distance math, target acquisition, and tick updates.
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(C_REFERENCE_FOUNDATION, 'c_ref')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedKey === 'c_ref' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'c_ref' ? 'Copied!' : 'Copy C Foundation'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 whitespace-pre font-mono leading-relaxed overflow-x-auto">
                {C_REFERENCE_FOUNDATION}
              </pre>
            </div>
          )}
          
          {/* TAB 1: Architecture & Memory Map */}
          {activeTab === 'architecture' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  C-to-WASM Bridge Architecture Specification
                </span>
                <button
                  onClick={() => copyToClipboard(ARCHITECTURE_EXPLANATION, 'arch')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedKey === 'arch' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'arch' ? 'Copied!' : 'Copy Spec'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sky-300 whitespace-pre font-mono leading-relaxed overflow-x-auto">
                {ARCHITECTURE_EXPLANATION}
              </pre>
            </div>
          )}

          {/* TAB 2: C Core Code Snippets */}
          {activeTab === 'c_snippets' && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-bold uppercase">1. Aligned C Unit Struct</span>
                  <button
                    onClick={() => copyToClipboard(C_STRUCT_SNIPPET, 'c_struct')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'c_struct' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 whitespace-pre overflow-x-auto">
                  {C_STRUCT_SNIPPET}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-bold uppercase">2. 2D Elastic Collision Solver</span>
                  <button
                    onClick={() => copyToClipboard(C_PHYSICS_SNIPPET, 'c_physics')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'c_physics' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 whitespace-pre overflow-x-auto">
                  {C_PHYSICS_SNIPPET}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-bold uppercase">3. Battle Loop State Machine</span>
                  <button
                    onClick={() => copyToClipboard(C_LOOP_SNIPPET, 'c_loop')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'c_loop' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 whitespace-pre overflow-x-auto">
                  {C_LOOP_SNIPPET}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: TypeScript Glue Code */}
          {activeTab === 'ts_snippets' && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sky-400 font-bold uppercase">1. FFI WebAssembly Memory Wrapper</span>
                  <button
                    onClick={() => copyToClipboard(TS_BRIDGE_SNIPPET, 'ts_bridge')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'ts_bridge' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 whitespace-pre overflow-x-auto">
                  {TS_BRIDGE_SNIPPET}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sky-400 font-bold uppercase">2. "Attack" Button Event Dispatcher</span>
                  <button
                    onClick={() => copyToClipboard(TS_ATTACK_BUTTON_SNIPPET, 'ts_attack')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'ts_attack' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 whitespace-pre overflow-x-auto">
                  {TS_ATTACK_BUTTON_SNIPPET}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Full C Files in Repo */}
          {activeTab === 'c_source' && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-blue-200">
                <p className="font-sans text-xs">
                  The complete pure C99 implementation is stored directly in the repository at <code className="text-amber-400 font-mono">/c_src/battle_engine.h</code> and <code className="text-amber-400 font-mono">/c_src/battle_engine.c</code> with build script <code className="text-amber-400 font-mono">/c_src/build_wasm.sh</code>.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-300 font-mono">c_src/build_wasm.sh</span>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre overflow-x-auto">
{`emcc battle_engine.c -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_engine_init","_engine_reset","_engine_add_unit","_engine_start_battle","_engine_step","_engine_get_state","_engine_get_units"]' -o ../public/battle_engine.js`}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wider transition-colors cursor-pointer"
          >
            CLOSE INSPECTOR
          </button>
        </div>

      </div>
    </div>
  );
};
