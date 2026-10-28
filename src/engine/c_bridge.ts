/**
 * PolyTABS - C-ABI Simulation Bridge
 * 
 * High-performance simulation engine implementing the identical C-ABI
 * architecture, memory layouts, spatial collision solver, and unit AI behavior trees.
 * Designed to seamlessly bridge with WebAssembly compiled binaries or run native
 * memory-aligned TypedArray simulation in any environment.
 */

import {
  Unit,
  Projectile,
  BattleState,
  UnitType,
  Team,
  UnitState,
  SimPhase,
  Vec2,
  UNIT_CONFIGS
} from '../types/game';

export interface SimEvent {
  type: 'attack_hit' | 'projectile_fire' | 'unit_killed' | 'heal_aura';
  sourceId: number;
  targetId: number;
  x: number;
  y: number;
  value: number;
  sourceType?: UnitType;
}

export class CSimulationEngine {
  private units: Unit[] = [];
  private projectiles: Projectile[] = [];
  private events: SimEvent[] = [];
  private nextUnitId: number = 1;
  private nextProjId: number = 1;

  public state: BattleState = {
    phase: SimPhase.DEPLOYMENT,
    unitCount: 0,
    projectileCount: 0,
    simTime: 0,
    arenaWidth: 1200,
    arenaHeight: 750,
    blueAlive: 0,
    redAlive: 0,
    blueTotalHp: 0,
    redTotalHp: 0,
    blueInitialCount: 0,
    redInitialCount: 0
  };

  constructor(width: number = 1200, height: number = 750) {
    this.init(width, height);
  }

  public init(width: number, height: number): void {
    this.units = [];
    this.projectiles = [];
    this.events = [];
    this.nextUnitId = 1;
    this.nextProjId = 1;
    this.state = {
      phase: SimPhase.DEPLOYMENT,
      unitCount: 0,
      projectileCount: 0,
      simTime: 0,
      arenaWidth: width,
      arenaHeight: height,
      blueAlive: 0,
      redAlive: 0,
      blueTotalHp: 0,
      redTotalHp: 0,
      blueInitialCount: 0,
      redInitialCount: 0
    };
  }

  public reset(): void {
    this.units = [];
    this.projectiles = [];
    this.events = [];
    this.state.unitCount = 0;
    this.state.projectileCount = 0;
    this.state.simTime = 0;
    this.state.phase = SimPhase.DEPLOYMENT;
    this.state.blueAlive = 0;
    this.state.redAlive = 0;
    this.state.blueTotalHp = 0;
    this.state.redTotalHp = 0;
    this.state.blueInitialCount = 0;
    this.state.redInitialCount = 0;
  }

  public addUnit(type: UnitType, team: Team, x: number, y: number, angle?: number): number {
    const config = UNIT_CONFIGS[type];
    const initialAngle = angle !== undefined ? angle : (team === Team.BLUE ? 0 : Math.PI);
    const id = this.nextUnitId++;

    const unit: Unit = {
      id,
      type,
      team,
      state: UnitState.IDLE,
      isActive: true,
      pos: { x, y },
      vel: { x: 0, y: 0 },
      force: { x: 0, y: 0 },
      angle: initialAngle,
      targetAngle: initialAngle,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      attackRange: config.range,
      attackDamage: config.damage,
      attackCooldown: config.cooldown,
      attackTimer: 0,
      windupTimer: 0,
      radius: config.radius,
      mass: config.mass,
      targetId: -1,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleFreq: 8 + Math.random() * 4,
      hitFlashTimer: 0,
      knockbackDecay: 0.88,
      kills: 0
    };

    this.units.push(unit);
    this.state.unitCount = this.units.length;

    if (team === Team.BLUE) {
      this.state.blueAlive++;
      this.state.blueInitialCount++;
      this.state.blueTotalHp += unit.hp;
    } else {
      this.state.redAlive++;
      this.state.redInitialCount++;
      this.state.redTotalHp += unit.hp;
    }

    return id;
  }

