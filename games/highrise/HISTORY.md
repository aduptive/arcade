# Highrise — History

## 2026-05-17 — Phase 4: combo system

- Each consecutive UPWARD step landing increments the combo counter. Landing on the same step or at equal/lower height ends the chain.
- Combo also ends if the player stands still on a step for more than `COMBO_STAND_BREAK_MS` (1.5s) — keeps the player honest, no farming x100 by camping.
- On break, payout: `combo * COMBO_POINTS_PER_STEP` (5 points per level) added to the score. Encourages risk: hold the combo for big jumps to multiply.
- HUD shows current combo (`COMBO x3`) only when >= 2.
- Large center-screen flash on each gain: yellow up to x4, orange up to x9, red "x10 INSANO!" from x10 on.
- `bestCombo` is tracked through the run and shown in both the pause overlay and the game over screen.
- Game over forces a final `breakCombo()` so a pending chain still pays its bonus before exiting.

## 2026-05-17 — Removed the Favela map

- Map removed at the user's request. Favela carries real-world weight in Brazil (poverty, violence, struggle of real communities) and turning it into a casual-game backdrop was the wrong call. We don't want to romanticize that setting.
- Deleted `games/highrise/src/maps/favela.ts` and the import in `maps/index.ts`. ALL_MAPS now contains Default, Skyline (NY) and Arborea.
- Capivara character is kept — it's a Brazilian animal that fits any future Brazil-themed map, not specifically the favela.

## 2026-05-17 — Fix: sprite no longer "jumps" position when flipping facing

- User confirmed via side-by-side screenshots that flipping the character left/right visually shifted the sprite ~14 display pixels even though the physics body stayed put. The Craftpix art has the character's body about 6 source pixels right of center within its 48x48 frame, and `setFlipX(true)` mirrors around the frame center.
- Wrapped sprite characters in a Phaser Container. Container holds the logical position and physics body; the inner Sprite sits at a flip-aware horizontal offset that exactly cancels the art's off-center placement.
  - Facing right (unflipped): inner sprite shifted LEFT by `ART_OFFSET_IN_FRAME × scale` so the body aligns with the container center.
  - Facing left (flipped): inner sprite shifted RIGHT by the same amount.
- Net effect: the character's visible body sits at the container's center regardless of facing — the flip is purely an orientation change, no horizontal shift.
- `CharacterGameObject` type now includes `Container`. `flashSuperUsed` reaches into the container's `innerSprite` data slot to apply / clear the tint.
- Rectangle placeholder characters (default, climber, capivara) are unaffected.

## 2026-05-17 — Dev affordance: `?level=N` URL param starts at difficulty N

- Used `?level=9` in the URL to drop straight into level-9 difficulty without grinding from the bottom — handy for testing balance, spawn density and the new sprite animations at higher level.
- MenuScene reads the param on `startGame()` and forwards `startLevel` to GameScene.
- GameScene stores `scoreOffset = (startLevel - 1) * 50` and adds it to the displayed/internal score every frame, so `getLevelConfig` returns the right config immediately.
- Initial floor and procedural step spawn already at level-N step width / vertical gap.
- HUD shows the level number from frame 1; the usual level-up flash will fire as the player climbs past further thresholds.
- AGAIN on GameOverScene preserves the startLevel so retries stay at the test difficulty.
- Range is clamped to 2..10; invalid values fall back to a normal level-1 run.

## 2026-05-17 — Ground input deadband (taps only flip facing, never slide)

- User feedback: even with acceleration-based ground movement, a deliberate "just turn around" tap on the keyboard or hold-zone still produced a small slide that could matter near a step edge.
- Added `GROUND_INPUT_DEADBAND_MS = 80`. Pressing left or right on the ground starts accumulating hold time; only after 80ms does the input begin applying acceleration. Below the threshold, friction keeps the player firmly at rest.
- Facing direction (sprite flip) now derives from raw input rather than velocity, so a sub-deadband tap still flips the character instantly — gives the visual feedback the player expects.
- When no input is held, facing falls back to velocity (so a moving player faces their direction of travel until they release).

## 2026-05-17 — Ground movement now acceleration-based (brief taps barely move)

