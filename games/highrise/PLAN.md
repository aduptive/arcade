# Highrise — Plan

## Phase 1 — Core feel

- [x] Player + procedural steps + jump physics
- [x] Vertical-only camera that follows the player upward
- [x] Procedural step generation as the player climbs
- [x] Hybrid auto-scroll: minimum scroll pressure plus player-driven catch-up
- [x] Auto-scroll triggers on the first non-floor step landing (not on the jump)
- [x] Permadeath when falling off the bottom or being overtaken by the scroll
- [x] Time tracking from the same trigger as auto-scroll
- [x] Wall collisions on left and right edges (no more screen wrap)

## Phase 2 — Difficulty curve

- [x] Continuous interpolation of step width, vertical gap and scroll speed by height
- [x] Discrete level display (1 through 10), incrementing every 50m
- [x] Visual flash when the level increases

## Phase 3 — Abilities

- [x] Super jump — cooldown-based, 1.5× velocity, 60s recharge, max 3 charges
- [x] Air control split into same-direction and reverse-direction acceleration
- [x] Ground velocity carries into the air (ground=air max speed = 320)
- [x] Air input is small relative to ground commitment (Icy-Tower-style)
- [x] Action button is dedicated super-jump (no normal-jump fallback)
- [x] World pickups: coin, super, lunar gravity, mystery box
- [ ] Double jump — second jump while airborne, for recovery
- [ ] Shield — single fall save (could be a new pickup or a cooldown ability)
- [ ] Score multiplier pickup — temporary 2× scoring

## Phase 4 — Combo system

- [ ] Track consecutive jumps without touching the ground
- [ ] Score multiplier driven by combo length
- [ ] Visual feedback (large multiplier text, screen shake, particles)
- [ ] Decide whether to add the Icy Tower run-into-jump JUMP HEIGHT bonus (separate from the lateral-velocity carryover already in Phase 3)

## Phase 5 — Scoring and Hall of Fame

- [ ] Final score formula combining height, time, best combo and pickups
- [ ] Local leaderboard via localStorage (top 10)
- [ ] Hall of Fame screen accessible from main menu and game over
- [ ] Optional name entry on a new high score

## Phase 6 — Visual identity ("the dress")

- [ ] Player sprite with idle, jump and fall animations
- [ ] Per-level step theme variations
- [ ] Background with parallax layers
- [ ] Particles (jump dust, combo sparkles, death explosion)
- [ ] Screen shake on impact and combo break
- [ ] Sound effects (jump, land, pickup, combo, death)
- [ ] Background music

## Open questions

- Should the v1 ship to Itch.io after Phase 3 instead of completing 4-6 in private?
- For Phase 6, do we commission/AI-generate sprites or keep placeholder shapes longer?
- Is the run-into-jump speed bonus part of Phase 4 (combo) or its own item?
