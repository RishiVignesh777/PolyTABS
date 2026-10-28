/**
 * PolyTABS - 2D Tactical Battle Simulator Engine
 * Pure C Core Simulation Header
 * 
 * Defines memory layouts, data structures, and the C-ABI export functions
 * for integration with WebAssembly (Emscripten) and native runtimes.
 */

#ifndef BATTLE_ENGINE_H
#define BATTLE_ENGINE_H

#include <stdint.h>
#include <stdbool.h>

#define MAX_UNITS 256
#define MAX_PROJECTILES 512
#define ARENA_DEFAULT_WIDTH 1200.0f
#define ARENA_DEFAULT_HEIGHT 800.0f

#ifdef __cplusplus
extern "C" {
#endif

/* 2D Vector Representation */
typedef struct {
    float x;
    float y;
} Vec2;

/* Unit Geometric Archetypes */
typedef enum {
    UNIT_SQUARE   = 0, /* Foot Soldier: Balanced melee, shields up */
    UNIT_TRIANGLE = 1, /* Archer: High range, projectile attacks, low health */
    UNIT_CIRCLE   = 2, /* Cavalry: High speed, charges & flanks rear archers */
    UNIT_PENTAGON = 3, /* Heavy Tank: High HP, knockback resistance, sweep attack */
    UNIT_HEXAGON  = 4, /* Warden: Healing aura & protective shield pulses */
    UNIT_STAR     = 5  /* Nova Sorcerer: Fires explosive AoE bursts */
} UnitType;

typedef enum {
    TEAM_BLUE = 0, /* Player's Forces */
    TEAM_RED  = 1  /* Opponent / Campaign Forces */
} Team;

typedef enum {
    STATE_IDLE          = 0,
    STATE_MARCHING      = 1,
    STATE_PURSUING      = 2,
    STATE_ATTACK_WINDUP = 3,
    STATE_ATTACKING     = 4,
    STATE_RECOVERY      = 5,
    STATE_DEAD          = 6
} UnitState;

typedef enum {
    SIM_PHASE_DEPLOYMENT = 0,
    SIM_PHASE_BATTLE     = 1,
    SIM_PHASE_VICTORY_BLUE = 2,
    SIM_PHASE_VICTORY_RED  = 3,
    SIM_PHASE_DRAW         = 4
} SimPhase;

/* Aligned Unit Struct (Cache-friendly 64-byte aligned layout) */
typedef struct {
    uint32_t id;
    uint8_t  type;
    uint8_t  team;
    uint8_t  state;
    uint8_t  is_active;

    Vec2     pos;
    Vec2     vel;
    Vec2     force;

    float    angle;
    float    target_angle;

    float    hp;
    float    max_hp;
    float    speed;
    float    attack_range;
    float    attack_damage;
    float    attack_cooldown;
    float    attack_timer;
    float    windup_timer;

    float    radius;
    float    mass;
    int32_t  target_id;

    /* TABS Physics & Juice feedback */
    float    wobble_phase;
    float    wobble_freq;
    float    hit_flash_timer;
    float    knockback_decay;
    uint32_t kills;
} Unit;

/* Projectile Struct for Ranged Units */
typedef struct {
    uint32_t id;
    uint8_t  team;
    uint8_t  source_type;
    uint8_t  is_active;

    Vec2     pos;
    Vec2     vel;
    float    damage;
    float    radius;
    float    life_timer;
    float    max_life;
    float    splash_radius;
} Projectile;

/* Battle State Header & Simulation Stats */
typedef struct {
    uint32_t phase;
    uint32_t unit_count;
    uint32_t projectile_count;
    float    sim_time;
    float    arena_width;
    float    arena_height;

    uint32_t blue_alive;
    uint32_t red_alive;
    float    blue_total_hp;
    float    red_total_hp;

    uint32_t blue_initial_count;
    uint32_t red_initial_count;
} BattleState;

/* Event Callback or Ring Buffer Event */
typedef enum {
    EVENT_ATTACK_HIT    = 0,
    EVENT_PROJECTILE_FIRE = 1,
    EVENT_UNIT_KILLED   = 2,
    EVENT_SPECIAL_AURA  = 3
} SimEventType;

typedef struct {
    uint32_t type;
    uint32_t source_id;
    uint32_t target_id;
    float    x;
    float    y;
    float    value;
} SimEvent;

#define MAX_EVENTS 64

/* Public C API Functions (Exported for WebAssembly / Native bindings) */
void        engine_init(float width, float height);
void        engine_reset(void);
int32_t     engine_add_unit(uint8_t type, uint8_t team, float x, float y, float angle);
bool        engine_remove_unit(uint32_t id);
void        engine_start_battle(void);
void        engine_pause_battle(void);
void        engine_resume_battle(void);
void        engine_step(float dt);

/* Direct Pointer Accessors for Shared Memory / WebAssembly Heap */
const BattleState* engine_get_state(void);
const Unit*        engine_get_units(uint32_t* out_count);
const Projectile*  engine_get_projectiles(uint32_t* out_count);
const SimEvent*    engine_get_events(uint32_t* out_count);
void               engine_clear_events(void);

#ifdef __cplusplus
}
#endif

#endif /* BATTLE_ENGINE_H */
