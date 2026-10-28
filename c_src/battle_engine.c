/**
 * PolyTABS - 2D Tactical Battle Simulator Engine
 * Core C Simulation Implementation
 * 
 * Uses and builds directly upon the foundational reference implementation:
 * - get_distance()
 * - find_nearest_enemy()
 * - update_unit()
 * - has_army_lost()
 * - simulate_battle_step()
 */

#include "battle_engine.h"
#include <math.h>
#include <string.h>
#include <stdlib.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

/* Global Armies and Simulation State */
static Army        g_player_army;
static Army        g_enemy_army;
static Projectile  g_projectiles[MAX_PROJECTILES];
static int         g_projectile_count = 0;
static SimEvent    g_events[MAX_EVENTS];
static int         g_event_count = 0;
static BattleState g_state;
static int         g_next_id = 1;

/* --------------------------------------------------------------------------
 * 1. Foundational Reference Functions
 * -------------------------------------------------------------------------- */

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

        /* Extended Tactical Behavior: Cavalry (Circle) prioritizes archers & sorcerers */
        if (current_unit->type == UNIT_CIRCLE) {
            if (enemy->type == UNIT_TRIANGLE || enemy->type == UNIT_STAR) {
                dist *= 0.45f; // Bias towards backline ranged targets
            }
        }

        if (dist < min_dist) {
            min_dist = dist;
            nearest = enemy;
        }
    }
    return nearest;
}

static void emit_sim_event(int type, int src, int tgt, float x, float y, float val) {
    if (g_event_count < MAX_EVENTS) {
        SimEvent* e = &g_events[g_event_count++];
        e->type = type;
        e->source_id = src;
        e->target_id = tgt;
        e->x = x;
        e->y = y;
        e->value = val;
    }
}

static void spawn_projectile(int src_id, Team team, UnitType src_type, float x, float y, float tx, float ty, float dmg, float speed, float splash) {
    if (g_projectile_count >= MAX_PROJECTILES) return;

    float dx = tx - x;
    float dy = ty - y;
    float len = sqrtf(dx * dx + dy * dy);
    if (len <= 0.0001f) len = 1.0f;

    Projectile* p = &g_projectiles[g_projectile_count++];
    p->id = g_next_id++;
    p->team = team;
    p->source_type = src_type;
    p->x = x;
    p->y = y;
    p->vx = (dx / len) * speed;
    p->vy = (dy / len) * speed;
    p->damage = dmg;
    p->radius = (src_type == UNIT_STAR) ? 7.0f : 4.0f;
    p->life_timer = 0.0f;
    p->max_life = 3.5f;
    p->splash_radius = splash;
    p->is_active = true;

    emit_sim_event(1, src_id, 0, x, y, dmg);
}

