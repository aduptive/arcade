# Highrise — TODO

## In flight

- [x] Validate the latest air physics tuning together over a few runs (AIR_ACCEL_SAME 5000, AIR_ACCEL_REVERSE 10000, GROUND_MAX_SPEED 320, AIR_MAX_SPEED 240) — confirmed good
- [ ] Decide whether the 320 → 240 speed cap drop on takeoff feels jarring (smooth carryover if so)
- [ ] Pick the next Phase 3 ability: double jump (in-air recovery) vs shield (single fall save) vs world pickups

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