- Reported regression after the body widened to 40px: when standing near the edge of a narrow step, a quick direction tap could slide the player off because horizontal velocity was set instantly to ±320 px/s on key press.
- Replaced instant velocity on the ground with acceleration: `GROUND_ACCEL = 1800 px/s^2` from rest, `GROUND_DECEL_REVERSE = 3000 px/s^2` when input opposes motion, `GROUND_FRICTION = 4000 px/s^2` when no input.
- Result: a ~16ms tap moves the player < 1px (essentially flips facing); 100ms press moves ~10px; held key still hits MAX in ~180ms. Direction switching near edges no longer drops the player off the step.
- Air control unchanged.

## 2026-05-17 — Body positioned at the character's feet (no more knee-deep landings)

- After enlarging the player visual to 112px with a 28-px centered body, the character appeared "sunk" into every step — visual extended 42 px below the body, so the feet rendered well inside the platform.
- Reframed the body as the character's footprint instead of a centered shape:
  - `PLAYER_BODY_WIDTH = 40`, `PLAYER_BODY_HEIGHT = 60` (in world pixels)
  - `PLAYER_BODY_FOOT_INSET = 6` for the empty pixels at the bottom of the sprite frame
  - Body is centered horizontally but anchored at the bottom of the visual, so the feet visually rest on top of the step.
- Math handles both sprites and placeholder rectangles by dividing by the GameObject's scale (Arcade's `setSize` takes source/texture units; the body's world size is `source × scale`).
- Body width 40 still fits inside the smallest level-10 step (50 px wide), so gameplay tightness is unchanged.

## 2026-05-17 — Pause overlay shows run stats + GameScene grayscale

- PauseScene now displays a five-row recap of the current run (ALTURA, PONTOS, TEMPO, NÍVEL, SUPER) above the RESUME / MENU buttons, instead of just "PAUSED".
- GameScene applies a `ColorMatrix.grayscale()` post-FX to its camera when openPause runs, and clears it on the scene `RESUME` event. The frozen frame behind the overlay reads as a black-and-white snapshot of the moment of pause.
- If the player picks MENU instead of RESUME, PauseScene also clears the post-FX defensively so a future run on the same map doesn't start grayscaled.

## 2026-05-17 — HMR hardening: destroy Phaser game + full reload on module change

- Reported issue: editing source files left the dev server running but the page broken / requiring a manual server restart.
- Root cause: Vite was hot-replacing modules without destroying the previous `Phaser.Game` instance. Phaser holds a live `<canvas>` + WebGL context that doesn't survive hot-swap; the page ends up with stale listeners or a duplicate game.
- Fix in both `games/highrise/src/main.ts` and `games/soberba/src/main.ts`:
  - `import.meta.hot.dispose(() => game.destroy(true))` tears down the old game when the module is replaced.
  - `import.meta.hot.accept(() => window.location.reload())` forces a full reload on any module update — slightly slower than ideal HMR, but reliable for Phaser-shaped state.
- Added `"types": ["vite/client"]` to `tsconfig.json` so `import.meta.hot` typechecks.

## 2026-05-17 — Pause: ESC now pauses; HUD pause button; PauseScene overlay

- ESC used to bail straight to the main menu without saving the run state — too aggressive. Now ESC pauses the game and overlays a `PauseScene` with RESUME / MENU buttons.
- New `PauseScene` (launched via `scene.launch` + `scene.pause` of GameScene) dims the screen, shows PAUSED, and exposes both buttons + keyboard shortcuts (ESC/SPACE = resume, M = menu).
- New HUD pause button (circle with "II" glyph) in the top-right under the timer — primary input on mobile where there's no ESC key. Visible on desktop too for consistency.
- ESC handler switched from `once` to `on` so it works for every pause cycle, not just the first.

## 2026-05-17 — Fix: TileSprite buffer error on desktop + add JUMP/SUPER buttons on mobile

- **Desktop bug:** "Cannot allocate a buffer of this size" thrown by NY and Arborea maps. Root cause: I sized the `paintStructure` TileSprite as `widthxN` with N = 2,000,000, which made WebGL try to allocate a multi-gigabyte render buffer. WebGL has hard size limits per dimension.
- **Fix:** TileSprite is now sized to the screen (`height + 100`), pinned with `setScrollFactor(0)`, and shifts `tilePositionY = camera.scrollY` on every `UPDATE` event. Visual result is identical (the pattern appears to scroll infinitely upward), but cost is constant. Cleanup hook on `SHUTDOWN` removes the listener.
- **Mobile bug:** the bottom-strip hold zones swallowed all touches in the lower half, leaving no obvious way to jump (top half still worked, but undiscoverable).
- **Fix:** redesigned the bottom strip into three columns. Left and right still hold to move. Middle column has two visible buttons: a large orange JUMP button and a smaller cyan SUPER button above it, both with press feedback (alpha shift on down). Buttons use `setVirtualPressed`; `justPressed` semantics naturally fire jump on tap.
- Arrow hints relabeled to `<` and `>` (ASCII, render reliably across iOS Safari).