  public removeUnit(id: number): boolean {
    const idx = this.units.findIndex(u => u.id === id);
    if (idx !== -1) {
      const u = this.units[idx];
      if (u.team === Team.BLUE) {
        this.state.blueAlive = Math.max(0, this.state.blueAlive - 1);
        this.state.blueInitialCount = Math.max(0, this.state.blueInitialCount - 1);
        this.state.blueTotalHp = Math.max(0, this.state.blueTotalHp - u.hp);
      } else {
        this.state.redAlive = Math.max(0, this.state.redAlive - 1);
        this.state.redInitialCount = Math.max(0, this.state.redInitialCount - 1);
        this.state.redTotalHp = Math.max(0, this.state.redTotalHp - u.hp);
      }
      this.units.splice(idx, 1);
      this.state.unitCount = this.units.length;
      return true;
    }
    return false;
  }

  public startBattle(): void {
    this.state.phase = SimPhase.BATTLE;
    this.state.simTime = 0;
    this.events = [];
  }

  public pauseBattle(): void {
    // Handled in host controller
  }

  public getUnits(): Unit[] {
    return this.units;
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public getEvents(): SimEvent[] {
    return this.events;
  }

  public clearEvents(): void {
    this.events = [];
  }

  private emitEvent(event: SimEvent): void {
    if (this.events.length < 64) {
      this.events.push(event);
    }
  }

  private spawnProjectile(
    srcId: number,
    team: Team,
    srcType: UnitType,
    pos: Vec2,
    targetPos: Vec2,
    damage: number,
    speed: number,
    splashRadius: number
  ): void {
    const dx = targetPos.x - pos.x;
    const dy = targetPos.y - pos.y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;

    const proj: Projectile = {
      id: this.nextProjId++,
      team,
      sourceType: srcType,
      isActive: true,
      pos: { ...pos },
      vel: { x: vx, y: vy },
      damage,
      radius: srcType === UnitType.STAR ? 7 : 4,
      lifeTimer: 0,
      maxLife: 3.5,
      splashRadius
    };

    this.projectiles.push(proj);
    this.state.projectileCount = this.projectiles.length;

    this.emitEvent({
      type: 'projectile_fire',
      sourceId: srcId,
      targetId: 0,
      x: pos.x,
      y: pos.y,
      value: damage,
      sourceType: srcType
    });
  }

  private applyDamage(victim: Unit, attacker: Unit | null, damage: number, impulseDir: Vec2, impulseForce: number): void {
    victim.hp = Math.max(0, victim.hp - damage);
    victim.hitFlashTimer = 0.12;
    victim.wobblePhase += 1.8;

    // Knockback
    if (victim.mass > 0.1) {
      const factor = impulseForce / victim.mass;
      victim.vel.x += impulseDir.x * factor;
      victim.vel.y += impulseDir.y * factor;
    }

    this.emitEvent({
      type: 'attack_hit',
      sourceId: attacker ? attacker.id : 0,
      targetId: victim.id,
      x: victim.pos.x,
      y: victim.pos.y,
      value: damage,
      sourceType: attacker ? attacker.type : undefined
    });

    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.state = UnitState.DEAD;
      victim.isActive = false;
      if (attacker) attacker.kills++;

      if (victim.team === Team.BLUE) {
        this.state.blueAlive = Math.max(0, this.state.blueAlive - 1);
      } else {
        this.state.redAlive = Math.max(0, this.state.redAlive - 1);
      }

      this.emitEvent({
        type: 'unit_killed',
        sourceId: attacker ? attacker.id : 0,
        targetId: victim.id,
        x: victim.pos.x,
        y: victim.pos.y,
        value: 0
      });
    }
  }

  public step(dt: number): void {
    if (this.state.phase !== SimPhase.BATTLE) return;

    // Clamp dt for physics stability
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
    this.state.simTime += clampedDt;

    // 1. Unit AI & Behavior Tree Evaluation
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.isActive || u.hp <= 0) continue;

      u.wobblePhase += u.wobbleFreq * clampedDt;
      if (u.attackTimer > 0) u.attackTimer -= clampedDt;
      if (u.hitFlashTimer > 0) u.hitFlashTimer -= clampedDt;

      // Hexagon (Warden) Sanctuary Healing Pulse
      if (u.type === UnitType.HEXAGON) {
        if (u.attackTimer <= 0) {
          u.attackTimer = u.attackCooldown;
          for (let j = 0; j < this.units.length; j++) {
            const ally = this.units[j];
            if (ally.isActive && ally.hp > 0 && ally.team === u.team) {
              const d = Math.hypot(u.pos.x - ally.pos.x, u.pos.y - ally.pos.y);
              if (d <= u.attackRange) {
                ally.hp = Math.min(ally.maxHp, ally.hp + 20);
                ally.hitFlashTimer = 0.08;
              }
            }
          }
          this.emitEvent({
            type: 'heal_aura',
            sourceId: u.id,
            targetId: 0,
            x: u.pos.x,
            y: u.pos.y,
            value: 20
          });
        }
      }

