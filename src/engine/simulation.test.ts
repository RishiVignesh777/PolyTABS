import test from 'node:test';
import assert from 'node:assert/strict';
import { CSimulationEngine } from './c_bridge';
import { UnitType, Team, SimPhase, UNIT_CONFIGS } from '../types/game';

test('CSimulationEngine: initializes with clean state and dimensions', () => {
  const engine = new CSimulationEngine(1000, 600);
  assert.equal(engine.state.arenaWidth, 1000);
  assert.equal(engine.state.arenaHeight, 600);
  assert.equal(engine.state.phase, SimPhase.DEPLOYMENT);
  assert.equal(engine.state.unitCount, 0);
  assert.equal(engine.state.blueAlive, 0);
  assert.equal(engine.state.redAlive, 0);
});

test('CSimulationEngine: unit archetype configuration matches C specs', () => {
  assert.equal(UNIT_CONFIGS[UnitType.SQUARE].hp, 120);
  assert.equal(UNIT_CONFIGS[UnitType.TRIANGLE].range, 260);
  assert.equal(UNIT_CONFIGS[UnitType.CIRCLE].speed, 175);
  assert.equal(UNIT_CONFIGS[UnitType.PENTAGON].mass, 4.2);
  assert.equal(UNIT_CONFIGS[UnitType.HEXAGON].damage, 12);
  assert.equal(UNIT_CONFIGS[UnitType.STAR].cost, 320);
});

test('CSimulationEngine: unit placement and removal updates state', () => {
  const engine = new CSimulationEngine(1000, 600);
  const id1 = engine.addUnit(UnitType.SQUARE, Team.BLUE, 100, 300);
  const id2 = engine.addUnit(UnitType.TRIANGLE, Team.RED, 800, 300);

  assert.equal(engine.state.unitCount, 2);
  assert.equal(engine.state.blueAlive, 1);
  assert.equal(engine.state.redAlive, 1);
  assert.equal(engine.getUnits().length, 2);

  const removed = engine.removeUnit(id1);
  assert.equal(removed, true);
  assert.equal(engine.state.unitCount, 1);
  assert.equal(engine.state.blueAlive, 0);
  assert.equal(engine.state.redAlive, 1);
});

test('CSimulationEngine: units engage and battle loop progresses to victory', () => {
  // Add two melee units where Square has superior stats
  const engine = new CSimulationEngine(800, 400);
  engine.addUnit(UnitType.SQUARE, Team.BLUE, 380, 200);
  engine.addUnit(UnitType.SQUARE, Team.RED, 400, 200);
  // Modify red's hp to be lower for deterministic quick resolution
  engine.getUnits().find(u => u.team === Team.RED)!.hp = 20;

  engine.startBattle();
  assert.equal(engine.state.phase, SimPhase.BATTLE);

  for (let step = 0; step < 60; step++) {
    engine.step(0.016);
    if (engine.state.phase !== SimPhase.BATTLE) break;
  }

  assert.equal(engine.state.redAlive, 0);
  assert.equal(engine.state.phase, SimPhase.VICTORY_BLUE);
});

test('CSimulationEngine: elastic separation pushes overlapping units apart', () => {
  const engine = new CSimulationEngine(800, 400);
  // Spawn two units at exact same spot
  engine.addUnit(UnitType.SQUARE, Team.BLUE, 300, 200);
  engine.addUnit(UnitType.SQUARE, Team.BLUE, 301, 200);

  engine.startBattle();
  engine.step(0.016);

  const units = engine.getUnits();
  const dist = Math.hypot(units[0].pos.x - units[1].pos.x, units[0].pos.y - units[1].pos.y);
  assert.ok(dist > 1.0, 'Units should have pushed apart through separation forces');
});

test('CSimulationEngine: projectile spawns and deals damage to enemy', () => {
  const engine = new CSimulationEngine(800, 400);
  engine.addUnit(UnitType.TRIANGLE, Team.BLUE, 100, 200);
  engine.addUnit(UnitType.SQUARE, Team.RED, 200, 200);

  engine.startBattle();
  // Step until arrow is fired and hits
  for (let i = 0; i < 40; i++) {
    engine.step(0.016);
  }

  const redUnits = engine.getUnits().filter(u => u.team === Team.RED);
  assert.ok(redUnits[0].hp < redUnits[0].maxHp, 'Red unit should take arrow projectile damage');
});

test('CSimulationEngine: arena boundary constraint keeps units within arena', () => {
  const engine = new CSimulationEngine(400, 400);
  engine.addUnit(UnitType.CIRCLE, Team.BLUE, 10, 10);
  const units = engine.getUnits();
  units[0].vel = { x: -500, y: -500 }; // High outward speed

  engine.startBattle();
  engine.step(0.05);

  assert.ok(units[0].pos.x >= units[0].radius, 'Unit must not cross left arena boundary');
  assert.ok(units[0].pos.y >= units[0].radius, 'Unit must not cross top arena boundary');
});
