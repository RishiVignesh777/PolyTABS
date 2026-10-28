/**
 * PolyTABS - 2D Tactical Battle Simulator Engine
 * Core C Simulation Header
 * 
 * Built upon the foundational C battle simulation loop, entity structures,
 * and tick update state machine with extensible physics, TABS ragdoll wobble,
 * and geometric shape archetypes.
 */

#ifndef BATTLE_ENGINE_H
#define BATTLE_ENGINE_H

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <stdbool.h>
#include <stdint.h>

#define MAX_UNITS 100
#define MAX_PROJECTILES 256
#define ARENA_WIDTH 800.0f
#define ARENA_HEIGHT 600.0f

#ifdef __cplusplus
extern "C" {
#endif

/* 1. Foundational Enums & Archetypes */
typedef enum {
    UNIT_SQUARE   = 0, // Melee foot soldier (balanced direct combat, moderate health/speed)
    UNIT_TRIANGLE = 1, // Ranged archer (shoots projectiles from a distance, low health)
    /* Extended Unlockable Archetypes */
    UNIT_CIRCLE   = 2, // Cavalry flanker (high speed, charges past frontline to attack archers)
    UNIT_PENTAGON = 3, // Heavy juggernaut tank (massive HP and mass, high knockback)
    UNIT_HEXAGON  = 4, // Support warden (radiates sanctuary healing aura to nearby allies)
    UNIT_STAR     = 5  // Nova sorcerer (casts explosive area-of-effect starfire bursts)
} UnitType;

typedef enum {
    TEAM_PLAYER = 0, // Player's Army (Blue)
    TEAM_ENEMY  = 1  // Opposing Army (Red)
} Team;

#define TEAM_BLUE TEAM_PLAYER
#define TEAM_RED  TEAM_ENEMY

/* 2. Foundational Entity Structure (Extended with Physics & Ragdoll Wobble) */
typedef struct {
    /* Foundation Fields */
    int      id;
    Team     team;
    UnitType type;
    float    x, y;         
    float    health;       
    float    damage;       
    float    range;        
    float    speed;        
    bool     is_alive;

    /* Extended Physics, Combat & TABS Juice Fields */
    float    max_health;
    float    vx, vy;            // Linear velocity
    float    force_x, force_y;  // Steering forces
    float    mass;              // Inertia mass for elastic collisions
    float    radius;            // Collision radius
    float    angle;             // Facing rotation angle
    float    target_angle;      // Steering heading
    float    attack_cooldown;   // Time between attacks
    float    attack_timer;      // Cooldown timer countdown
    float    wobble_phase;      // TABS ragdoll wobble oscillation phase
    float    wobble_freq;       // Wobble frequency
    float    hit_flash_timer;   // White emissive hit-flash timer
    int      target_id;         // Currently tracked enemy unit id
    int      kills;             // Total enemies slain
} Unit;

/* Foundational Army Structure */
typedef struct {
    Unit units[MAX_UNITS];
    int count;
} Army;

/* Extended Projectile Structure */
typedef struct {
    int      id;
    Team     team;
    UnitType source_type;
    float    x, y;
    float    vx, vy;
    float    damage;
    float    radius;
    float    life_timer;
    float    max_life;
    float    splash_radius;
    bool     is_active;
} Projectile;

/* Battle State Tracker */
typedef struct {
    int   phase;              // 0: Ongoing, 1: Player wins, 2: Enemy wins, 3: Draw, 4: Deployment
    int   total_units;
    float sim_time;
    float arena_width;
    float arena_height;
    int   player_alive;
    int   enemy_alive;
    float player_total_hp;
    float enemy_total_hp;
} BattleState;

/* Sim Event Record for Audio & Particle Callbacks */
typedef struct {
    int   type; // 0: Hit, 1: Projectile Fire, 2: Death, 3: Heal
    int   source_id;
    int   target_id;
    float x, y;
    float value;
} SimEvent;

#define MAX_EVENTS 64

/* 3. Foundational Core Functions (Matching Reference Implementation) */
float get_distance(float x1, float y1, float x2, float y2);
Unit* find_nearest_enemy(Unit* current_unit, Army* enemy_army);
void  update_unit(Unit* unit, Army* enemy_army, float dt);
bool  has_army_lost(Army* army);
int   simulate_battle_step(Army* player_army, Army* enemy_army, float dt);

/* 4. Extended C Engine & WASM Lifecycle API */
void               engine_init(float width, float height);
void               engine_reset(void);
int                engine_add_unit(int type, int team, float x, float y, float angle);
bool               engine_remove_unit(int id);
void               engine_start_battle(void);
void               engine_step(float dt);
const Army*        engine_get_player_army(void);
const Army*        engine_get_enemy_army(void);
const BattleState* engine_get_state(void);
const Projectile*  engine_get_projectiles(int* out_count);
const SimEvent*    engine_get_events(int* out_count);
void               engine_clear_events(void);

#ifdef __cplusplus
}
#endif

#endif /* BATTLE_ENGINE_H */
