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

- [x] Super jump — cooldown-based, sustained 2s low-gravity boost, 60s recharge, max 3 charges
- [x] Air control split into same-direction and reverse-direction acceleration
- [x] Ground velocity carries into the air (ground=air max speed = 320)
- [x] Air input is small relative to ground commitment (Icy-Tower-style)
- [x] Action button is dedicated super-jump (no normal-jump fallback)
- [x] World pickups: coin, super, lunar gravity, mystery box
- [x] Drop-through with `down` to reach pickups below the current step
- [ ] Double jump — second jump while airborne, for recovery
- [ ] Shield — single fall save (could be a new pickup or a cooldown ability)
- [ ] Score multiplier pickup — temporary 2× scoring

## Phase 4 — Combo system

- [x] Track consecutive new-step-upward landings (resets on landing on same step or going down)
- [x] Combo breaks after standing still > 1.5s on a step, paying out bonus points
- [x] HUD shows current combo (x2+)
- [x] Big "x3!" / "INSANO!" text flash on each combo increment, colored by tier
- [x] Bonus payout on break: combo * COMBO_POINTS_PER_STEP
- [x] Best combo carried into pause overlay and game over screen
- [ ] Add the Icy Tower run-into-jump JUMP HEIGHT bonus (separate from the lateral-velocity carryover already in Phase 3) — deferred

## Phase 5 — Scoring and Hall of Fame

- [x] Final score formula combining height, points and best combo (time deferred)
- [x] Local leaderboard via localStorage (top 10) — shared/score/leaderboard.ts
- [x] Hall of Fame screen accessible from main menu (HOF link) and game over (HOF button)
- [x] Name entry on a new high score (browser prompt + remembered last name)

## Phase 6 — Multi-map / Crazy Climber architecture

This phase is a strategic pivot: instead of committing to a single visual identity, the game becomes a Crazy Climber-style platform with multiple selectable maps and characters. Each map's "step" is thematic architecture (NY window ledges, tree branches in Arborea, gargoyles, etc.).

### Architecture (foundation)

- [x] Extract `MapTheme` config type: paintBackground, paintStep, color, name, tagline
- [x] Extract `CharacterSkin` config type: paintCharacter, name, id
- [x] `MenuScene` for map and character selection
- [x] `GameScene` becomes generic, parameterized via `init(data)`
- [x] Selection persisted via localStorage
- [x] ESC during a run returns to the menu (devtest convenience)
- [x] GameOverScene routes AGAIN (replay) or MENU (re-select)

### First character: generic climber

- [x] Placeholder climber rectangle (blue body, gold helmet hint) — sprite art comes in Phase 6
- [ ] Idle / jump / fall animation frames once sprite exists

### Subsequent maps (future content drops)

Ranked rough order of appeal:

- [x] NY skyscraper — step = window ledge with AC unit, classic Crazy Climber homage; tiled glass-tower structure behind
- [x] Arborea — giant tree map: trunk structure tiles infinitely upward, parallax forest behind, steps are leafy branches
- [ ] Pão de Açúcar — step = granite outcrop, Rio scenery
- [ ] Inferno — step = giant skull / demon rib, lava below (resurrects single-theme proposal #2)
- [ ] Submarino — step = shipwreck debris / coral, octopus character (resurrects proposal #13)
- [ ] Floresta Atlântica — step = tree branch with fruits, sagui character
- [ ] Catedral Gótica — step = gargoyle
- [ ] Babel — step = ancient stone block with runes
- [ ] Tokyo Tower — step = red steel girder
- [ ] Pirâmide Egípcia — step = carved stone block

### Subsequent characters (future content drops)

- [x] Capivara (placeholder rectangle)
- [ ] Cat
- [ ] Italian alpinist (Marco)
- [ ] Astronaut
- [ ] Capeta
- [ ] Soul / ghost
- [ ] Painter

### Juice and audio (kept from original Phase 6)

- [ ] Particles (jump dust, combo sparkles, death explosion)
- [ ] Screen shake on impact and combo break
- [ ] Sound effects (jump, land, pickup, combo, death)
- [ ] Background music (per-map)

## Open questions

- Should the v1 ship to Itch.io after Phase 3 instead of completing 4-6 in private?
- For Phase 6, do we commission/AI-generate sprites or keep placeholder shapes longer?
- Is the run-into-jump speed bonus part of Phase 4 (combo) or its own item?
