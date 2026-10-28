/**
 * PolyTABS - 2D Tactical Battle Simulator Engine
 * Pure C Core Simulation Implementation
 */

#include "battle_engine.h"
#include <math.h>
#include <string.h>
#include <stdlib.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* Simulation Memory Pools */
static Unit        g_units[MAX_UNITS];
static Projectile  g_projectiles[MAX_PROJECTILES];
static SimEvent     g_events[MAX_EVENTS];
static BattleState g_state;
static uint32_t    g_next_unit_id = 1;
static uint32_t    g_next_proj_id = 1;
static uint32_t    g_event_count  = 0;

/* Internal Math Helpers */
static inline float vec2_dist_sq(Vec2 a, Vec2 b) {
    float dx = a.x - b.x;
    float dy = a.y - b.y;
    return dx * dx + dy * dy;
}

static inline float vec2_dist(Vec2 a, Vec2 b) {
    return sqrtf(vec2_dist_sq(a, b));
}

static inline Vec2 vec2_norm(Vec2 v) {
    float len = sqrtf(v.x * v.x + v.y * v.y);
    if (len > 0.0001f) {
        Vec2 r = { v.x / len, v.y / len };
        return r;
    }
    Vec2 zero = { 0.0f, 0.0f };
    return zero;
}

static inline float clampf(float val, float min, float max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

static void emit_event(SimEventType type, uint32_t src, uint32_t tgt, float x, float y, float val) {
    if (g_event_count < MAX_EVENTS) {
        SimEvent* e = &g_events[g_event_count++];
        e->type = (uint32_t)type;
        e->source_id = src;
        e->target_id = tgt;
        e->x = x;
        e->y = y;
        e->value = val;
    }
}

/* Base Archetype Initializer */
static void init_unit_stats(Unit* u, UnitType type, Team team, float x, float y, float angle) {
    u->id = g_next_unit_id++;
    u->type = (uint8_t)type;
    u->team = (uint8_t)team;
    u->state = (uint8_t)STATE_IDLE;
    u->is_active = 1;

    u->pos.x = x;
    u->pos.y = y;
    u->vel.x = 0.0f;
    u->vel.y = 0.0f;
    u->force.x = 0.0f;
    u->force.y = 0.0f;
    u->angle = angle;
    u->target_angle = angle;
    u->target_id = -1;
    u->attack_timer = 0.0f;
    u->windup_timer = 0.0f;
    u->wobble_phase = ((float)rand() / (float)RAND_MAX) * 6.28f;
    u->wobble_freq = 8.0f + ((float)rand() / (float)RAND_MAX) * 4.0f;
    u->hit_flash_timer = 0.0f;
    u->knockback_decay = 0.88f;
    u->kills = 0;

    switch (type) {
        case UNIT_SQUARE: /* Basic Melee Infantry */
            u->max_hp = 120.0f;
            u->hp = 120.0f;
            u->speed = 85.0f;
            u->attack_range = 28.0f;
            u->attack_damage = 22.0f;
            u->attack_cooldown = 1.0f;
            u->radius = 16.0f;
            u->mass = 1.6f;
            break;

        case UNIT_TRIANGLE: /* Archer / Ranged */
            u->max_hp = 60.0f;
            u->hp = 60.0f;
            u->speed = 70.0f;
            u->attack_range = 260.0f;
            u->attack_damage = 26.0f;
            u->attack_cooldown = 1.6f;
            u->radius = 14.0f;
            u->mass = 0.9f;
            break;

        case UNIT_CIRCLE: /* Cavalry / Flanker */
            u->max_hp = 95.0f;
            u->hp = 95.0f;
            u->speed = 175.0f;
            u->attack_range = 30.0f;
            u->attack_damage = 36.0f;
            u->attack_cooldown = 1.1f;
            u->radius = 15.0f;
            u->mass = 2.0f;
            break;

        case UNIT_PENTAGON: /* Heavy Tank */
            u->max_hp = 280.0f;
            u->hp = 280.0f;
            u->speed = 52.0f;
            u->attack_range = 34.0f;
            u->attack_damage = 44.0f;
            u->attack_cooldown = 1.6f;
            u->radius = 23.0f;
            u->mass = 4.2f;
            break;

        case UNIT_HEXAGON: /* Support Warden */
            u->max_hp = 140.0f;
            u->hp = 140.0f;
            u->speed = 65.0f;
            u->attack_range = 150.0f;
            u->attack_damage = 12.0f;
            u->attack_cooldown = 2.2f;
            u->radius = 18.0f;
            u->mass = 2.2f;
            break;

        case UNIT_STAR: /* Nova Sorcerer */
            u->max_hp = 75.0f;
            u->hp = 75.0f;
            u->speed = 60.0f;
            u->attack_range = 230.0f;
            u->attack_damage = 48.0f;
            u->attack_cooldown = 2.4f;
            u->radius = 16.0f;
            u->mass = 1.1f;
            break;
    }
}

/* Public Engine Management */
void engine_init(float width, float height) {
    memset(g_units, 0, sizeof(g_units));
    memset(g_projectiles, 0, sizeof(g_projectiles));
    memset(g_events, 0, sizeof(g_events));
    memset(&g_state, 0, sizeof(g_state));

    g_state.arena_width = (width > 200.0f) ? width : ARENA_DEFAULT_WIDTH;
    g_state.arena_height = (height > 200.0f) ? height : ARENA_DEFAULT_HEIGHT;
    g_state.phase = SIM_PHASE_DEPLOYMENT;
    g_next_unit_id = 1;
    g_next_proj_id = 1;
    g_event_count = 0;
}

void engine_reset(void) {
    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        g_units[i].is_active = 0;
    }
    for (uint32_t i = 0; i < MAX_PROJECTILES; i++) {
        g_projectiles[i].is_active = 0;
    }
    g_state.unit_count = 0;
    g_state.projectile_count = 0;
    g_state.sim_time = 0.0f;
    g_state.phase = SIM_PHASE_DEPLOYMENT;
    g_state.blue_alive = 0;
    g_state.red_alive = 0;
    g_state.blue_total_hp = 0.0f;
    g_state.red_total_hp = 0.0f;
    g_state.blue_initial_count = 0;
    g_state.red_initial_count = 0;
    g_event_count = 0;
}

