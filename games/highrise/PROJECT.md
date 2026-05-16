# Highrise

## What this is

Vertical-scroll jumper inspired by Icy Tower and Doodle Jump. Single-player, score-attack, browser HTML5. Part of the Aduptive Arcade monorepo.

## Current status

Active development. Multi-map architecture shipped: `MapTheme` + `CharacterSkin` + `MenuScene` + generic `GameScene`. Three maps (Default, Skyline / NY, Arborea) and six characters (Woodcutter, Grave Robber, Steam Man, plus the placeholder Cubinho, Climber, Capivara) selectable via a menu; selection persists across sessions in localStorage. Gameplay loop (Phase 1-3) is complete and stable. Next focus is the combo system (Phase 4), a local Hall of Fame (Phase 5), audio infrastructure and themed pickups per map.

## Scope

**In scope:**
- Vertical procedural jumper with auto-scroll pressure
- Multiple level zones with difficulty curve (step width, gap, scroll speed)
- Cooldown-based abilities (super jump shipped; double jump, shield, multiplier planned)
- World pickups as alternative gain mechanism
- Combo/score system with local Hall of Fame
- Visual polish: sprites, per-level theme variation, particles, sound, music

**Out of scope (for now):**
- Multiplayer
- Hand-crafted level design (procedural only)
- Story mode
- Account/cloud leaderboard (local-only initially)

## Key context

- Part of the validation strategy for the HTML5 browser game portal market (Itch, CrazyGames, Poki). See the arcade monorepo's parent docs for the broader strategy.
- Genre choice was deliberate: zero level design (procedural), single mechanic (jump), commercially validated format (Doodle Jump made tens of millions USD), mobile-portrait friendly.
- Built with Phaser 3 + Arcade physics + TypeScript + Vite.
- Shares `InputManager` and SDK wrappers with sibling game `soberba` via the `@shared/*` alias.

## Relation to other projects

Sibling to `soberba` (physics Tetris) inside the same monorepo `aduptive/arcade`. Both share infrastructure but are independent products. Highrise is the priority — Soberba was a first attempt that revealed the user does not naturally play that genre.
