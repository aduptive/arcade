# Highrise — TODO

## In flight

- [ ] Validate the new Icy-Tower-style air control (ground velocity carries, air input is minor: AIR_MAX_SPEED 320, AIR_ACCEL_SAME 1200, AIR_ACCEL_REVERSE 2500, AIR_DRAG 400)
- [x] ~~Decide whether the 320 → 240 speed cap drop on takeoff feels jarring~~ — moot, removed the cap mismatch
- [ ] Decide whether to also add the Icy Tower jump-HEIGHT bonus from horizontal speed (separate from lateral carryover)
- [ ] Pick the next Phase 3 ability: double jump vs shield vs world pickups

## Recently done

- [x] Adopt the four-file project convention (PROJECT, PLAN, TODO, HISTORY)
- [x] Tune AIR_ACCEL_REVERSE up to 10000 for fast direction inversion in the air
- [x] Split ground vs air max horizontal speed (320 / 240)
- [x] Asymmetric air acceleration: same direction fast, reverse direction tunable
- [x] Air control preserves horizontal momentum when input is released
- [x] Super jump ability: 1.5× velocity, 60s charge, max 3 charges
- [x] Wall collisions on left and right edges
- [x] Phase 2 difficulty curve with level flash UI
- [x] Time tracking aligned with auto-scroll trigger
- [x] Auto-scroll triggers on landing, not on takeoff
- [x] Phase 1 core feel (auto-scroll, permadeath)

## Considering

- [ ] Ship v1 to Itch.io to validate the deploy pipeline before adding more features
- [ ] Add a per-game self-contained build target (current multi-page build shares chunks across games, which breaks single-game upload to CrazyGames/Poki)
- [ ] Translate existing Portuguese code comments to English (non-blocking cleanup)