int32_t engine_add_unit(uint8_t type, uint8_t team, float x, float y, float angle) {
    if (g_state.unit_count >= MAX_UNITS) return -1;

    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        if (!g_units[i].is_active) {
            init_unit_stats(&g_units[i], (UnitType)type, (Team)team, x, y, angle);
            g_state.unit_count++;
            if (team == TEAM_BLUE) {
                g_state.blue_alive++;
                g_state.blue_initial_count++;
                g_state.blue_total_hp += g_units[i].hp;
            } else {
                g_state.red_alive++;
                g_state.red_initial_count++;
                g_state.red_total_hp += g_units[i].hp;
            }
            return (int32_t)g_units[i].id;
        }
    }
    return -1;
}

bool engine_remove_unit(uint32_t id) {
    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        if (g_units[i].is_active && g_units[i].id == id) {
            if (g_units[i].team == TEAM_BLUE) {
                if (g_state.blue_alive > 0) g_state.blue_alive--;
                if (g_state.blue_initial_count > 0) g_state.blue_initial_count--;
                g_state.blue_total_hp -= g_units[i].hp;
            } else {
                if (g_state.red_alive > 0) g_state.red_alive--;
                if (g_state.red_initial_count > 0) g_state.red_initial_count--;
                g_state.red_total_hp -= g_units[i].hp;
            }
            g_units[i].is_active = 0;
            if (g_state.unit_count > 0) g_state.unit_count--;
            return true;
        }
    }
    return false;
}

void engine_start_battle(void) {
    g_state.phase = SIM_PHASE_BATTLE;
    g_state.sim_time = 0.0f;
    g_event_count = 0;
}

void engine_pause_battle(void) {
    /* Handled by host or pause loop */
}

void engine_resume_battle(void) {
    if (g_state.phase == SIM_PHASE_DEPLOYMENT) {
        g_state.phase = SIM_PHASE_BATTLE;
    }
}

/* Projectile Spawning */
static void spawn_projectile(uint32_t src_id, uint8_t team, uint8_t src_type, Vec2 pos, Vec2 target_pos, float damage, float speed, float splash) {
    for (uint32_t i = 0; i < MAX_PROJECTILES; i++) {
        if (!g_projectiles[i].is_active) {
            Projectile* p = &g_projectiles[i];
            p->id = g_next_proj_id++;
            p->team = team;
            p->source_type = src_type;
            p->is_active = 1;
            p->pos = pos;

            Vec2 dir = { target_pos.x - pos.x, target_pos.y - pos.y };
            dir = vec2_norm(dir);
            p->vel.x = dir.x * speed;
            p->vel.y = dir.y * speed;

            p->damage = damage;
            p->radius = (src_type == UNIT_STAR) ? 7.0f : 4.0f;
            p->life_timer = 0.0f;
            p->max_life = 3.5f;
            p->splash_radius = splash;
            g_state.projectile_count++;

            emit_event(EVENT_PROJECTILE_FIRE, src_id, 0, pos.x, pos.y, damage);
            return;
        }
    }
}