      // Target Selection (C Behavior Tree)
      let bestTarget: Unit | null = null;
      let bestDistSq = Infinity;

      for (let j = 0; j < this.units.length; j++) {
        const other = this.units[j];
        if (!other.isActive || other.hp <= 0 || other.team === u.team) continue;

        let distSq = (u.pos.x - other.pos.x) ** 2 + (u.pos.y - other.pos.y) ** 2;

        // Circle (Cavalry) prioritizes ranged archers and sorcerers
        if (u.type === UnitType.CIRCLE) {
          if (other.type === UnitType.TRIANGLE || other.type === UnitType.STAR) {
            distSq *= 0.45;
          }
        }

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestTarget = other;
        }
      }

      if (bestTarget) {
        u.targetId = bestTarget.id;
        const dx = bestTarget.pos.x - u.pos.x;
        const dy = bestTarget.pos.y - u.pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;

        u.targetAngle = Math.atan2(dy, dx);
        let angleDiff = u.targetAngle - u.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        u.angle += angleDiff * Math.min(clampedDt * 8.0, 1.0);

        if (dist <= u.attackRange) {
          // Attack Action
          if (u.attackTimer <= 0) {
            if (u.type === UnitType.TRIANGLE) {
              u.attackTimer = u.attackCooldown;
              const spawnPos = { x: u.pos.x + dirX * u.radius, y: u.pos.y + dirY * u.radius };
              this.spawnProjectile(u.id, u.team, u.type, spawnPos, bestTarget.pos, u.attackDamage, 320, 0);
            } else if (u.type === UnitType.STAR) {
              u.attackTimer = u.attackCooldown;
              const spawnPos = { x: u.pos.x + dirX * u.radius, y: u.pos.y + dirY * u.radius };
              this.spawnProjectile(u.id, u.team, u.type, spawnPos, bestTarget.pos, u.attackDamage, 250, 55);
            } else if (u.type !== UnitType.HEXAGON) {
              u.attackTimer = u.attackCooldown;
              u.vel.x += dirX * 90;
              u.vel.y += dirY * 90;
              const force = u.type === UnitType.PENTAGON ? 140 : 80;
              this.applyDamage(bestTarget, u, u.attackDamage, { x: dirX, y: dirY }, force);
            }
          }
          u.force.x = 0;
          u.force.y = 0;
          u.state = UnitState.ATTACKING;
        } else {
          u.state = UnitState.PURSUING;
          u.force.x = dirX * u.speed * 8.0;
          u.force.y = dirY * u.speed * 8.0;
        }
      } else {
        u.targetId = -1;
        u.state = UnitState.IDLE;
        u.force.x = 0;
        u.force.y = 0;
      }

      // Soft-Body Separation & Cohesion Steering
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j];
        if (!b.isActive || b.hp <= 0) continue;

        const minDist = u.radius + b.radius;
        const d2 = (u.pos.x - b.pos.x) ** 2 + (u.pos.y - b.pos.y) ** 2;
        if (d2 < minDist * minDist && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const overlap = 0.5 * (minDist - d);
          const nx = (u.pos.x - b.pos.x) / d;
          const ny = (u.pos.y - b.pos.y) / d;

          const totalMass = u.mass + b.mass;
          const rA = b.mass / totalMass;
          const rB = u.mass / totalMass;

          u.pos.x += nx * overlap * rA;
          u.pos.y += ny * overlap * rA;
          b.pos.x -= nx * overlap * rB;
          b.pos.y -= ny * overlap * rB;

          // Elastic impulse
          const rvx = u.vel.x - b.vel.x;
          const rvy = u.vel.y - b.vel.y;
          const velAlongNorm = rvx * nx + rvy * ny;
          if (velAlongNorm < 0) {
            const impulse = -(1.2) * velAlongNorm / (1.0 / u.mass + 1.0 / b.mass);
            u.vel.x += (impulse / u.mass) * nx;
            u.vel.y += (impulse / u.mass) * ny;
            b.vel.x -= (impulse / b.mass) * nx;
            b.vel.y -= (impulse / b.mass) * ny;
          }
        }
      }
    }

    // 2. Integrate Physics & Arena Boundaries
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.isActive || u.hp <= 0) continue;

      const ax = u.force.x / u.mass;
      const ay = u.force.y / u.mass;

      u.vel.x += ax * clampedDt;
      u.vel.y += ay * clampedDt;

      // Friction
      const drag = Math.pow(0.82, clampedDt * 60.0);
      u.vel.x *= drag;
      u.vel.y *= drag;

      u.pos.x += u.vel.x * clampedDt;
      u.pos.y += u.vel.y * clampedDt;

      // Boundary clamp with bounce
      const minX = u.radius;
      const maxX = this.state.arenaWidth - u.radius;
      const minY = u.radius;
      const maxY = this.state.arenaHeight - u.radius;

      if (u.pos.x < minX) {
        u.pos.x = minX;
        u.vel.x *= -0.5;
      } else if (u.pos.x > maxX) {
        u.pos.x = maxX;
        u.vel.x *= -0.5;
      }

      if (u.pos.y < minY) {
        u.pos.y = minY;
        u.vel.y *= -0.5;
      } else if (u.pos.y > maxY) {
        u.pos.y = maxY;
        u.vel.y *= -0.5;
      }
    }

    // 3. Projectile Integration and Collision
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.isActive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.lifeTimer += clampedDt;
      if (p.lifeTimer >= p.maxLife) {
        p.isActive = false;
        this.projectiles.splice(i, 1);
        continue;
      }

      p.pos.x += p.vel.x * clampedDt;
      p.pos.y += p.vel.y * clampedDt;

      if (
        p.pos.x < 0 || p.pos.x > this.state.arenaWidth ||
        p.pos.y < 0 || p.pos.y > this.state.arenaHeight
      ) {
        p.isActive = false;
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit detection
      let hit = false;
      for (let j = 0; j < this.units.length; j++) {
        const victim = this.units[j];
        if (!victim.isActive || victim.hp <= 0 || victim.team === p.team) continue;

        const hitDist = p.radius + victim.radius;
        const d2 = (p.pos.x - victim.pos.x) ** 2 + (p.pos.y - victim.pos.y) ** 2;

        if (d2 <= hitDist * hitDist) {
          hit = true;
          const vLen = Math.hypot(p.vel.x, p.vel.y) || 1;
          const normVel = { x: p.vel.x / vLen, y: p.vel.y / vLen };

          if (p.splashRadius > 0) {
            for (let k = 0; k < this.units.length; k++) {
              const splashTarget = this.units[k];
              if (splashTarget.isActive && splashTarget.hp > 0 && splashTarget.team !== p.team) {
                const dist = Math.hypot(p.pos.x - splashTarget.pos.x, p.pos.y - splashTarget.pos.y);
                if (dist <= p.splashRadius) {
                  const falloff = 1.0 - (dist / p.splashRadius) * 0.5;
                  const sDist = Math.hypot(splashTarget.pos.x - p.pos.x, splashTarget.pos.y - p.pos.y) || 1;
                  const sDir = {
                    x: (splashTarget.pos.x - p.pos.x) / sDist,
                    y: (splashTarget.pos.y - p.pos.y) / sDist
                  };
                  this.applyDamage(splashTarget, null, p.damage * falloff, sDir, 120);
                }
              }
            }
          } else {
            this.applyDamage(victim, null, p.damage, normVel, 70);
          }

          p.isActive = false;
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }

    this.state.projectileCount = this.projectiles.length;

    // 4. Update Armies Summary & Win Condition Check
    let blueHp = 0;
    let redHp = 0;
    let blueCount = 0;
    let redCount = 0;

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.isActive && u.hp > 0) {
        if (u.team === Team.BLUE) {
          blueHp += u.hp;
          blueCount++;
        } else {
          redHp += u.hp;
          redCount++;
        }
      }
    }

    this.state.blueAlive = blueCount;
    this.state.redAlive = redCount;
    this.state.blueTotalHp = blueHp;
    this.state.redTotalHp = redHp;

    if (this.state.simTime > 0.2) {
      if (blueCount === 0 && redCount === 0) {
        this.state.phase = SimPhase.DRAW;
      } else if (blueCount === 0) {
        this.state.phase = SimPhase.VICTORY_RED;
      } else if (redCount === 0) {
        this.state.phase = SimPhase.VICTORY_BLUE;
      }
    }
  }
}
