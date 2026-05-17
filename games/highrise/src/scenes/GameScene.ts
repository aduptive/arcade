import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { InputManager } from '@shared/input/InputManager'
import { MobileControls } from '@shared/input/MobileControls'
import { SoundManager } from '@shared/audio/SoundManager'
import {
  createPickup,
  PICKUP_HOVER_OFFSET,
  PICKUP_SPAWN_CHANCE,
  randomPickupType,
  type PickupType,
} from '../game/Pickup'
import { DEFAULT_MAP_ID, getMapById, type MapTheme } from '../maps'
import {
  DEFAULT_CHARACTER_ID,
  getCharacterById,
  type CharacterGameObject,
  type CharacterSkin,
  type PlayerState,
} from '../characters'

const PLATFORM_HEIGHT = 16
/**
 * Visual size of the player on screen. Independent from the physics body so
 * we can make the character chunky and visible without changing the
 * difficulty of landing on small steps.
 */
const PLAYER_VISUAL_SIZE = 112
/**
 * Physics body dimensions, in world pixels. The body is the character's
 * "feet + torso" footprint: wide enough to read as the character's body but
 * still narrower than the smallest level-10 step (50 px wide).
 */
const PLAYER_BODY_WIDTH = 40
const PLAYER_BODY_HEIGHT = 60
/**
 * Distance between the body's bottom edge and the visual's bottom edge.
 * Compensates for the empty pixels at the bottom of the sprite frame so the
 * feet of the rendered character visually rest on top of the step.
 */
const PLAYER_BODY_FOOT_INSET = 6
const JUMP_VELOCITY = -780
const GROUND_MAX_SPEED = 320 // max horizontal speed on the ground (responsive)
/**
 * Holding a direction starts moving the player only after this deadband.
 * Below the threshold, the press only flips the character's facing (visual
 * mirror) — useful for adjusting orientation without sliding off a step.
 */
const GROUND_INPUT_DEADBAND_MS = 80
/** Ground acceleration toward GROUND_MAX_SPEED, applied after the deadband. */
const GROUND_ACCEL = 1800
/** Reversing direction on the ground feels snappier than starting from rest. */
const GROUND_DECEL_REVERSE = 3000
/** Aggressive friction on the ground when no input — so residual velocity decays fast. */
const GROUND_FRICTION = 4000
const AIR_MAX_SPEED = 320 // max horizontal speed in the air (matches ground so launch velocity carries)
// Icy-Tower-style air control: ground velocity is the real resource, air input
// only nudges. Players are rewarded for committing on the ground before takeoff.
//   - air acceleration in either direction is small (input only adjusts, not steers)
//   - reversing direction in the air takes deliberate, sustained input
//   - drag on no-input is gentle, so the launched velocity persists across the arc
const AIR_ACCEL_SAME = 1200 // px/s^2 — same direction as current motion or from rest
const AIR_ACCEL_REVERSE = 2500 // px/s^2 — input opposes current motion
const AIR_DRAG = 400 // px/s^2 — passive deceleration when no input in air
const DEATH_ZONE_PADDING = 30

/** Single source of truth for world gravity. Matches the Phaser config. */
const BASE_GRAVITY_Y = 1200

// Combo system (Phase 4): consecutive new-step-up landings without standing
// still too long on any step or landing on the same step twice.
const COMBO_STAND_BREAK_MS = 1500
const COMBO_POINTS_PER_STEP = 5 // base points awarded per combo level when it breaks

/**
 * Maximum horizontal gap, in pixels, between the right edge of the previous
 * step and the left edge of the next (or vice-versa). Keeps the procedural
 * spawn within the player's reachable jump distance. With current physics
 * (max ~400px horizontal jump), 180 leaves comfortable margin even at the
 * smallest step width (level 10).
 */
const MAX_HORIZONTAL_GAP_BETWEEN_STEPS = 180

// Super jump (Phase 3 — cooldown-based)
// Mechanic: same initial impulse as a normal jump, but for the next few
// seconds the player's effective gravity is reduced, producing a rocket-like
// sustained lift. Stacks with lunar/heavy gravity pickups via per-player
// gravity offsets instead of mutating world gravity.
const SUPER_JUMP_BOOST_DURATION_MS = 2000
const SUPER_JUMP_BOOST_GRAVITY_FACTOR = 0.2 // effective gravity multiplier while boosting
const SUPER_JUMP_CHARGE_INTERVAL_MS = 60_000 // 1 charge per minute
const SUPER_JUMP_MAX_CHARGES = 3

// Phase 2: curva de dificuldade. Tudo deriva da altura atual.
const HEIGHT_FOR_MAX_DIFFICULTY = 500 // m em que tudo está no máximo
const METERS_PER_LEVEL = 50 // de quanto em quanto incrementa o "nível" do HUD
const MAX_LEVEL = 10

interface LevelConfig {
  level: number
  stepWidth: number
  verticalGap: number
  scrollSpeed: number
}