/* AI Target Selection (Behavior Tree Node) */
static Unit* select_target(Unit* u) {
    Unit* best_target = NULL;
    float best_dist_sq = 1e9f;

    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        Unit* other = &g_units[i];
        if (!other->is_active || other->hp <= 0.0f || other->team == u->team) {
            continue;
        }

        float dist_sq = vec2_dist_sq(u->pos, other->pos);

        /* Cavalry (Circle) prefers ranged archers and sorcerers (flanking behavior) */
        if (u->type == UNIT_CIRCLE) {
            if (other->type == UNIT_TRIANGLE || other->type == UNIT_STAR) {
                dist_sq *= 0.45f; /* Higher priority */
            }
        }

        if (dist_sq < best_dist_sq) {
            best_dist_sq = dist_sq;
            best_target = other;
        }
    }

    return best_target;
}

/* Damage and Knockback Application */
static void apply_damage(Unit* victim, Unit* attacker, float amount, Vec2 impulse_dir, float impulse_force) {
    victim->hp -= amount;
    victim->hit_flash_timer = 0.12f;
    victim->wobble_phase += 1.8f; /* Sudden jerk / ragdoll wobble on hit */

    /* Apply knockback impulse inversely proportional to mass */
    if (victim->mass > 0.1f) {
        float factor = impulse_force / victim->mass;
        victim->vel.x += impulse_dir.x * factor;
        victim->vel.y += impulse_dir.y * factor;
    }

    emit_event(EVENT_ATTACK_HIT, attacker ? attacker->id : 0, victim->id, victim->pos.x, victim->pos.y, amount);

    if (victim->hp <= 0.0f) {
        victim->hp = 0.0f;
        victim->state = STATE_DEAD;
        victim->is_active = 0;
        if (attacker) attacker->kills++;

        if (victim->team == TEAM_BLUE) {
            if (g_state.blue_alive > 0) g_state.blue_alive--;
        } else {
            if (g_state.red_alive > 0) g_state.red_alive--;
        }

        emit_event(EVENT_UNIT_KILLED, attacker ? attacker->id : 0, victim->id, victim->pos.x, victim->pos.y, 0.0f);
    }
}