void update_unit(Unit* unit, Army* enemy_army, float dt) {
    if (!unit->is_alive) return;

    /* TABS Wobble & Timers */
    unit->wobble_phase += unit->wobble_freq * dt;
    if (unit->attack_timer > 0.0f) unit->attack_timer -= dt;
    if (unit->hit_flash_timer > 0.0f) unit->hit_flash_timer -= dt;

    /* Hexagon Support Warden: Passive Sanctuary Healing Pulse */
    if (unit->type == UNIT_HEXAGON && unit->attack_timer <= 0.0f) {
        unit->attack_timer = unit->attack_cooldown;
        Army* my_army = (unit->team == TEAM_PLAYER) ? &g_player_army : &g_enemy_army;
        for (int i = 0; i < my_army->count; i++) {
            Unit* ally = &my_army->units[i];
            if (ally->is_alive) {
                float d = get_distance(unit->x, unit->y, ally->x, ally->y);
                if (d <= unit->range) {
                    ally->health += 20.0f;
                    if (ally->health > ally->max_health) ally->health = ally->max_health;
                    ally->hit_flash_timer = 0.08f;
                }
            }
        }
        emit_sim_event(3, unit->id, 0, unit->x, unit->y, 20.0f);
    }

    Unit* target = find_nearest_enemy(unit, enemy_army);
    if (!target) return;

    unit->target_id = target->id;
    float dist = get_distance(unit->x, unit->y, target->x, target->y);
    float dx = target->x - unit->x;
    float dy = target->y - unit->y;
    float len = sqrtf(dx * dx + dy * dy);

    if (len > 0.0001f) {
        unit->target_angle = atan2f(dy, dx);
        float diff = unit->target_angle - unit->angle;
        while (diff > M_PI) diff -= 2.0f * M_PI;
        while (diff < -M_PI) diff += 2.0f * M_PI;
        unit->angle += diff * fminf(dt * 8.0f, 1.0f);
    }

    if (dist <= unit->range) {
        /* Attack Logic */
        if (unit->attack_timer <= 0.0f) {
            unit->attack_timer = unit->attack_cooldown;

            if (unit->type == UNIT_TRIANGLE) {
                /* Archer Ballistic Arrow */
                spawn_projectile(unit->id, unit->team, unit->type, unit->x, unit->y, target->x, target->y, unit->damage, 320.0f, 0.0f);
            } else if (unit->type == UNIT_STAR) {
                /* Nova Sorcerer Explosive Sphere */
                spawn_projectile(unit->id, unit->team, unit->type, unit->x, unit->y, target->x, target->y, unit->damage, 250.0f, 55.0f);
            } else if (unit->type != UNIT_HEXAGON) {
                /* Melee Strike with Lunge & Knockback */
                float nx = (len > 0.0001f) ? (dx / len) : 1.0f;
                float ny = (len > 0.0001f) ? (dy / len) : 0.0f;

                unit->vx += nx * 80.0f;
                unit->vy += ny * 80.0f;

                target->health -= unit->damage;
                target->hit_flash_timer = 0.12f;
                target->wobble_phase += 1.8f;

                /* Knockback based on mass */
                float impulse = (unit->type == UNIT_PENTAGON) ? 140.0f : 80.0f;
                if (target->mass > 0.1f) {
                    target->vx += (nx * impulse) / target->mass;
                    target->vy += (ny * impulse) / target->mass;
                }

                emit_sim_event(0, unit->id, target->id, target->x, target->y, unit->damage);

                if (target->health <= 0.0f) {
                    target->health = 0.0f;
                    target->is_alive = false;
                    unit->kills++;
                    emit_sim_event(2, unit->id, target->id, target->x, target->y, 0.0f);
                }
            }
        }
        /* Slow down during active combat engagement */
        unit->force_x = 0.0f;
        unit->force_y = 0.0f;
    } else {
        /* March toward target */
        if (len > 0.0001f) {
            unit->force_x = (dx / len) * unit->speed * 8.0f;
            unit->force_y = (dy / len) * unit->speed * 8.0f;
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

/* Elastic Mass-Weighted Separation Solver */
static void resolve_all_collisions(Army* a1, Army* a2) {
    Army* armies[2] = { a1, a2 };
    for (int a = 0; a < 2; a++) {
        Army* armA = armies[a];
        for (int i = 0; i < armA->count; i++) {
            Unit* u = &armA->units[i];
            if (!u->is_alive) continue;

            for (int b = a; b < 2; b++) {
                Army* armB = armies[b];
                int start_j = (a == b) ? (i + 1) : 0;
                for (int j = start_j; j < armB->count; j++) {
                    Unit* o = &armB->units[j];
                    if (!o->is_alive) continue;

                    float min_dist = u->radius + o->radius;
                    float dx = u->x - o->x;
                    float dy = u->y - o->y;
                    float d2 = dx * dx + dy * dy;

                    if (d2 < min_dist * min_dist && d2 > 0.0001f) {
                        float d = sqrtf(d2);
                        float overlap = 0.5f * (min_dist - d);
                        float nx = dx / d;
                        float ny = dy / d;

                        float total_mass = u->mass + o->mass;
                        float r_u = o->mass / total_mass;
                        float r_o = u->mass / total_mass;

                        u->x += nx * overlap * r_u;
                        u->y += ny * overlap * r_u;
                        o->x -= nx * overlap * r_o;
                        o->y -= ny * overlap * r_o;

                        float rvx = u->vx - o->vx;
                        float rvy = u->vy - o->vy;
                        float vel_norm = rvx * nx + rvy * ny;
                        if (vel_norm < 0.0f) {
                            float impulse = -(1.2f) * vel_norm / (1.0f / u->mass + 1.0f / o->mass);
                            u->vx += (impulse / u->mass) * nx;
                            u->vy += (impulse / u->mass) * ny;
                            o->vx -= (impulse / o->mass) * nx;
                            o->vy -= (impulse / o->mass) * ny;
                        }
                    }
                }
            }
        }
    }
}

/* Physics Integration & Arena Boundary Clamping */
static void integrate_army_physics(Army* army, float dt, float arena_w, float arena_h) {
    for (int i = 0; i < army->count; i++) {
        Unit* u = &army->units[i];
        if (!u->is_alive) continue;

        float ax = u->force_x / u->mass;
        float ay = u->force_y / u->mass;
        u->vx += ax * dt;
        u->vy += ay * dt;

        float drag = powf(0.82f, dt * 60.0f);
        u->vx *= drag;
        u->vy *= drag;

        u->x += u->vx * dt;
        u->y += u->vy * dt;

        /* Arena Boundary Constraints */
        float min_x = u->radius;
        float max_x = arena_w - u->radius;
        float min_y = u->radius;
        float max_y = arena_h - u->radius;

        if (u->x < min_x) { u->x = min_x; u->vx *= -0.5f; }
        else if (u->x > max_x) { u->x = max_x; u->vx *= -0.5f; }

        if (u->y < min_y) { u->y = min_y; u->vy *= -0.5f; }
        else if (u->y > max_y) { u->y = max_y; u->vy *= -0.5f; }
    }
}

/* Update Ballistic Projectiles */
static void update_projectiles(float dt) {
    for (int i = g_projectile_count - 1; i >= 0; i--) {
        Projectile* p = &g_projectiles[i];
        if (!p->is_active) {
            g_projectiles[i] = g_projectiles[--g_projectile_count];
            continue;
        }

        p->life_timer += dt;
        if (p->life_timer >= p->max_life) {
            p->is_active = false;
            g_projectiles[i] = g_projectiles[--g_projectile_count];
            continue;
        }

        p->x += p->vx * dt;
        p->y += p->vy * dt;

        Army* target_army = (p->team == TEAM_PLAYER) ? &g_enemy_army : &g_player_army;
        bool hit = false;

        for (int j = 0; j < target_army->count; j++) {
            Unit* victim = &target_army->units[j];
            if (!victim->is_alive) continue;

            float hit_dist = p->radius + victim->radius;
            float d = get_distance(p->x, p->y, victim->x, victim->y);
            if (d <= hit_dist) {
                hit = true;
                if (p->splash_radius > 0.0f) {
                    /* Splash Damage for Nova Sorcerer */
                    for (int k = 0; k < target_army->count; k++) {
                        Unit* s = &target_army->units[k];
                        if (s->is_alive) {
                            float sd = get_distance(p->x, p->y, s->x, s->y);
                            if (sd <= p->splash_radius) {
                                float falloff = 1.0f - (sd / p->splash_radius) * 0.5f;
                                s->health -= p->damage * falloff;
                                s->hit_flash_timer = 0.12f;
                                emit_sim_event(0, 0, s->id, s->x, s->y, p->damage * falloff);
                                if (s->health <= 0.0f) {
                                    s->health = 0.0f;
                                    s->is_alive = false;
                                    emit_sim_event(2, 0, s->id, s->x, s->y, 0.0f);
                                }
                            }
                        }
                    }
                } else {
                    victim->health -= p->damage;
                    victim->hit_flash_timer = 0.12f;
                    emit_sim_event(0, 0, victim->id, victim->x, victim->y, p->damage);
                    if (victim->health <= 0.0f) {
                        victim->health = 0.0f;
                        victim->is_alive = false;
                        emit_sim_event(2, 0, victim->id, victim->x, victim->y, 0.0f);
                    }
                }
                break;
            }
        }

        if (hit) {
            p->is_active = false;
            g_projectiles[i] = g_projectiles[--g_projectile_count];
        }
    }
}

/* Foundational Battle Step Simulation Function */
int simulate_battle_step(Army* player_army, Army* enemy_army, float dt) {
    /* 1. Update Unit Decisions & Attacks */
    for (int i = 0; i < player_army->count; i++) {
        update_unit(&player_army->units[i], enemy_army, dt);
    }
    for (int i = 0; i < enemy_army->count; i++) {
        update_unit(&enemy_army->units[i], player_army, dt);
    }

    /* 2. Soft-Body Separation & Collision Physics */
    resolve_all_collisions(player_army, enemy_army);
    integrate_army_physics(player_army, dt, g_state.arena_width, g_state.arena_height);
    integrate_army_physics(enemy_army, dt, g_state.arena_width, g_state.arena_height);

    /* 3. Ballistic Projectiles */
    update_projectiles(dt);

    /* 4. Determine Outcome */
    bool player_lost = has_army_lost(player_army);
    bool enemy_lost = has_army_lost(enemy_army);

    if (player_lost && enemy_lost) return 3; // Mutual Annihilation / Draw
    if (player_lost) return 2;               // Enemy wins
    if (enemy_lost)  return 1;               // Player wins

    return 0; // Ongoing
}

/* --------------------------------------------------------------------------
 * 2. C Engine Lifecycle & Archetype Initializers
 * -------------------------------------------------------------------------- */

static void init_archetype(Unit* u, UnitType type, Team team, float x, float y, float angle) {
    u->id = g_next_id++;
    u->team = team;
    u->type = type;
    u->x = x;
    u->y = y;
    u->vx = 0.0f;
    u->vy = 0.0f;
    u->force_x = 0.0f;
    u->force_y = 0.0f;
    u->angle = angle;
    u->target_angle = angle;
    u->is_alive = true;
    u->target_id = -1;
    u->attack_timer = 0.0f;
    u->hit_flash_timer = 0.0f;
    u->wobble_phase = ((float)rand() / (float)RAND_MAX) * 6.28f;
    u->wobble_freq = 8.0f + ((float)rand() / (float)RAND_MAX) * 4.0f;
    u->kills = 0;

    switch (type) {
        case UNIT_SQUARE: // Melee Foot Soldier
            u->max_health = 120.0f;
            u->health = 120.0f;
            u->damage = 22.0f;
            u->range = 28.0f;
            u->speed = 85.0f;
            u->attack_cooldown = 1.0f;
            u->radius = 16.0f;
            u->mass = 1.6f;
            break;

        case UNIT_TRIANGLE: // Ranged Archer
            u->max_health = 60.0f;
            u->health = 60.0f;
            u->damage = 26.0f;
            u->range = 260.0f;
            u->speed = 70.0f;
            u->attack_cooldown = 1.6f;
            u->radius = 14.0f;
            u->mass = 0.9f;
            break;

        case UNIT_CIRCLE: // Cavalry Flanker
            u->max_health = 95.0f;
            u->health = 95.0f;
            u->damage = 36.0f;
            u->range = 30.0f;
            u->speed = 175.0f;
            u->attack_cooldown = 1.1f;
            u->radius = 15.0f;
            u->mass = 2.0f;
            break;

        case UNIT_PENTAGON: // Heavy Tank
            u->max_health = 280.0f;
            u->health = 280.0f;
            u->damage = 44.0f;
            u->range = 34.0f;
            u->speed = 52.0f;
            u->attack_cooldown = 1.6f;
            u->radius = 23.0f;
            u->mass = 4.2f;
            break;

        case UNIT_HEXAGON: // Support Warden
            u->max_health = 140.0f;
            u->health = 140.0f;
            u->damage = 12.0f;
            u->range = 150.0f;
            u->speed = 65.0f;
            u->attack_cooldown = 2.2f;
            u->radius = 18.0f;
            u->mass = 2.2f;
            break;

        case UNIT_STAR: // Nova Sorcerer
            u->max_health = 75.0f;
            u->health = 75.0f;
            u->damage = 48.0f;
            u->range = 230.0f;
            u->speed = 60.0f;
            u->attack_cooldown = 2.4f;
            u->radius = 16.0f;
            u->mass = 1.1f;
            break;
    }
}

void engine_init(float width, float height) {
    memset(&g_player_army, 0, sizeof(Army));
    memset(&g_enemy_army, 0, sizeof(Army));
    memset(&g_state, 0, sizeof(BattleState));
    g_projectile_count = 0;
    g_event_count = 0;
    g_next_id = 1;

    g_state.arena_width = (width > 200.0f) ? width : ARENA_WIDTH;
    g_state.arena_height = (height > 200.0f) ? height : ARENA_HEIGHT;
    g_state.phase = 4; // Deployment
}

void engine_reset(void) {
    g_player_army.count = 0;
    g_enemy_army.count = 0;
    g_projectile_count = 0;
    g_event_count = 0;
    g_state.sim_time = 0.0f;
    g_state.phase = 4;
}

int engine_add_unit(int type, int team, float x, float y, float angle) {
    Army* army = (team == TEAM_PLAYER) ? &g_player_army : &g_enemy_army;
    if (army->count >= MAX_UNITS) return -1;

    Unit* u = &army->units[army->count++];
    init_archetype(u, (UnitType)type, (Team)team, x, y, angle);
    return u->id;
}

bool engine_remove_unit(int id) {
    Army* armies[2] = { &g_player_army, &g_enemy_army };
    for (int a = 0; a < 2; a++) {
        Army* arm = armies[a];
        for (int i = 0; i < arm->count; i++) {
            if (arm->units[i].id == id) {
                for (int k = i; k < arm->count - 1; k++) {
                    arm->units[k] = arm->units[k + 1];
                }
                arm->count--;
                return true;
            }
        }
    }
    return false;
}

void engine_start_battle(void) {
    g_state.phase = 0; // Ongoing battle
    g_state.sim_time = 0.0f;
    g_event_count = 0;
}

void engine_step(float dt) {
    if (g_state.phase != 0) return;

    if (dt > 0.05f) dt = 0.05f;
    if (dt < 0.001f) dt = 0.001f;
    g_state.sim_time += dt;

    int result = simulate_battle_step(&g_player_army, &g_enemy_army, dt);
    if (g_state.sim_time > 0.2f && result != 0) {
        g_state.phase = result;
    }

    /* Compute Totals */
    int p_alive = 0, e_alive = 0;
    float p_hp = 0.0f, e_hp = 0.0f;

    for (int i = 0; i < g_player_army.count; i++) {
        if (g_player_army.units[i].is_alive) {
            p_alive++;
            p_hp += g_player_army.units[i].health;
        }
    }
    for (int i = 0; i < g_enemy_army.count; i++) {
        if (g_enemy_army.units[i].is_alive) {
            e_alive++;
            e_hp += g_enemy_army.units[i].health;
        }
    }

    g_state.player_alive = p_alive;
    g_state.enemy_alive = e_alive;
    g_state.player_total_hp = p_hp;
    g_state.enemy_total_hp = e_hp;
}

const Army* engine_get_player_army(void) { return &g_player_army; }
const Army* engine_get_enemy_army(void) { return &g_enemy_army; }
const BattleState* engine_get_state(void) { return &g_state; }
const Projectile* engine_get_projectiles(int* out_count) {
    if (out_count) *out_count = g_projectile_count;
    return g_projectiles;
}
const SimEvent* engine_get_events(int* out_count) {
    if (out_count) *out_count = g_event_count;
    return g_events;
}
void engine_clear_events(void) { g_event_count = 0; }
