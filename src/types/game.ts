/**
 * PolyTABS Game Types & Data Structures
 * Mirrors the C-ABI memory layouts and game state machines
 */

export enum UnitType {
  SQUARE = 0,   // Foot Soldier: Balanced melee, shields up
  TRIANGLE = 1, // Archer: High range, projectile attacks, low health
  CIRCLE = 2,   // Cavalry: High speed, charges & flanks rear archers
  PENTAGON = 3, // Heavy Tank: High HP, knockback resistance, sweep attack
  HEXAGON = 4,  // Warden: Healing aura & protective shield pulses
  STAR = 5      // Nova Sorcerer: Fires explosive AoE bursts
}

export enum Team {
  PLAYER = 0, // Player's Army (Blue)
  ENEMY = 1,  // Enemy / AI Army (Red)
  BLUE = 0,   // Alias
  RED = 1     // Alias
}

export interface Army {
  units: Unit[];
  count: number;
}

export enum UnitState {
  IDLE = 0,
  MARCHING = 1,
  PURSUING = 2,
  ATTACK_WINDUP = 3,
  ATTACKING = 4,
  RECOVERY = 5,
  DEAD = 6
}

export enum SimPhase {
  DEPLOYMENT = 0,
  BATTLE = 1,
  VICTORY_BLUE = 2,
  VICTORY_RED = 3,
  DRAW = 4
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Unit {
  id: number;
  type: UnitType;
  team: Team;
  state: UnitState;
  isActive: boolean;

  pos: Vec2;
  vel: Vec2;
  force: Vec2;
  angle: number;
  targetAngle: number;

  hp: number;
  maxHp: number;
  speed: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  attackTimer: number;
  windupTimer: number;

  radius: number;
  mass: number;
  targetId: number;

  // TABS Physics & Juice feedback
  wobblePhase: number;
  wobbleFreq: number;
  hitFlashTimer: number;
  knockbackDecay: number;
  kills: number;
}

export interface Projectile {
  id: number;
  team: Team;
  sourceType: UnitType;
  isActive: boolean;
  pos: Vec2;
  vel: Vec2;
  damage: number;
  radius: number;
  lifeTimer: number;
  maxLife: number;
  splashRadius: number;
}

export interface BattleState {
  phase: SimPhase;
  unitCount: number;
  projectileCount: number;
  simTime: number;
  arenaWidth: number;
  arenaHeight: number;
  blueAlive: number;
  redAlive: number;
  blueTotalHp: number;
  redTotalHp: number;
  blueInitialCount: number;
  redInitialCount: number;
}

export interface UnitArchetypeConfig {
  type: UnitType;
  name: string;
  role: string;
  cost: number;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  cooldown: number;
  mass: number;
  radius: number;
  color: string;
  accent: string;
  unlockedByDefault: boolean;
  unlockLevel: number;
  description: string;
}

export const UNIT_CONFIGS: Record<UnitType, UnitArchetypeConfig> = {
  [UnitType.SQUARE]: {
    type: UnitType.SQUARE,
    name: 'Square',
    role: 'Foot Soldier',
    cost: 100,
    hp: 120,
    speed: 85,
    damage: 22,
    range: 28,
    cooldown: 1.0,
    mass: 1.6,
    radius: 16,
    color: '#3b82f6', // blue-500
    accent: '#60a5fa',
    unlockedByDefault: true,
    unlockLevel: 1,
    description: 'Disciplined infantry. Moderate health and steady melee slashes.'
  },
  [UnitType.TRIANGLE]: {
    type: UnitType.TRIANGLE,
    name: 'Triangle',
    role: 'Archer',
    cost: 130,
    hp: 60,
    speed: 70,
    damage: 26,
    range: 260,
    cooldown: 1.6,
    mass: 0.9,
    radius: 14,
    color: '#10b981', // emerald-500
    accent: '#34d399',
    unlockedByDefault: true,
    unlockLevel: 1,
    description: 'Ranged sharpshooter. Rains deadly precision arrows from afar.'
  },
  [UnitType.CIRCLE]: {
    type: UnitType.CIRCLE,
    name: 'Circle',
    role: 'Cavalry Flanker',
    cost: 180,
    hp: 95,
    speed: 175,
    damage: 36,
    range: 30,
    cooldown: 1.1,
    mass: 2.0,
    radius: 15,
    color: '#f59e0b', // amber-500
    accent: '#fbbf24',
    unlockedByDefault: false,
    unlockLevel: 2,
    description: 'High-speed cavalry. Skirts the frontline to trample enemy ranged units.'
  },
  [UnitType.PENTAGON]: {
    type: UnitType.PENTAGON,
    name: 'Pentagon',
    role: 'Juggernaut Tank',
    cost: 260,
    hp: 280,
    speed: 52,
    damage: 44,
    range: 34,
    cooldown: 1.6,
    mass: 4.2,
    radius: 23,
    color: '#8b5cf6', // violet-500
    accent: '#a78bfa',
    unlockedByDefault: false,
    unlockLevel: 3,
    description: 'Heavy armored battering ram. Absorbs immense damage and shatters formations.'
  },
  [UnitType.HEXAGON]: {
    type: UnitType.HEXAGON,
    name: 'Hexagon',
    role: 'Support Warden',
    cost: 220,
    hp: 140,
    speed: 65,
    damage: 12,
    range: 150,
    cooldown: 2.2,
    mass: 2.2,
    radius: 18,
    color: '#06b6d4', // cyan-500
    accent: '#22d3ee',
    unlockedByDefault: false,
    unlockLevel: 4,
    description: 'Sanctuary guardian. Emits resonant healing waves to bolster surrounding allies.'
  },
  [UnitType.STAR]: {
    type: UnitType.STAR,
    name: 'Star',
    role: 'Nova Sorcerer',
    cost: 320,
    hp: 75,
    speed: 60,
    damage: 48,
    range: 230,
    cooldown: 2.4,
    mass: 1.1,
    radius: 16,
    color: '#ec4899', // pink-500
    accent: '#f472b6',
    unlockedByDefault: false,
    unlockLevel: 5,
    description: 'Prismatic arcanist. Hurls volatile energy spheres that detonate in wide areas.'
  }
};

export type FormationType = 'single' | 'line' | 'wedge' | 'flank' | 'box' | 'spread';

export interface CampaignLevel {
  id: number;
  name: string;
  subtitle: string;
  playerBudget: number;
  rewardUnlockType?: UnitType;
  description: string;
  enemies: Array<{
    type: UnitType;
    x: number;
    y: number;
    angle?: number;
  }>;
}
