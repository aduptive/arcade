# Highrise

## What this is

Vertical-scroll jumper inspired by Icy Tower and Doodle Jump. Single-player, score-attack, browser HTML5. Part of the Aduptive Arcade monorepo.

## Current status

Active development. Phase 3 in progress — first cooldown-based ability (super jump) shipped, air-control physics tuned. Core gameplay loop fully functional.

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