/* Single Frame Simulation Step */
void engine_step(float dt) {
    if (g_state.phase != SIM_PHASE_BATTLE) {
        return;
    }

    /* Clamp dt for deterministic stability */
    dt = clampf(dt, 0.001f, 0.05f);
    g_state.sim_time += dt;

    /* 1. Unit AI & Behavior Tree Evaluation */
    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        Unit* u = &g_units[i];
        if (!u->is_active || u->hp <= 0.0f) continue;

        /* Wobble oscillation */
        u->wobble_phase += u->wobble_freq * dt;

        /* Cooldown timers */
        if (u->attack_timer > 0.0f) u->attack_timer -= dt;
        if (u->hit_flash_timer > 0.0f) u->hit_flash_timer -= dt;

        /* Warden (Hexagon) Special Aura: Passive Healing Pulse */
        if (u->type == UNIT_HEXAGON) {
            if (u->attack_timer <= 0.0f) {
                u->attack_timer = u->attack_cooldown;
                /* Heal nearby allies within 140 range */
                for (uint32_t j = 0; j < MAX_UNITS; j++) {
                    Unit* ally = &g_units[j];
                    if (ally->is_active && ally->hp > 0.0f && ally->team == u->team) {
                        float d = vec2_dist(u->pos, ally->pos);
                        if (d <= u->attack_range) {
                            ally->hp = clampf(ally->hp + 20.0f, 0.0f, ally->max_hp);
                            ally->hit_flash_timer = 0.08f;
                        }
                    }
                }
                emit_event(EVENT_SPECIAL_AURA, u->id, 0, u->pos.x, u->pos.y, 20.0f);
            }
        }

        /* Target Selection */
        Unit* target = select_target(u);
        if (target) {
            u->target_id = (int32_t)target->id;
            float dist = vec2_dist(u->pos, target->pos);
            Vec2 to_target = { target->pos.x - u->pos.x, target->pos.y - u->pos.y };
            Vec2 dir = vec2_norm(to_target);
            u->target_angle = atan2f(dir.y, dir.x);

            /* Smooth rotation towards target */
            float angle_diff = u->target_angle - u->angle;
            while (angle_diff > M_PI) angle_diff -= 2.0f * (float)M_PI;
            while (angle_diff < -M_PI) angle_diff += 2.0f * (float)M_PI;
            u->angle += angle_diff * clampf(dt * 8.0f, 0.0f, 1.0f);

            /* In attack range check */
            if (dist <= u->attack_range) {
                /* Attack State Machine */
                if (u->attack_timer <= 0.0f) {
                    if (u->type == UNIT_TRIANGLE) {
                        /* Fire Arrow */
                        u->attack_timer = u->attack_cooldown;
                        Vec2 spawn_pos = { u->pos.x + dir.x * u->radius, u->pos.y + dir.y * u->radius };
                        spawn_projectile(u->id, u->team, u->type, spawn_pos, target->pos, u->attack_damage, 320.0f, 0.0f);
                    } else if (u->type == UNIT_STAR) {
                        /* Fire Explosive Nova */
                        u->attack_timer = u->attack_cooldown;
                        Vec2 spawn_pos = { u->pos.x + dir.x * u->radius, u->pos.y + dir.y * u->radius };
                        spawn_projectile(u->id, u->team, u->type, spawn_pos, target->pos, u->attack_damage, 250.0f, 55.0f);
                    } else if (u->type != UNIT_HEXAGON) {
                        /* Melee Strike with Lunge */
                        u->attack_timer = u->attack_cooldown;
                        u->vel.x += dir.x * 90.0f;
                        u->vel.y += dir.y * 90.0f;
                        apply_damage(target, u, u->attack_damage, dir, (u->type == UNIT_PENTAGON) ? 140.0f : 80.0f);
                    }
                }
                /* Slow down when fighting */
                u->force.x = 0.0f;
                u->force.y = 0.0f;
            } else {
                /* March / Pursue */
                u->state = STATE_PURSUING;
                u->force.x = dir.x * u->speed * 8.0f;
                u->force.y = dir.y * u->speed * 8.0f;
            }
        } else {
            u->target_id = -1;
            u->state = STATE_IDLE;
            u->force.x = 0.0f;
            u->force.y = 0.0f;
        }

        /* 2. Soft-Body Separation & Cohesion Steering */
        for (uint32_t j = i + 1; j < MAX_UNITS; j++) {
            Unit* b = &g_units[j];
            if (!b->is_active || b->hp <= 0.0f) continue;

            float min_dist = u->radius + b->radius;
            float d2 = vec2_dist_sq(u->pos, b->pos);
            if (d2 < min_dist * min_dist && d2 > 0.0001f) {
                float d = sqrtf(d2);
                float overlap = 0.5f * (min_dist - d);
                float nx = (u->pos.x - b->pos.x) / d;
                float ny = (u->pos.y - b->pos.y) / d;

                /* Push apart based on relative masses */
                float total_mass = u->mass + b->mass;
                float r_a = b->mass / total_mass;
                float r_b = u->mass / total_mass;

                u->pos.x += nx * overlap * r_a;
                u->pos.y += ny * overlap * r_a;
                b->pos.x -= nx * overlap * r_b;
                b->pos.y -= ny * overlap * r_b;

                /* Elastic velocity impulse */
                float rvx = u->vel.x - b->vel.x;
                float rvy = u->vel.y - b->vel.y;
                float vel_along_norm = rvx * nx + rvy * ny;
                if (vel_along_norm < 0.0f) {
                    float impulse = -(1.2f) * vel_along_norm / (1.0f / u->mass + 1.0f / b->mass);
                    u->vel.x += (impulse / u->mass) * nx;
                    u->vel.y += (impulse / u->mass) * ny;
                    b->vel.x -= (impulse / b->mass) * nx;
                    b->vel.y -= (impulse / b->mass) * ny;
                }
            }
        }
    }

    /* 3. Integrate Physics & Arena Boundaries */
    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        Unit* u = &g_units[i];
        if (!u->is_active || u->hp <= 0.0f) continue;

        /* Acceleration = Force / Mass */
        float ax = u->force.x / u->mass;
        float ay = u->force.y / u->mass;

        u->vel.x += ax * dt;
        u->vel.y += ay * dt;

        /* Friction & drag */
        u->vel.x *= powf(0.82f, dt * 60.0f);
        u->vel.y *= powf(0.82f, dt * 60.0f);

        u->pos.x += u->vel.x * dt;
        u->pos.y += u->vel.y * dt;

        /* Arena Boundary Constraints with Bounce */
        float min_x = u->radius;
        float max_x = g_state.arena_width - u->radius;
        float min_y = u->radius;
        float max_y = g_state.arena_height - u->radius;

        if (u->pos.x < min_x) {
            u->pos.x = min_x;
            u->vel.x *= -0.5f;
        } else if (u->pos.x > max_x) {
            u->pos.x = max_x;
            u->vel.x *= -0.5f;
        }

        if (u->pos.y < min_y) {
            u->pos.y = min_y;
            u->vel.y *= -0.5f;
        } else if (u->pos.y > max_y) {
            u->pos.y = max_y;
            u->vel.y *= -0.5f;
        }
    }

    /* 4. Projectile Integration and Collision */
    for (uint32_t i = 0; i < MAX_PROJECTILES; i++) {
        Projectile* p = &g_projectiles[i];
        if (!p->is_active) continue;

        p->life_timer += dt;
        if (p->life_timer >= p->max_life) {
            p->is_active = 0;
            if (g_state.projectile_count > 0) g_state.projectile_count--;
            continue;
        }

        p->pos.x += p->vel.x * dt;
        p->pos.y += p->vel.y * dt;

        /* Arena bounds check */
        if (p->pos.x < 0.0f || p->pos.x > g_state.arena_width ||
            p->pos.y < 0.0f || p->pos.y > g_state.arena_height) {
            p->is_active = 0;
            if (g_state.projectile_count > 0) g_state.projectile_count--;
            continue;
        }

        /* Check collision with enemy units */
        for (uint32_t j = 0; j < MAX_UNITS; j++) {
            Unit* victim = &g_units[j];
            if (!victim->is_active || victim->hp <= 0.0f || victim->team == p->team) {
                continue;
            }

            float hit_dist = p->radius + victim->radius;
            if (vec2_dist_sq(p->pos, victim->pos) <= hit_dist * hit_dist) {
                /* Hit detected! */
                Vec2 norm_vel = vec2_norm(p->vel);

                if (p->splash_radius > 0.0f) {
                    /* Splash Damage for Nova Sorcerer (Star) */
                    for (uint32_t k = 0; k < MAX_UNITS; k++) {
                        Unit* splash_target = &g_units[k];
                        if (splash_target->is_active && splash_target->hp > 0.0f && splash_target->team != p->team) {
                            float d = vec2_dist(p->pos, splash_target->pos);
                            if (d <= p->splash_radius) {
                                float falloff = 1.0f - (d / p->splash_radius) * 0.5f;
                                Vec2 spl_dir = { splash_target->pos.x - p->pos.x, splash_target->pos.y - p->pos.y };
                                spl_dir = vec2_norm(spl_dir);
                                apply_damage(splash_target, NULL, p->damage * falloff, spl_dir, 120.0f);
                            }
                        }
                    }
                } else {
                    /* Direct projectile hit */
                    apply_damage(victim, NULL, p->damage, norm_vel, 70.0f);
                }

                p->is_active = 0;
                if (g_state.projectile_count > 0) g_state.projectile_count--;
                break;
            }
        }
    }

    /* 5. Update Total Armies HP and Check Win/Loss Condition */
    float blue_hp = 0.0f;
    float red_hp = 0.0f;
    uint32_t blue_count = 0;
    uint32_t red_count = 0;

    for (uint32_t i = 0; i < MAX_UNITS; i++) {
        if (g_units[i].is_active && g_units[i].hp > 0.0f) {
            if (g_units[i].team == TEAM_BLUE) {
                blue_hp += g_units[i].hp;
                blue_count++;
            } else {
                red_hp += g_units[i].hp;
                red_count++;
            }
        }
    }

    g_state.blue_alive = blue_count;
    g_state.red_alive = red_count;
    g_state.blue_total_hp = blue_hp;
    g_state.red_total_hp = red_hp;

    /* Win/Loss Check (after initial battle start beat of 0.2s) */
    if (g_state.sim_time > 0.2f) {
        if (blue_count == 0 && red_count == 0) {
            g_state.phase = SIM_PHASE_DRAW;
        } else if (blue_count == 0) {
            g_state.phase = SIM_PHASE_VICTORY_RED;
        } else if (red_count == 0) {
            g_state.phase = SIM_PHASE_VICTORY_BLUE;
        }
    }
}

/* Public Pointers for Zero-Copy WASM Heap Inspection */
const BattleState* engine_get_state(void) {
    return &g_state;
}

const Unit* engine_get_units(uint32_t* out_count) {
    if (out_count) *out_count = g_state.unit_count;
    return g_units;
}

const Projectile* engine_get_projectiles(uint32_t* out_count) {
    if (out_count) *out_count = g_state.projectile_count;
    return g_projectiles;
}

const SimEvent* engine_get_events(uint32_t* out_count) {
    if (out_count) *out_count = g_event_count;
    return g_events;
}

void engine_clear_events(void) {
    g_event_count = 0;
}
