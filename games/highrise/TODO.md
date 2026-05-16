# Highrise — TODO

## In flight

- [ ] Validate the new pickup system end-to-end (spawning, collection, effects, HUD, mystery box outcomes)
- [ ] Tune pickup spawn chance (currently 15% per step) and the mystery box distribution after a few runs
- [ ] Validate the dynamic canvas size and smooth rendering on the user's screen
- [ ] Decide whether to also add the Icy Tower jump-HEIGHT bonus from horizontal speed
- [ ] When/if we want to allow wider canvases (>600), implement a spawn-aware step generator that respects max jump distance from the previous step

## Recently done

- [x] Super jump becomes a sustained 2s low-gravity boost instead of an instant 1.5x impulse
- [x] Drop-through with `down` to reach pickups below the current step
- [x] World pickups: coin, super, lunar gravity, mystery box (with random outcomes)
- [x] Dynamic canvas size + smooth (non-pixelated) rendering
- [x] Make `action` a dedicated super-jump input (no normal-jump fallback)
- [x] Icy-Tower-style air control: ground velocity carries into the air, air input is small
- [x] Air drag for fine-tap precision
- [x] Adopt the four-file project convention (PROJECT, PLAN, TODO, HISTORY)
- [x] Tune AIR_ACCEL_REVERSE up to 10000 for fast direction inversion in the air
- [x] Split ground vs air max horizontal speed
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