## 2026-05-17 — Mobile on-screen movement controls (left/right hold zones)

- User reported on iPhone: tap = jump works, but no way to move left or right because swipe-based touch only fires once per gesture (no sustained press).
- Added `MobileControls` to `shared/input/`: when running on a touch device, the bottom 35% of the screen becomes two hold zones (left half / right half) that drive `InputManager.virtualPressed` continuously. Dim ◀ / ▶ hints with a subtle divider make the zones discoverable.
- Extended `InputManager` with `setVirtualPressed(action, bool)` for continuous virtual state and `setTouchIgnoreBelowY(y)` so the swipe/tap detector ignores touches that start inside the dedicated bottom strip. This prevents hold-then-release on a hold zone from also firing a global jump.
- The top 65% of the screen keeps existing tap/swipe behavior: tap = jump, swipe down = super jump.
- Auto-no-ops on desktop (no touch hardware). No visual or behavioral change for keyboard / gamepad players.

## 2026-05-17 — MapTheme gains a paintStructure layer; new Arborea map

- User architectural insight: maps should have TWO background layers — a far parallax background AND a "structure" layer that scrolls 1:1 with the camera, tiles infinitely vertically, and represents the actual thing being climbed (the tower wall behind NY ledges, the trunk of a giant tree, etc.).
- Added optional `paintStructure` to `MapTheme`, rendered between parallax background and steps. Layering convention is now: parallax bg → structure → steps → pickups → player → HUD.
- Implemented via Phaser `TileSprite` over a procedurally generated tile texture, so a single GameObject covers infinite vertical extent without thousands of draw calls.
- Refactored NY map to use it: tile texture is a 32x48 wall slab with a lit window, tiled to fill a 540-wide tower behind the ledges.
- Added new **Arborea** map (giant tree): trunk structure via tiled bark texture; parallax background with 3 layers of forest silhouettes + floating dust motes; steps are green branches with leaf clusters, perched birds, and hanging vines.
- Favela map intentionally leaves `paintStructure` undefined: each rooftop IS its own building.

## 2026-05-17 — Sprite characters from Craftpix (Woodcutter / GraveRobber / SteamMan) with state-driven animations

- Replaced the previous 32x32 chibi spritesheet (OpenGameArt download with no per-frame labels) with three 48x48 Craftpix character packs that ship each animation as its own labeled spritesheet (idle, walk, run, jump, climb, push, craft, hurt, death, attack1-3).
- New `PlayerState` type (`idle | walk | jump | fall | climb`) and `updateAnimation(args)` hook on `CharacterSkin`. Rectangle placeholders simply don't implement the hook.
- `spriteCharacter.ts` is a shared factory that builds a sprite-based `CharacterSkin` from a basename. The three new character files are 4 lines each thanks to this.
- BootScene preloads idle/walk/jump/climb spritesheets for all three characters (12 files) and registers Phaser animations once for the whole game lifetime.
- GameScene drives the animation each frame: ground+input → walk, in air going up → jump, in air going down → fall (uses last jump frame), super-jump boost → climb (reads beautifully as a sustained ascent), otherwise idle. Sprite is flipped horizontally based on velocity.
- Player body is forced to `PLAYER_SIZE x PLAYER_SIZE` regardless of the sprite's intrinsic art size (48x48 scaled to 28x28 logical), keeping collisions identical across all character types.
- `flashSuperUsed` now uses `setTint` for sprites and `setFillStyle` for rectangles via feature detection.
- DEFAULT_CHARACTER_ID switched from the orange rectangle to `woodcutter`.
- Credit added in README to Craftpix; their free 3-character pack license allows commercial use with attribution.
- Old chibi character files (`pixelOrange/Royal/Soldier/Mini.ts`) and `public/sprites/characters.png` removed.

## 2026-05-17 — Reachability constraint on step spawn