function getLevelConfig(heightM: number): LevelConfig {
  const t = Math.min(1, Math.max(0, heightM / HEIGHT_FOR_MAX_DIFFICULTY))
  return {
    level: Math.min(MAX_LEVEL, Math.floor(heightM / METERS_PER_LEVEL) + 1),
    stepWidth: Math.round(96 - (96 - 50) * t),
    verticalGap: Math.round(110 + (125 - 110) * t),
    scrollSpeed: Math.round(30 + (85 - 30) * t),
  }
}

export class GameScene extends Phaser.Scene {
  private inputMgr!: InputManager
  private player!: CharacterGameObject
  private playerBody!: Phaser.Physics.Arcade.Body
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private highestPlatformY = 0
  private highestPlayerY = 0
  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  private startY = 0
  private autoScrollActive = false
  private runStartTime = 0 // ms — preenchido quando auto-scroll dispara
  private elapsedMs = 0
  private timeText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private currentLevel = 1
  private superText!: Phaser.GameObjects.Text
  private superJumpCharges = 0
  private chargeTimerMs = 0 // ms acumulados desde a última carga ganha (zera ao ganhar; congela em max)
  private hasShownSuperHint = false
  private wasSuperReady = false
  private superPulseTween: Phaser.Tweens.Tween | null = null
  private superBoostUntil = 0 // absolute time when the sustained super-jump boost ends
  private dropThroughUntil = 0 // absolute time when the platform drop-through window ends
  /** Time (`this.time.now`) when 'left' began being pressed, or 0 if not held. */
  private leftHeldSince = 0
  private rightHeldSince = 0
  /**
   * Dev affordance: meters added to the displayed/internal score so that
   * `getLevelConfig` returns level-N configuration from the first frame.
   * Set via the `startLevel` scene data (passed by MenuScene from a
   * `?level=N` URL parameter).
   */
  private scoreOffset = 0
  /** Stored so GameOver can preserve it across AGAIN. */
  private startLevel = 1
  // ---- Combo system ----
  private combo = 0
  private bestCombo = 0
  private lastLandedPlatform: Phaser.GameObjects.GameObject | null = null
  private comboStandStartMs = 0
  private comboText!: Phaser.GameObjects.Text
  /** Semantic audio dispatcher; shadowed name `audio` to avoid Phaser's `this.sound`. */
  private audio!: SoundManager
  private mapTheme!: MapTheme
  private characterSkin!: CharacterSkin
  /** Tracks the last-spawned step's center X and width so the next step can be constrained within reach. */
  private lastStepX = 0
  private lastStepWidth = 0
  private pointsText!: Phaser.GameObjects.Text
  private effectText!: Phaser.GameObjects.Text
  private points = 0
  private pickups!: Phaser.Physics.Arcade.StaticGroup
  private baseGravityY = 0
  private gravityEffect: { name: 'lunar' | 'heavy'; expiresAt: number } | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { mapId?: string; characterId?: string; startLevel?: number }) {
    this.mapTheme = getMapById(data?.mapId ?? DEFAULT_MAP_ID)
    this.characterSkin = getCharacterById(data?.characterId ?? DEFAULT_CHARACTER_ID)
    const requested = data?.startLevel
    if (requested && Number.isFinite(requested) && requested >= 2 && requested <= MAX_LEVEL) {
      this.startLevel = Math.floor(requested)
      this.scoreOffset = (this.startLevel - 1) * METERS_PER_LEVEL
    } else {
      this.startLevel = 1
      this.scoreOffset = 0
    }
    // Apply the map's background color to the camera so it shows behind any
    // gaps in the painted background.
    this.cameras.main?.setBackgroundColor(this.mapTheme.backgroundColor)
  }

  create() {
    this.cameras.main.setBackgroundColor(this.mapTheme.backgroundColor)
    this.startY = GAME_HEIGHT - 150
    this.autoScrollActive = false
    this.runStartTime = 0
    this.elapsedMs = 0
    this.score = this.scoreOffset
    this.currentLevel = getLevelConfig(this.scoreOffset).level
    this.superJumpCharges = 0
    this.chargeTimerMs = 0
    this.points = 0
    this.gravityEffect = null
    this.superBoostUntil = 0
    this.dropThroughUntil = 0
    this.leftHeldSince = 0
    this.rightHeldSince = 0
    this.combo = 0
    this.bestCombo = 0
    this.lastLandedPlatform = null
    this.comboStandStartMs = 0
    this.hasShownSuperHint = false
    this.wasSuperReady = false
    this.superPulseTween?.stop()
    this.superPulseTween = null
    this.inputMgr = new InputManager(this)
    this.audio = new SoundManager(this)
    this.cameras.main.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 1000000)
    this.physics.world.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 2000000)
    // Always force the world gravity to the known baseline on scene create.
    // We do NOT read whatever happens to be on the world right now, because
    // a previous run's leftover lunar/heavy effect (or any other future
    // gravity-modifying state) could otherwise become the new "base".
    this.baseGravityY = BASE_GRAVITY_Y
    this.physics.world.gravity.y = BASE_GRAVITY_Y

    this.mapTheme.paintBackground({ scene: this, width: GAME_WIDTH, height: GAME_HEIGHT })
    this.mapTheme.paintStructure?.({ scene: this, width: GAME_WIDTH, height: GAME_HEIGHT })
    this.platforms = this.physics.add.staticGroup()
    this.pickups = this.physics.add.staticGroup()
    this.spawnInitialPlatforms()
    this.createPlayer()
    this.drawHUD()

    this.physics.add.overlap(this.player, this.pickups, (_player, pickup) => {
      this.collectPickup(pickup as Phaser.GameObjects.Rectangle)
    })

    // On-screen hold zones for mobile movement. Auto-no-ops on desktop. The
    // bottom 35% of the screen becomes left/right hold zones, while taps and
    // swipes in the upper area keep firing jump / super-jump as before.
    new MobileControls(this, this.inputMgr)

    // ESC opens the pause overlay (PauseScene runs on top while GameScene is
    // paused). From the pause overlay the player can resume or jump to menu.
    // Mobile users get the same flow via the HUD pause button.
    this.input.keyboard?.on('keydown-ESC', () => this.openPause())

    // When the scene comes back from pause, drop the grayscale post-FX so
    // gameplay resumes with full color.
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.cameras.main.postFX?.clear()
    })
  }

  private spawnInitialPlatforms() {
    // Use the score offset so level-N dev runs spawn level-N step config from
    // the first platform.
    const cfg = getLevelConfig(this.scoreOffset)
    this.addPlatform(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH, true) // initial floor — never carries a pickup
    for (let y = GAME_HEIGHT - 180; y > -2000; y -= cfg.verticalGap) {
      const x = this.pickReachableStepX(cfg.stepWidth)
      this.addPlatform(x, y, cfg.stepWidth)
      this.maybeSpawnPickupAbove(x, y)
      this.highestPlatformY = y
    }
  }

  private maybeSpawnPickupAbove(x: number, y: number) {
    if (Math.random() > PICKUP_SPAWN_CHANCE) return
    const type = randomPickupType()
    const themeOverride = this.mapTheme.pickupTheme?.[type]
    const pickup = createPickup(this, x, y - PICKUP_HOVER_OFFSET, type, themeOverride)
    this.pickups.add(pickup)
  }

  private addPlatform(x: number, y: number, width = 96, isFloor = false) {
    const plat = this.mapTheme.paintStep({
      scene: this,
      x,
      y,
      width,
      height: PLATFORM_HEIGHT,
      isFloor,
    })
    if (isFloor) plat.setData('isFloor', true)
    this.platforms.add(plat)
    const body = (plat as any).body as Phaser.Physics.Arcade.StaticBody
    body.setSize(width, PLATFORM_HEIGHT)
    body.updateFromGameObject()
    // Remember this step so the next spawn can stay within reach.
    this.lastStepX = x
    this.lastStepWidth = width
    return plat
  }

  /**
   * Picks a horizontal position for a new step that is guaranteed to be within
   * the player's jump reach from the previous step, while still respecting the
   * wall constraints of the play area.
   */
  private pickReachableStepX(newStepWidth: number): number {
    const halfW = newStepWidth / 2
    const wallMinX = halfW + 10
    const wallMaxX = GAME_WIDTH - halfW - 10
    const prevHalfW = this.lastStepWidth / 2
    const reach = prevHalfW + halfW + MAX_HORIZONTAL_GAP_BETWEEN_STEPS
    const minX = Math.max(wallMinX, this.lastStepX - reach)
    const maxX = Math.min(wallMaxX, this.lastStepX + reach)
    if (maxX <= minX) return Phaser.Math.Clamp(this.lastStepX, wallMinX, wallMaxX)
    return Phaser.Math.Between(minX, maxX)
  }

  private createPlayer() {
    this.player = this.characterSkin.paintCharacter({
      scene: this,
      x: GAME_WIDTH / 2,
      y: this.startY,
      size: PLAYER_VISUAL_SIZE,
    })
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    // Body is positioned at the BOTTOM-CENTER of the visual (where the feet
    // are), not the visual's geometric center. This way the character looks
    // like it's standing on top of the step, instead of sinking knee-deep
    // into it.
    //
    // Arcade body's setSize/setOffset use the GameObject's INTRINSIC width
    // and height — for sprites that's the texture frame (48x48 here) before
    // scale; for placeholder rectangles that's the rect's authored size.
    // We compute the body size and offset in the GameObject's local space
    // so the math works for both.
    const playerScaleX = (this.player as { scaleX?: number }).scaleX ?? 1
    const playerScaleY = (this.player as { scaleY?: number }).scaleY ?? 1
    const localW = this.player.width ?? PLAYER_VISUAL_SIZE
    const localH = this.player.height ?? PLAYER_VISUAL_SIZE
    const bodyLocalW = PLAYER_BODY_WIDTH / playerScaleX
    const bodyLocalH = PLAYER_BODY_HEIGHT / playerScaleY
    const footInsetLocal = PLAYER_BODY_FOOT_INSET / playerScaleY
    this.playerBody.setSize(bodyLocalW, bodyLocalH)
    this.playerBody.setOffset(
      (localW - bodyLocalW) / 2,
      localH - bodyLocalH - footInsetLocal
    )
    this.playerBody.setCollideWorldBounds(true) // colide com paredes laterais
    this.highestPlayerY = this.player.y

    // Platforms are one-way: only collide when the player is falling.
    // During a drop-through window, collisions are also suppressed so the
    // player can pass through the step they're standing on to reach a pickup
    // below. On the first landing on a non-floor step, trigger auto-scroll.
    this.physics.add.collider(
      this.player,
      this.platforms,
      (_p, platform) => {
        const obj = platform as Phaser.GameObjects.GameObject
        // Auto-scroll trigger on first non-floor landing.
        if (!this.autoScrollActive && !obj.getData('isFloor')) {
          this.autoScrollActive = true
          this.runStartTime = this.time.now
        }
        this.onPlatformLanded(obj)
      },
      () => {
        if (this.time.now < this.dropThroughUntil) return false
        return this.playerBody.velocity.y > 0
      }
    )
  }

  private drawHUD() {
    this.scoreText = this.add.text(20, 20, 'HEIGHT: 0m', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    this.scoreText.setScrollFactor(0)
    this.scoreText.setShadow(2, 2, '#000', 0, true, true)

    this.pointsText = this.add.text(20, 48, 'POINTS: 0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffd700',
    })
    this.pointsText.setScrollFactor(0)
    this.pointsText.setShadow(1, 1, '#000', 0, true, true)

    this.levelText = this.add.text(20, 70, 'LEVEL 1', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#c9a96b',
    })
    this.levelText.setScrollFactor(0)
    this.levelText.setShadow(1, 1, '#000', 0, true, true)

    this.superText = this.add.text(20, 90, 'SUPER: x0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#7ad4ff',
    })
    this.superText.setScrollFactor(0)
    this.superText.setShadow(1, 1, '#000', 0, true, true)

    this.effectText = this.add.text(20, 110, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#a07acc',
      fontStyle: 'bold',
    })
    this.effectText.setScrollFactor(0)
    this.effectText.setShadow(1, 1, '#000', 0, true, true)

    this.timeText = this.add.text(GAME_WIDTH - 20, 20, 'TIME: 0:00', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    this.timeText.setOrigin(1, 0)
    this.timeText.setScrollFactor(0)
    this.timeText.setShadow(2, 2, '#000', 0, true, true)

    this.comboText = this.add.text(GAME_WIDTH / 2, 24, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffd93d',
      fontStyle: 'bold',
    })
    this.comboText.setOrigin(0.5, 0)
    this.comboText.setScrollFactor(0)
    this.comboText.setShadow(2, 2, '#000', 0, true, true)
    this.comboText.setLetterSpacing(2)

    // Pause button (top-right corner, below the time). Visible on every device;
    // mobile users especially need this since they don't have an ESC key.
    const pauseCx = GAME_WIDTH - 28
    const pauseCy = 62
    const pauseBg = this.add.circle(pauseCx, pauseCy, 18, 0x222222, 0.75)
    pauseBg.setStrokeStyle(2, 0xaaaaaa, 0.9)
    pauseBg.setScrollFactor(0).setDepth(10_002).setInteractive({ useHandCursor: true })
    pauseBg.on('pointerdown', () => this.openPause())
    pauseBg.on('pointerover', () => pauseBg.setFillStyle(0x444444, 0.85))
    pauseBg.on('pointerout', () => pauseBg.setFillStyle(0x222222, 0.75))
    const pauseGlyph = this.add.text(pauseCx, pauseCy, 'II', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    pauseGlyph.setOrigin(0.5)
    pauseGlyph.setScrollFactor(0).setDepth(10_003)
  }

  private openPause() {
    if (this.scene.isPaused()) return
    // Desaturate the underlying frame so the paused snapshot reads as a
    // black-and-white freeze behind the overlay. PostFX is cleared on resume.
    this.cameras.main.postFX?.addColorMatrix().grayscale()
    this.scene.pause()
    this.scene.launch('PauseScene', {
      mapId: this.mapTheme.id,
      characterId: this.characterSkin.id,
      score: Math.max(0, this.score),
      points: this.points,
      timeMs: this.elapsedMs,
      level: this.currentLevel,
      superCharges: this.superJumpCharges,
      bestCombo: this.bestCombo,
    })
  }

  // ---- Pickups ----

  private collectPickup(rect: Phaser.GameObjects.Rectangle) {
    const type = rect.getData('pickupType') as PickupType | undefined
    if (!type) return
    // Stop further overlaps and animate out
    const body = rect.body as Phaser.Physics.Arcade.StaticBody | null
    if (body) body.enable = false
    this.applyPickup(type)
    this.tweens.add({
      targets: rect,
      scale: 1.6,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => rect.destroy(),
    })
  }

  private applyPickup(type: PickupType) {
    switch (type) {
      case 'coin':
        this.addPoints(50)
        this.flashNotification('+50', '#ffd700')
        this.audio.play('pickup_coin')
        break
      case 'super':
        if (this.gainSuperCharge()) {
          this.flashNotification('+1 SUPER', '#7ad4ff')
        } else {
          this.flashNotification('SUPER FULL', '#7ad4ff')
        }
        this.audio.play('pickup_super')
        break
      case 'lunar':
        this.setGravityEffect('lunar', 0.5, 10000)
        this.flashNotification('LUNAR', '#a07acc')
        this.audio.play('pickup_lunar')
        break
      case 'mystery':
        this.applyMystery()
        this.audio.play('pickup_mystery')
        break
    }
  }

  private applyMystery() {
    // Weighted bag: 3 good, 3 neutral-ish, 2 bad
    const outcomes: Array<'super' | 'lunar' | 'big' | 'small' | 'nothing' | 'heavy' | 'lose_super'> = [
      'super',
      'lunar',
      'big',
      'small',
      'small',
      'nothing',
      'heavy',
      'lose_super',
    ]
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)]
    switch (pick) {
      case 'super':
        this.gainSuperCharge()
        this.flashNotification('? +1 SUPER', '#7ad4ff')
        break
      case 'lunar':
        this.setGravityEffect('lunar', 0.5, 10000)
        this.flashNotification('? LUNAR', '#a07acc')
        break
      case 'big':
        this.addPoints(200)
        this.flashNotification('? +200 PTS', '#ffd700')
        break
      case 'small':
        this.addPoints(50)
        this.flashNotification('? +50 PTS', '#ffd700')
        break
      case 'nothing':
        this.flashNotification('? NOTHING', '#aaaaaa')
        break
      case 'heavy':
        this.setGravityEffect('heavy', 1.7, 5000)
        this.flashNotification('? HEAVY!', '#c4503a')
        break
      case 'lose_super':
        if (this.superJumpCharges > 0) {
          this.superJumpCharges--
          this.flashNotification('? -1 SUPER', '#c4503a')
        } else {
          this.flashNotification('? ESCAPED', '#aaaaaa')
        }
        break
    }
  }

  private addPoints(n: number) {
    this.points += n
    this.pointsText.setText(`POINTS: ${this.points}`)
  }

  private gainSuperCharge(): boolean {
    if (this.superJumpCharges >= SUPER_JUMP_MAX_CHARGES) return false
    this.superJumpCharges++
    this.flashSuperGain()
    return true
  }

  private setGravityEffect(name: 'lunar' | 'heavy', multiplier: number, durationMs: number) {
    this.gravityEffect = { name, expiresAt: this.time.now + durationMs }
    this.physics.world.gravity.y = this.baseGravityY * multiplier
  }

  private tickGravityEffect() {
    if (!this.gravityEffect) {
      this.effectText.setText('')
      return
    }
    if (this.time.now >= this.gravityEffect.expiresAt) {
      this.physics.world.gravity.y = this.baseGravityY
      this.gravityEffect = null
      this.effectText.setText('')
      return
    }
    const remaining = Math.ceil((this.gravityEffect.expiresAt - this.time.now) / 1000)
    const label = this.gravityEffect.name === 'lunar' ? 'LUNAR' : 'HEAVY'
    const color = this.gravityEffect.name === 'lunar' ? '#a07acc' : '#c4503a'
    this.effectText.setColor(color)
    this.effectText.setText(`${label} ${remaining}s`)
  }

  private cleanupOffscreenPickups(scrollY: number) {
    const cutoff = scrollY + GAME_HEIGHT + 50
    this.pickups.children.iterate((child) => {
      const p = child as Phaser.GameObjects.Rectangle | null
      if (p && p.y > cutoff) p.destroy()
      return true
    })
  }

  private flashNotification(text: string, color: string) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color,
      fontStyle: 'bold',
    })
    t.setOrigin(0.5)
    t.setScrollFactor(0)
    t.setShadow(2, 2, '#000', 0, true, true)
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: '-=24',
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    })
  }

  private updateSuperHUD() {
    if (this.superJumpCharges >= SUPER_JUMP_MAX_CHARGES) {
      this.superText.setText(`SUPER: x${this.superJumpCharges} (MAX)`)
    } else {
      const remainingMs = SUPER_JUMP_CHARGE_INTERVAL_MS - this.chargeTimerMs
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
      this.superText.setText(`SUPER: x${this.superJumpCharges} (${remainingSec}s)`)
    }

    // Gentle scale pulse on the HUD while at least one charge is available,
    // so the eye notices it. Start/stop on transitions, not every frame.
    const isReady = this.superJumpCharges > 0
    if (isReady && !this.wasSuperReady) {
      this.superText.setScale(1)
      this.superPulseTween?.stop()
      this.superPulseTween = this.tweens.add({
        targets: this.superText,
        scale: { from: 1, to: 1.12 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    } else if (!isReady && this.wasSuperReady) {
      this.superPulseTween?.stop()
      this.superPulseTween = null
      this.superText.setScale(1)
    }
    this.wasSuperReady = isReady
  }

  private flashSuperGain() {
    // Short scale pop on the HUD itself…
    this.tweens.add({
      targets: this.superText,
      scale: { from: 1.6, to: 1 },
      duration: 350,
      ease: 'Back.easeOut',
    })

    // …and on the FIRST charge of this run, a much bigger center-screen
    // notification + control hint so the player can't miss that they have
    // a new ability available.
    if (!this.hasShownSuperHint && this.superJumpCharges === 1) {
      this.hasShownSuperHint = true
      this.showSuperReadyHint()
    } else {
      this.flashNotification('+1 SUPER', '#7ad4ff')
    }
  }

  private showSuperReadyHint() {
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'SUPER JUMP READY!', {
      fontFamily: 'Courier New, monospace',
      fontSize: '34px',
      color: '#7ad4ff',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setScrollFactor(0)
    title.setShadow(2, 2, '#000', 4, true, true)
    title.setLetterSpacing(3)
    title.setDepth(10_000)

    const subtitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 8,
      'press SPACE   /   gamepad B   /   tap SUP',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#dddddd',
      }
    )
    subtitle.setOrigin(0.5)
    subtitle.setScrollFactor(0)
    subtitle.setDepth(10_000)
    subtitle.setLetterSpacing(2)

    this.tweens.add({
      targets: [title, subtitle],
      alpha: { from: 1, to: 0 },
      y: '-=20',
      duration: 800,
      delay: 1900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        title.destroy()
        subtitle.destroy()
      },
    })
  }

  // ---- Combo system ----

  private onPlatformLanded(platform: Phaser.GameObjects.GameObject) {
    // Same platform we were just on: no combo change.
    if (platform === this.lastLandedPlatform) {
      this.comboStandStartMs = this.time.now
      return
    }
    const platformY = (platform as unknown as { y: number }).y
    const lastY = this.lastLandedPlatform
      ? (this.lastLandedPlatform as unknown as { y: number }).y
      : Number.POSITIVE_INFINITY
    if (platformY < lastY) {
      // New step UPWARD: combo grows.
      this.combo += 1
      if (this.combo > this.bestCombo) this.bestCombo = this.combo
      if (this.combo >= 2) {
        this.flashComboGain()
        this.audio.play('combo_inc')
      }
    } else {
      // New step but at the same height or lower: combo break + bonus payout.
      this.breakCombo()
      this.combo = 1
    }
    this.lastLandedPlatform = platform
    this.comboStandStartMs = this.time.now
    this.audio.play('land')
    this.updateComboHUD()
  }

  private breakCombo() {
    if (this.combo > 1) {
      const bonus = this.combo * COMBO_POINTS_PER_STEP
      this.addPoints(bonus)
      this.flashNotification(`COMBO +${bonus}`, '#ffd93d')
      this.audio.play('combo_break')
    }
    this.combo = 0
    this.lastLandedPlatform = null
    this.updateComboHUD()
  }

  private updateComboHUD() {
    if (this.combo >= 2) {
      this.comboText.setText(`COMBO x${this.combo}`)
    } else {
      this.comboText.setText('')
    }
  }

  private flashComboGain() {
    const color = this.combo >= 10 ? '#ff3030' : this.combo >= 5 ? '#ff9a3c' : '#ffd93d'
    const label = this.combo >= 10 ? `x${this.combo} INSANE!` : `x${this.combo}!`
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: this.combo >= 10 ? '40px' : '30px',
      color,
      fontStyle: 'bold',
    })
    t.setOrigin(0.5)
    t.setScrollFactor(0)
    t.setShadow(2, 2, '#000', 0, true, true)
    this.tweens.add({
      targets: t,
      alpha: 0,
      scale: 1.4,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    })
  }

  private updatePlayerAnimation() {
    if (!this.characterSkin.updateAnimation) return // placeholder rectangles opt out
    const onGround = this.playerBody.blocked.down
    const vx = this.playerBody.velocity.x
    const vy = this.playerBody.velocity.y
    const movingHoriz = Math.abs(vx) > 20
    const inBoost = this.time.now < this.superBoostUntil

    let state: PlayerState
    if (inBoost) {
      state = 'climb' // sustained-lift super jump reads beautifully as a climb animation
    } else if (!onGround) {
      state = vy < 0 ? 'jump' : 'fall'
    } else if (movingHoriz) {
      state = 'walk'
    } else {
      state = 'idle'
    }

    // Facing flips immediately on input so a quick tap can re-orient the
    // sprite even when the ground deadband has suppressed actual movement.
    // Fall back to velocity for momentum reads when no input is held.
    let facing: -1 | 0 | 1 = 0
    if (this.inputMgr.isPressed('left')) facing = -1
    else if (this.inputMgr.isPressed('right')) facing = 1
    else if (vx < -10) facing = -1
    else if (vx > 10) facing = 1

    this.characterSkin.updateAnimation({ gameObject: this.player, state, facing })
  }

  private flashSuperUsed() {
    // Pulse the player for visual reading of the super-jump trigger.
    this.tweens.add({
      targets: this.player,
      scaleX: { from: 1.4, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: 300,
      ease: 'Cubic.easeOut',
    })

    // Color shift: for Rectangle placeholders we hit `setFillStyle`. For
    // Sprite/Image we tint directly. For our sprite-via-Container characters
    // the tint target is the inner Sprite stored under data key 'innerSprite'.
    const playerAny = this.player as unknown as {
      fillColor?: number
      setFillStyle?: (color: number) => void
      setTint?: (color: number) => void
      clearTint?: () => void
      getData?: (key: string) => unknown
    }

    if (typeof playerAny.setFillStyle === 'function' && typeof playerAny.fillColor === 'number') {
      const originalFill = playerAny.fillColor
      playerAny.setFillStyle(0x7ad4ff)
      this.time.delayedCall(180, () => playerAny.setFillStyle?.(originalFill))
      return
    }

    const inner = playerAny.getData?.('innerSprite') as
      | { setTint?: (c: number) => void; clearTint?: () => void }
      | undefined
    const tintTarget = inner ?? playerAny
    if (typeof tintTarget.setTint === 'function') {
      tintTarget.setTint(0x7ad4ff)
      this.time.delayedCall(180, () => tintTarget.clearTint?.())
    }
  }

  private flashLevelUp(level: number) {
    const flash = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `LEVEL ${level}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#ff6b35',
      fontStyle: 'bold',
    })
    flash.setOrigin(0.5)
    flash.setScrollFactor(0)
    flash.setShadow(3, 3, '#000', 0, true, true)
    flash.setAlpha(0)
    flash.setScale(0.5)

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1.2 },
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 1.4,
          duration: 600,
          delay: 400,
          onComplete: () => flash.destroy(),
        })
      },
    })
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  update(_t: number, dt: number) {
    this.inputMgr.update()

    // Track how long each direction has been held — used by the ground
    // deadband to distinguish "I'm just turning around" from "I want to move".
    const now = this.time.now
    const wantsLeftRaw = this.inputMgr.isPressed('left')
    const wantsRightRaw = this.inputMgr.isPressed('right')
    if (wantsLeftRaw) {
      if (this.leftHeldSince === 0) this.leftHeldSince = now
    } else {
      this.leftHeldSince = 0
    }
    if (wantsRightRaw) {
      if (this.rightHeldSince === 0) this.rightHeldSince = now
    } else {
      this.rightHeldSince = 0
    }

    // Horizontal movement:
    //   - On ground: acceleration-based, gated by a deadband so brief taps
    //     only flip facing (handled in updatePlayerAnimation) without
    //     actually moving the body. Holding past the deadband ramps up to
    //     GROUND_MAX_SPEED. Friction returns the player to rest fast.
    //   - In air: preserves momentum; input only accelerates, never replaces
    //     velocity. Releasing the key in mid-air keeps the launched motion.
    const onGround = this.playerBody.blocked.down
    const dtSec = Math.min(dt, 100) / 1000
    if (onGround) {
      const leftHeldLong =
        wantsLeftRaw && now - this.leftHeldSince >= GROUND_INPUT_DEADBAND_MS
      const rightHeldLong =
        wantsRightRaw && now - this.rightHeldSince >= GROUND_INPUT_DEADBAND_MS
      let vx = this.playerBody.velocity.x
      if (leftHeldLong) {
        const accel = vx > 0 ? GROUND_DECEL_REVERSE : GROUND_ACCEL
        vx -= accel * dtSec
      } else if (rightHeldLong) {
        const accel = vx < 0 ? GROUND_DECEL_REVERSE : GROUND_ACCEL
        vx += accel * dtSec
      } else {
        const friction = GROUND_FRICTION * dtSec
        if (Math.abs(vx) <= friction) vx = 0
        else vx -= Math.sign(vx) * friction
      }
      vx = Math.max(-GROUND_MAX_SPEED, Math.min(GROUND_MAX_SPEED, vx))
      this.playerBody.setVelocityX(vx)
    } else {
      let vx = this.playerBody.velocity.x
      const wantsLeft = this.inputMgr.isPressed('left')
      const wantsRight = this.inputMgr.isPressed('right')
      if (wantsLeft) {
        const accel = vx > 0 ? AIR_ACCEL_REVERSE : AIR_ACCEL_SAME
        vx -= accel * dtSec
      } else if (wantsRight) {
        const accel = vx < 0 ? AIR_ACCEL_REVERSE : AIR_ACCEL_SAME
        vx += accel * dtSec
      } else {
        // No input: drag decays residual velocity so brief taps do not drift forever.
        const drag = AIR_DRAG * dtSec
        if (Math.abs(vx) <= drag) vx = 0
        else vx -= Math.sign(vx) * drag
      }
      vx = Math.max(-AIR_MAX_SPEED, Math.min(AIR_MAX_SPEED, vx))
      this.playerBody.setVelocityX(vx)
    }

    // Jump (only when grounded):
    //   - `up` = normal jump
    //   - `action` = super jump: same initial impulse as a normal jump but
    //     starts a sustained boost window; while it's active the player's
    //     effective gravity is reduced, producing a rocket-like ascent.
    //   - `down` = drop through the current step for a short window, used to
    //     reach pickups sitting below the player's level.
    if (this.playerBody.blocked.down) {
      if (this.inputMgr.justPressed('action') && this.superJumpCharges > 0) {
        this.playerBody.setVelocityY(JUMP_VELOCITY)
        this.superBoostUntil = this.time.now + SUPER_JUMP_BOOST_DURATION_MS
        this.superJumpCharges--
        this.flashSuperUsed()
        this.audio.play('super_jump')
      } else if (this.inputMgr.justPressed('up')) {
        this.playerBody.setVelocityY(JUMP_VELOCITY)
        this.audio.play('jump')
      } else if (this.inputMgr.justPressed('down')) {
        this.dropThroughUntil = this.time.now + 250
        this.playerBody.setVelocityY(60) // small nudge so the player clears the step
      }
    }

    // Apply / clear per-player gravity offset for the sustained super-jump boost.
    // Uses Phaser's per-body gravity, which adds to world gravity, so we set
    // it to (worldG * factor) - worldG = worldG * (factor - 1).
    const inSuperBoost = this.time.now < this.superBoostUntil
    if (inSuperBoost) {
      // End early if the player landed mid-boost (intentional cancel).
      if (this.playerBody.blocked.down) {
        this.superBoostUntil = 0
        this.playerBody.setGravityY(0)
      } else {
        const worldG = this.physics.world.gravity.y
        this.playerBody.setGravityY(worldG * (SUPER_JUMP_BOOST_GRAVITY_FACTOR - 1))
      }
    } else if (this.playerBody.gravity.y !== 0) {
      this.playerBody.setGravityY(0)
    }

    // (sem screen-wrap — o player colide nas paredes laterais via world bounds)

    // Trigger do auto-scroll vem do collider (primeiro pouso em step não-floor).
    if (this.runStartTime > 0) {
      this.elapsedMs = this.time.now - this.runStartTime
      this.timeText.setText(`TIME: ${this.formatTime(this.elapsedMs)}`)
    }

    // Cargas de super pulo: ticka só quando a corrida começou.
    if (this.autoScrollActive) {
      if (this.superJumpCharges < SUPER_JUMP_MAX_CHARGES) {
        this.chargeTimerMs += Math.min(dt, 100)
        if (this.chargeTimerMs >= SUPER_JUMP_CHARGE_INTERVAL_MS) {
          this.superJumpCharges++
          this.chargeTimerMs = 0
          this.flashSuperGain()
        }
      } else {
        this.chargeTimerMs = 0
      }
    }
    this.updateSuperHUD()

    // Config corrente derivada da altura
    const cfg = getLevelConfig(Math.max(0, this.score))

    // Detecta troca de nível (display) → flash
    if (cfg.level !== this.currentLevel) {
      this.currentLevel = cfg.level
      this.levelText.setText(`LEVEL ${this.currentLevel}`)
      this.flashLevelUp(this.currentLevel)
      this.audio.play('level_up')
    }

    // ---- Câmera: auto-scroll híbrido ----
    // (1) sempre sobe num ritmo mínimo (pressão do nível) — após o primeiro step
    // (2) também segue o player pra cima se ele estiver subindo mais rápido
    // Câmera nunca desce.
    const cam = this.cameras.main
    const playerTarget = this.player.y - GAME_HEIGHT * 0.6
    if (this.autoScrollActive) {
      const autoScrollTarget = cam.scrollY - cfg.scrollSpeed * dtSec
      cam.scrollY = Math.min(cam.scrollY, playerTarget, autoScrollTarget)
    } else {
      cam.scrollY = Math.min(cam.scrollY, playerTarget)
    }

    // score = quão alto chegou
    if (this.player.y < this.highestPlayerY) {
      this.highestPlayerY = this.player.y
      this.score = Math.floor((this.startY - this.highestPlayerY) / 32) + this.scoreOffset
      this.scoreText.setText(`HEIGHT: ${Math.max(0, this.score)}m`)
    }

    // spawnar mais steps acima conforme sobe — usa config corrente
    while (this.highestPlatformY > cam.scrollY - 200) {
      this.highestPlatformY -= cfg.verticalGap
      const x = this.pickReachableStepX(cfg.stepWidth)
      this.addPlatform(x, this.highestPlatformY, cfg.stepWidth)
      this.maybeSpawnPickupAbove(x, this.highestPlatformY)
    }

    // Pickups e efeitos: limpa o que saiu da tela e expira efeitos com timer
    this.cleanupOffscreenPickups(cam.scrollY)
    this.tickGravityEffect()

    // Combo break: standing on a step too long ends the chain (and pays out).
    if (this.combo >= 2 && this.playerBody.blocked.down) {
      if (this.time.now - this.comboStandStartMs > COMBO_STAND_BREAK_MS) {
        this.breakCombo()
      }
    }

    // Drive the character's animation based on the current player state.
    this.updatePlayerAnimation()

    // ---- Game over ----
    // Player caiu fora da tela OU foi engolido pelo auto-scroll por baixo.
    if (this.player.y > cam.scrollY + GAME_HEIGHT + DEATH_ZONE_PADDING) {
      // Settle a pending combo into bonus points so it's not silently lost.
      this.breakCombo()
      this.audio.play('death')
      // Restore gravity before leaving the scene so the next run starts clean.
      this.physics.world.gravity.y = this.baseGravityY
      this.scene.start('GameOverScene', {
        score: Math.max(0, this.score),
        timeMs: this.elapsedMs,
        points: this.points,
        bestCombo: this.bestCombo,
        level: this.currentLevel,
        mapId: this.mapTheme.id,
        characterId: this.characterSkin.id,
        startLevel: this.startLevel > 1 ? this.startLevel : undefined,
      })
    }
  }
}
