/**
 * PolyTABS - Campaign Levels & Progression System
 */

import { CampaignLevel, UnitType } from '../types/game';

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    id: 1,
    name: 'Level 1: The Square Skirmish',
    subtitle: 'Frontline Basics',
    playerBudget: 600,
    rewardUnlockType: UnitType.CIRCLE, // Unlocks Circles (Cavalry)
    description: 'The enemy vanguard has deployed basic Square foot soldiers in a tight block. Form up your line and advance!',
    enemies: [
      { type: UnitType.SQUARE, x: 780, y: 320 },
      { type: UnitType.SQUARE, x: 780, y: 380 },
      { type: UnitType.SQUARE, x: 780, y: 440 },
      { type: UnitType.SQUARE, x: 840, y: 350 },
      { type: UnitType.SQUARE, x: 840, y: 410 }
    ]
  },
  {
    id: 2,
    name: 'Level 2: Rain of Triangles',
    subtitle: 'Ranged Salvo',
    playerBudget: 850,
    rewardUnlockType: UnitType.PENTAGON, // Unlocks Pentagons (Heavy Tanks)
    description: 'Enemy archers are positioned behind a shield wall. Use fast flankers or direct rushes to breach their line before they pick you apart!',
    enemies: [
      { type: UnitType.SQUARE, x: 740, y: 330 },
      { type: UnitType.SQUARE, x: 740, y: 420 },
      { type: UnitType.TRIANGLE, x: 850, y: 280 },
      { type: UnitType.TRIANGLE, x: 850, y: 380 },
      { type: UnitType.TRIANGLE, x: 850, y: 480 },
      { type: UnitType.SQUARE, x: 800, y: 380 }
    ]
  },
  {
    id: 3,
    name: 'Level 3: Charge of the Spheres',
    subtitle: 'Cavalry Flankers',
    playerBudget: 1100,
    rewardUnlockType: UnitType.HEXAGON, // Unlocks Hexagons (Support Wardens)
    description: 'Fast enemy Circles are waiting on both flanks to tear into your rear line. Anchor your core with heavy armor or dense infantry!',
    enemies: [
      { type: UnitType.CIRCLE, x: 720, y: 180 },
      { type: UnitType.CIRCLE, x: 720, y: 580 },
      { type: UnitType.SQUARE, x: 760, y: 340 },
      { type: UnitType.SQUARE, x: 760, y: 420 },
      { type: UnitType.TRIANGLE, x: 880, y: 380 },
      { type: UnitType.CIRCLE, x: 800, y: 240 }
    ]
  },
  {
    id: 4,
    name: 'Level 4: The Iron Bastion',
    subtitle: 'Heavy Juggernauts',
    playerBudget: 1400,
    rewardUnlockType: UnitType.STAR, // Unlocks Stars (Nova Sorcerers)
    description: 'Massive Pentagon tanks are spearheading the enemy formation with high HP and massive mass. Focus your fire!',
    enemies: [
      { type: UnitType.PENTAGON, x: 750, y: 330 },
      { type: UnitType.PENTAGON, x: 750, y: 430 },
      { type: UnitType.SQUARE, x: 830, y: 280 },
      { type: UnitType.SQUARE, x: 830, y: 480 },
      { type: UnitType.TRIANGLE, x: 910, y: 340 },
      { type: UnitType.TRIANGLE, x: 910, y: 420 }
    ]
  },
  {
    id: 5,
    name: 'Level 5: Sanctuary Siege',
    subtitle: 'Wardens & Shield Pulse',
    playerBudget: 1700,
    description: 'The enemy has deployed Hexagon Wardens that continuously heal their frontline. You need high burst damage or flankers to pick off the Wardens!',
    enemies: [
      { type: UnitType.PENTAGON, x: 740, y: 380 },
      { type: UnitType.HEXAGON, x: 840, y: 380 },
      { type: UnitType.SQUARE, x: 760, y: 280 },
      { type: UnitType.SQUARE, x: 760, y: 480 },
      { type: UnitType.TRIANGLE, x: 900, y: 290 },
      { type: UnitType.TRIANGLE, x: 900, y: 470 }
    ]
  },
  {
    id: 6,
    name: 'Level 6: Prismatic Nova War',
    subtitle: 'Sorcery & Explosions',
    playerBudget: 2100,
    description: 'Star Nova Sorcerers are hurling area-of-effect explosives. Spread out your troops to avoid lethal cluster detonations!',
    enemies: [
      { type: UnitType.STAR, x: 920, y: 320 },
      { type: UnitType.STAR, x: 920, y: 440 },
      { type: UnitType.PENTAGON, x: 760, y: 380 },
      { type: UnitType.CIRCLE, x: 730, y: 200 },
      { type: UnitType.CIRCLE, x: 730, y: 560 },
      { type: UnitType.HEXAGON, x: 850, y: 380 }
    ]
  },
  {
    id: 7,
    name: 'Level 7: The Grand Melee',
    subtitle: 'Combined Arms Mastery',
    playerBudget: 2600,
    description: 'A complete enemy battalion with shields, cavalry wings, archer batteries, and healers. Deploy a cohesive battle formation!',
    enemies: [
      { type: UnitType.PENTAGON, x: 740, y: 300 },
      { type: UnitType.PENTAGON, x: 740, y: 460 },
      { type: UnitType.SQUARE, x: 720, y: 380 },
      { type: UnitType.CIRCLE, x: 700, y: 150 },
      { type: UnitType.CIRCLE, x: 700, y: 610 },
      { type: UnitType.HEXAGON, x: 820, y: 380 },
      { type: UnitType.TRIANGLE, x: 880, y: 240 },
      { type: UnitType.TRIANGLE, x: 880, y: 520 },
      { type: UnitType.STAR, x: 940, y: 380 }
    ]
  },
  {
    id: 8,
    name: 'Level 8: The Geometry Overlord',
    subtitle: 'Apex Final Stand',
    playerBudget: 3200,
    description: 'The supreme geometric army stands before you. Only true tactical mastery can conquer the battlefield!',
    enemies: [
      { type: UnitType.PENTAGON, x: 730, y: 260 },
      { type: UnitType.PENTAGON, x: 730, y: 380 },
      { type: UnitType.PENTAGON, x: 730, y: 500 },
      { type: UnitType.HEXAGON, x: 820, y: 320 },
      { type: UnitType.HEXAGON, x: 820, y: 440 },
      { type: UnitType.CIRCLE, x: 700, y: 120 },
      { type: UnitType.CIRCLE, x: 700, y: 640 },
      { type: UnitType.STAR, x: 920, y: 280 },
      { type: UnitType.STAR, x: 920, y: 480 },
      { type: UnitType.TRIANGLE, x: 880, y: 380 }
    ]
  }
];