- User-reported bug: at higher levels (narrower steps) and on wider canvases (post 480 → 600 cap), two consecutive steps could spawn on opposite walls — gap larger than the player's maximum horizontal jump. Unwinnable instant death.
- Fix: tracked `lastStepX` and `lastStepWidth` on every `addPlatform` call. New helper `pickReachableStepX(width)` clamps the spawn so the gap between previous-step-edge and next-step-edge never exceeds `MAX_HORIZONTAL_GAP_BETWEEN_STEPS = 180 px`.
- With current physics (max ~400px horizontal jump) and the smallest step width (50 px at level 10), 180px gap leaves comfortable margin for imperfect approaches.
- Wall constraints still take precedence — `pickReachableStepX` clamps to wall bounds first, then to reach.
- Floor is treated like a very wide previous step (its width is `GAME_WIDTH`), so the first procedural step above the floor has effectively no reach constraint — only wall bounds — which is correct since the player can take off from anywhere on the floor.

## 2026-05-17 — Multi-map architecture shipped (Default + Favela + NY) + MenuScene

Architectural refactor from the strategic pivot landed in a single overnight session, with the gameplay loop staying identical the entire time.

**Architecture:**
- `MapTheme` interface (`src/maps/MapTheme.ts`): paintBackground, paintStep, backgroundColor, name, tagline, optional HUD/flash accents
- `CharacterSkin` interface (`src/characters/CharacterSkin.ts`): paintCharacter, name, id
- `GameScene.init(data)` reads `mapId` and `characterId` from scene data and looks up the theme/character via `getMapById` / `getCharacterById`
- Everything that was hardcoded (background colors, step paint, player paint) now goes through these interfaces

**Maps shipped:**
- `default` (Night Sky) — original look, preserves visual continuity
- `favela` (Morro Acima) — warm sunset gradient, distant hills with Cristo silhouette, colored rooftops with antennas / clotheslines / water tanks / satellite dishes as decorations
- `ny` (Skyline) — direct nod to Crazy Climber 1980; deep blue night, far parallax grid of lit windows, moon. Steps are concrete window ledges with AC units, pigeons or satellite dishes

**Characters shipped:**
- `default` (Cubinho) — original orange rectangle
- `climber` — blue body with gold helmet hint
- `capivara` — brown rectangle for the favela map

**Selection UX:**
- New `MenuScene` between BootScene and GameScene. Title, map cards (live color preview), tagline, character cards (live paintCharacter preview), big PLAY button
- Selection persists in `localStorage` so reopening the game keeps the last choice
- GameOverScene now offers AGAIN (replay same map/character) and MENU (back to selection) buttons; ENTER/SPACE = AGAIN, ESC = MENU
- ESC during a run bails out to the menu without dying — useful for cycling maps quickly

**What's still placeholder (next-day work):**
- Character sprites are just colored rectangles; real sprites come in Phase 6 polish
- Music is silent; per-map audio slots are designed but unwired
- Themed pickups per map (açaí/guaraná for favela; etc.) — pickup mechanics work, only the visuals are still the generic colored diamonds
- Map card previews show only a background-color swatch; a real thumbnail render would be nicer

## 2026-05-17 — Strategic pivot: Crazy-Climber multi-map model with thematic steps

- Long brainstorm on the visual/narrative direction ("the dress"). After surveying ~15 single-theme proposals (alpinist, devil, dinosaur, Babel, cat, hacker, soul, capybara, steampunk, DJ, painter, octopus, pizzaiolo, AI, etc.), the user proposed a fundamentally better framing: a **Crazy Climber-style multi-map game** with selectable characters.
- Key insight (user-originated): **each step IS thematic architecture** — favela = colored rooftops with water tanks and clotheslines; NY = window ledges with AC units; forest = tree branches with fruits; cathedral = gargoyles; etc. This is what separates the game visually from a generic Doodle Jump clone.
- All earlier single-theme proposals are preserved as future maps, not abandoned: Inferno, Babel, Submarino (octopus), Jurassic (dinosaur), Catnip (cat), 404 (hacker), Saudades (soul) all naturally become maps inside the new framework.
- Architecture direction agreed:
  - `MapTheme` config object (palette, BG layers, step style, music, pickup themes, narrative flair)
  - `CharacterSkin` config object (sprite, anim set; same physics across all)
  - `MenuScene` for map + character selection
  - `GameScene` becomes generic, parameterized by the active map and character
