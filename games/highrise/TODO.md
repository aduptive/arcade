# Highrise — TODO

## In flight

- [ ] **Next session, big one:** refactor to multi-map architecture (`MapTheme`, `CharacterSkin`, `MenuScene`, generic `GameScene`)
- [ ] First map after refactor: Favela (steps = colored rooftops with details, BG with Cristo + power lines, funk/samba placeholder music)
- [ ] First character after refactor: generic climber (faceless, helmet + backpack)
- [ ] Validate the new pickup system, super-jump boost, and drop-through together after a few runs
- [ ] Tune pickup spawn chance (15% per step) and the mystery-box outcome distribution
- [ ] Decide whether to also add the Icy Tower jump-HEIGHT bonus from horizontal speed
- [ ] Sustained super-jump boost: validate that 2s and 20% gravity feels right (vs alternatives like 3s @ 30% or 1.5s @ 10%)

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
