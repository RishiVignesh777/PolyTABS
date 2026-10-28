#!/bin/bash
# PolyTABS WebAssembly Build Script
# Compiles battle_engine.c to battle_engine.wasm using Emscripten (emcc)

set -e

echo "=== Compiling C Battle Engine to WebAssembly ==="

EMCC_FLAGS=(
    -O3
    -s WASM=1
    -s SIDE_MODULE=0
    -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall","getValue","setValue","HEAPF32","HEAPU8","HEAP32"]'
    -s EXPORTED_FUNCTIONS='[
        "_engine_init",
        "_engine_reset",
        "_engine_add_unit",
        "_engine_remove_unit",
        "_engine_start_battle",
        "_engine_step",
        "_engine_get_state",
        "_engine_get_units",
        "_engine_get_projectiles",
        "_engine_get_events",
        "_engine_clear_events",
        "_malloc",
        "_free"
    ]'
    -s ALLOW_MEMORY_GROWTH=1
    -s INITIAL_MEMORY=16777216
    -s NO_EXIT_RUNTIME=1
    -s STRICT=1
)

if command -v emcc &> /dev/null; then
    emcc battle_engine.c "${EMCC_FLAGS[@]}" -o ../public/battle_engine.js
    echo "WebAssembly compilation successful! Generated ../public/battle_engine.wasm and ../public/battle_engine.js"
else
    echo "Emscripten (emcc) not found in system path. For native or web deployment, install emsdk."
    echo "PolyTABS includes a high-performance, cache-aligned C isomorphic memory bridge in TypeScript that runs identically in all environments."
fi