- Build plan: refactor first to multi-map architecture, then ship one polished map + one polished character (Favela + climber/capivara), and add maps as ongoing content from there.
- First map chosen: **Favela** — each step is a colored rooftop. Reason: visually iconic in a single frame, strong cultural differentiator in a market dominated by generic European/Asian themes, low ambiguity about what the game is.

## 2026-05-17 — Super jump becomes a sustained boost + drop-through with `down`

- User feedback: the super jump should feel like a force that lasts a couple of seconds, not just a higher instantaneous impulse.
- Replaced the multiplier-based super (`JUMP_VELOCITY × 1.5`) with a sustained-lift mechanic:
  - Initial impulse is the same as a normal jump (`JUMP_VELOCITY`), so the takeoff looks identical
  - For `SUPER_JUMP_BOOST_DURATION_MS = 2000`, the player's per-body gravity is offset so the *effective* gravity is `worldG × SUPER_JUMP_BOOST_GRAVITY_FACTOR (0.2)`
  - Reaches roughly twice the height of the old super; visually a rocket-like ascent
  - Boost ends early if the player lands on a step mid-flight (intentional cancel)
  - Stacks with lunar/heavy gravity pickups via per-body gravity offsets (we don't touch world gravity for the super)
- Added drop-through with `down` (arrow down / S / gamepad down / swipe down — wait, swipe down is `action`; touch is keyboard/gamepad-only for now): while grounded, pressing `down` opens a 250ms window where platform collisions are suppressed and the player gets a small downward nudge to clear the current step. Lets the player drop a level to grab a pickup that was missed.

## 2026-05-17 — World pickups: coin, super, lunar gravity and mystery box

- Phase 3 expanded with collectible pickups that spawn above procedural steps.
- 4 pickup types, weighted random selection (per spawn roll, 15% per non-floor step):
  - `coin` (gold, 60%) — instant +50 points
  - `super` (cyan, 20%) — +1 super-jump charge (capped at max)
  - `lunar` (purple, 12%) — gravity x 0.5 for 10s (floaty jumps)
  - `mystery` (yellow `?`, 8%) — random outcome (see below)
- Mystery roll outcomes (uniform from a fixed bag of 8):
  - Good: +1 super charge, lunar 10s, +200 points
  - Neutral-ish: +50 points (x2), nothing
  - Bad: heavy gravity (x1.7) 5s, lose 1 super charge
- New points counter independent of altitude. HUD shows `PONTOS` alongside `ALTURA`. Active gravity effect shown as `LUNAR Ms` / `HEAVY Ms`.
- Gravity effects mutate `physics.world.gravity.y` directly against a captured `baseGravityY`. Only one gravity effect can be active at a time; a new one overrides. Game over also restores gravity to avoid bleed between runs.
- Pickups are static-body diamonds (rotated rectangles) with a slow rotation tween. Off-screen pickups (below camera + 50px) are cleaned up each frame to avoid leaks.
- Collected pickup tween: scale 1.6 + fade out 180ms, then destroy.
- Game over screen now displays altitude, points and time.

## 2026-05-17 — Dynamic canvas size and smooth rendering

- User asked for the board to fill the screen and for the graphics to look better (less pixelated).
- `GAME_WIDTH` and `GAME_HEIGHT` are now derived from `window.innerWidth/innerHeight`, clamped to `[320..600]` wide and `[480..1280]` tall. Below the cap the canvas matches the actual viewport, so portrait phones now use their full width with no black bars.
- Removed `pixelArt: true` from the Phaser config and the `image-rendering: pixelated` CSS rule on `<canvas>`. Both forced nearest-neighbor scaling, which only makes sense with pixel-art textures (we have none yet — only vector shapes). Smooth scaling looks much better for the current art style.
- Width is capped at 600 because jump distance is bounded by physics. Without the cap, a 1200-wide board could spawn steps farther apart than the player can reach. Lifting the cap requires a "spawn-aware" step generator that knows the previous step's position and stays within reach (logged as a follow-up).
- All gameplay constants (walls, HUD positions, camera bounds) already use `GAME_WIDTH/GAME_HEIGHT` dynamically, so no other changes were needed.

## 2026-05-17 — Super jump is now a dedicated, exclusive input

- User feedback: super jump was firing on any `action` press whenever a charge was available, with no way to choose a regular jump using that same key. They wanted the super jump to be an explicit choice.
- Changed the jump logic so `action` (space / gamepad B / swipe down) now triggers super jump exclusively when a charge is available, and does nothing when out of charges. The previous fallback to a normal jump was removed.
- `up` (arrow up / W / gamepad up or A / tap) remains the always-normal jump. There are still 4 inputs for normal jump and 1 dedicated input for super, so no functionality is lost.
- Considered double-tap of `action` as the trigger (per the user's suggestion) but rejected for v1: it would introduce input lag in a platformer where every frame of jump responsiveness matters. Easy to revisit if the dedicated-button approach feels off.

## 2026-05-17 — Icy-Tower-style air control: launch velocity is the resource

- User design proposal: ground velocity should be the primary commitment; air input should only nudge, not steer.
- Removed the air-vs-ground speed mismatch: `AIR_MAX_SPEED` raised from 240 to 320 to match ground, so the launch velocity is preserved on takeoff (no instant cap drop).
- Lowered air accelerations dramatically: `AIR_ACCEL_SAME` from 5000 to 1200, `AIR_ACCEL_REVERSE` from 10000 to 2500. Air input still works for adjustments, but takes sustained pressure to materially change the trajectory.
- Lowered `AIR_DRAG` from 600 to 400 so the launched velocity persists farther across the arc when no key is held.
- Net effect: jumps now reward a planned run-up. Standing-jumps go almost straight up. Reversing in the air is possible but visibly costs time.
- Open follow-up (not implemented yet): the classic Icy Tower mechanic where horizontal ground speed also bumps jump height. Could become Phase 4 (combo) or its own item.

## 2026-05-17 — Air drag added for fine-control precision

- User feedback: small adjustments in the air were hard, because brief taps gained velocity that was preserved indefinitely (no decay), turning small inputs into long drifts.
- Added `AIR_DRAG = 600 px/s^2` that applies only when no horizontal input is pressed in the air.
- Result: holding a direction preserves momentum (jump arc feel intact), releasing the direction decays the velocity over a few tenths of a second. Brief taps now translate to small displacements.
- Tuning lever: lower `AIR_DRAG` for more momentum (less precision), higher for more precision (less momentum).

## 2026-05-17 — Adopted the four-file project convention

- Created `PROJECT.md`, `PLAN.md` and `TODO.md` at the game root, alongside the existing `HISTORY.md`, following the global four-file convention.
- `PROJECT.md` describes what the game is, current status, scope, key context, and how it relates to its sibling `soberba`.
- `PLAN.md` carries the full Phase 1-6 roadmap as checkboxes, mirroring decisions previously embedded in `HISTORY.md`.
- `TODO.md` lists in-flight items, recently done work, and items under consideration (notably shipping v1 to Itch.io).
- All new entries in this `HISTORY.md`, all new code comments and all commit messages will be written in English from this point forward, per global convention.
- Existing Portuguese entries below are preserved as a historical record and will not be retroactively rewritten.

## 2026-05-17 — Air control assimétrico (acelerar ≠ inverter)

- Insight do user após 5000: o problema não era responsividade geral, era a velocidade de **inversão de direção**.
- Split em duas constantes:
  - `AIR_ACCEL_SAME = 5000` — acelerar na direção atual (ou do parado): responsivo
  - `AIR_ACCEL_REVERSE = 1500` — inverter direção (vx tem sinal oposto ao input): lento, "tem peso"
- Resultado: pulo é responsivo (atinge max speed rápido), mas se comprometer com a direção tem custo. Recompensa decisão antes do pulo.
- Padrão clássico de bons platformers (Celeste, Super Meat Boy fazem variações disso).

## 2026-05-17 — Tuning: AIR_ACCEL 1500 → 4000 (controle no ar mais responsivo)

- Re-tuning depois do user testar 1500 e achar muito flutuante.
- Tempo pra inverter de full speed pra full speed contrário: ~0.16s (quase como no chão).

## 2026-05-17 — Tuning: AIR_ACCEL 2500 → 1500 (mais flutuante)

- Tentativa intermediária — não funcionou, ficou pesado demais.

## 2026-05-17 — Fix de feel: controle horizontal preserva momentum no ar

- Bug clássico: input horizontal sobrescrevia velocidade direto via `setVelocityX(0)` quando nada estava pressionado, fazendo o player parar bruscamente no ar.
- Fix: split entre chão e ar.
  - **No chão:** controle direto e responsivo (mantém o feel atual de chaining de pulos).
  - **No ar:** input vira aceleração (`AIR_ACCEL = 2500 px/s²`), não substituição. Soltar tecla = continua no momentum. Inverter direção = possível mas com inércia.
- Velocidade no ar capada em `MOVE_SPEED` (320 px/s) pra arco do pulo continuar previsível.

## 2026-05-17 — Phase 3 (parte 1): Super pulo com cooldown

- Reformulação da Phase 3: além dos pickups de mundo originalmente planejados, vamos ter também **abilities baseadas em cooldown**. Super pulo é o primeiro.
- **Mecânica:**
  - Velocidade × `SUPER_JUMP_MULTIPLIER = 1.5` (≈ 2.25× a altura, sensação de "o dobro" sem quebrar a física)
  - Carga única: 1 a cada 60s de corrida ativa, máximo 3, congelado em max
  - Botão `action` (espaço / gamepad B / swipe down) consome carga
  - Sem carga: `action` cai como pulo normal (não vira tecla "morta")
  - Só dispara no chão (`blocked.down`) — não é double jump
- **HUD:** `SUPER: xN (Ms)` em ciano abaixo do nível, mostra cargas atuais + segundos pra próxima.
- **Feedback:** ao usar, player escala 1.4 → 1.0 e flasha ciano por 180ms. Ao ganhar carga, texto do HUD pulsa (Back.easeOut).
- **Tuning escolhido (60s/charge, max 3):** corrida típica de 1-3 min dá 1-3 super pulos. Suficiente pra ser estratégico, raro pra ser especial.

## 2026-05-17 — Removido screen-wrap, paredes laterais reais

- Antes: player atravessava a borda (Pac-Man style) — ficou cringe.
- Agora: `physics.world.setBounds(0, -1e6, GAME_WIDTH, GAME_HEIGHT + 2e6)` + `playerBody.setCollideWorldBounds(true)`.
- Bounds verticais são propositalmente distantes: não interferem (player morre muito antes de tocá-los), só as laterais importam.

## 2026-05-16 — Phase 2: curva de dificuldade por altura

- `getLevelConfig(heightM)` deriva 3 parâmetros que escalam com a altura: `stepWidth`, `verticalGap`, `scrollSpeed`. Interpolação **contínua** (linear) entre nível 1 (heightM = 0) e máximo (heightM = 500).
- Curvas:
  - `stepWidth`: 96 → 50px
  - `verticalGap`: 110 → 125px (range pequeno por causa da física do pulo, não dá pra exigir gap maior que o pulo alcança)
  - `scrollSpeed`: 30 → 85 px/s (~2.8× mais rápido)
- Display de "nível" é discreto (1-10), incrementa a cada 50m de altura, capa em 10. O número serve só pra HUD e flash visual; a config interpola por trás suavemente.
- Steps já existentes não mudam — só os novos usam a config corrente.
- Flash "NÍVEL X" no centro da tela quando incrementa, com tween scale + alpha (Back.easeOut na entrada, fade-out na saída).
- HUD: `NÍVEL X` sutil em dourado abaixo do `ALTURA`.
- **Decisão de tuning:** preservei o nível 1 = setup original (96/110/30) porque o user acabou de aprovar o feel daquilo. Phase 2 só ESCALA a partir disso, não altera o estado inicial.
- **Trivia:** Icy Tower original anuncia volta na Steam pra 2026 (Win/Mac). Não muda estratégia — competimos em mercado diferente (web portal vs Steam core).

## 2026-05-16 — Trigger do auto-scroll: pouso real, não decolagem

- Antes: auto-scroll disparava quando `player.y < startY - 50` — ativava no ar durante o primeiro pulo, antes de pousar.
- Agora: dispara no **collider callback** quando o player encosta num step que **não é o `isFloor`** (chão inicial). Marca o chão com `setData('isFloor', true)` no `addPlatform()`.
- Mesmo trigger que liga o timer de tempo de corrida.
- Razão: feedback do user — pressão deve começar quando ele de fato pousou no primeiro degrau, não quando começou a pular.

## 2026-05-16 — Tracking de tempo + nova Phase 5 "Scoring & Hall of Fame"

- Adicionado tracking de tempo de corrida em `GameScene`: começa no mesmo trigger do auto-scroll (player subiu pelo primeiro step), para no game over.
- HUD ganhou `TEMPO: m:ss` no canto superior direito.
- `GameOverScene` recebe `{ score, timeMs }` e mostra os dois.
- **Roadmap reorganizado:**
  - Phase 1 — core feel (auto-scroll + permadeath + tracking de tempo) ← atual
  - Phase 2 — curva de dificuldade por nível
  - Phase 3 — pickups (double jump, super jump, shield, multiplier)
  - Phase 4 — combo system
  - **Phase 5 (NOVA) — Scoring & Hall of Fame:** fórmula composta de score (provável: `altura × 10 + tempo × 2 + bestCombo × 50 + pickups × 25` — calibrar), local leaderboard top-10 em localStorage, tela de Hall of Fame acessível do menu inicial / game over.
  - Phase 6 — vestido (era 5)
- Razão da nova phase: scoring justo precisa de combo e pickups travados pra fórmula ter peso real. Por isso vem **depois** delas, não antes.

## 2026-05-16 — Phase 1 tuning: auto-scroll começa após o 1º step

- Feedback do user após jogar: feel da Phase 1 ficou "perfeito", mas auto-scroll ativando desde o frame 1 dá pressão antes do jogo "começar de verdade".
- Trigger movido: `autoScrollActive` vira true só quando `player.y < startY - 50` (subiu pelo menos 1 step do chão inicial).
- Antes disso a câmera só segue o player (Doodle Jump-style). Depois, comportamento híbrido completo da Phase 1.
- `AUTO_SCROLL_SPEED = 30` mantido como baseline (vai escalar por nível na Phase 2).

## 2026-05-16 — Phase 1: auto-scroll híbrido + permadeath

**Decisões travadas hoje:**

- **Glossário:** `step` (plataforma), `nível` (segmento de altura, dispara mudança de dificuldade/visual), `combo` (saltos consecutivos sem tocar chão), `pickup` (item coletável).
- **Vidas:** permadeath. Sem múltiplas vidas. Razão: gênero (Icy Tower, Doodle Jump, Geometry Dash) é todo permadeath, casa com loop "só mais uma" e score-attack. Forgiveness vai vir via Shield pickup na Phase 3.
- **Roadmap travado:**
  - Phase 1 — core feel: auto-scroll híbrido, permadeath ← feito
  - Phase 2 — curva de dificuldade: níveis por altura com config (stepWidth, gap, scrollSpeed) interpolados
  - Phase 3 — pickups: double jump, super jump, shield, score multiplier
  - Phase 4 — combo system estilo Icy Tower (multiplicador + texto gigante)
  - Phase 5 — vestido (sprites, themes por nível, parallax, partículas, screen shake, som, música)

**Implementação Phase 1:**

- Câmera tem 2 fontes de movimento, sempre toma a mais "pra cima":
  1. `playerTarget = player.y - GAME_HEIGHT * 0.6` (segue player se ele subir rápido)
  2. `autoScrollTarget = scrollY - AUTO_SCROLL_SPEED * dt` (sobe constante)
- `cam.scrollY = min(cam.scrollY, playerTarget, autoScrollTarget)` — câmera nunca desce.
- `AUTO_SCROLL_SPEED = 30` px/s pra Phase 1. Vai escalar por nível na Phase 2.
- Game over: `player.y > cam.scrollY + GAME_HEIGHT + 30` — engolido por baixo, seja por queda ou por scroll.
- `dt` capado em 100ms pra evitar teleporte ao trocar de aba.

## 2026-05-15 — Bootstrap

- Criado dentro do monorepo `aduptive/arcade` (após pivot de Soberba — usuário descobriu que não joga Tetris).
- Stack escolhida: Phaser 3 + Arcade physics (vs. Matter do Soberba — platformer pede Arcade).
- Scaffold inicial: player retangular laranja, steps procedurais verdes, screen wrap horizontal, câmera só pra cima (Doodle Jump-style, sem auto-scroll), score por altura em metros.
- Imports compartilhados via `@shared/input/InputManager` (alias do tsconfig + vite).
- **Bug fix:** `START_Y = GAME_HEIGHT - 150` no top-level do módulo causava TDZ (import circular com `main.ts`). Movido pra dentro de `create()` como `this.startY`.
- Critério de escolha do gênero: usuário citou Icy Tower, Camy 2, Iron Blood, Leo's Fortune como referências afetivas — todos plataforma 2D. Vertical jumper venceu por: zero level design (procedural), 1 mecânica (pular), formato mobile-portrait (cobre 50% do tráfego de portal), gênero validado em receita (Doodle Jump fez dezenas de milhões de USD).
