import Phaser from 'phaser'
import type { InputManager } from './InputManager'

/**
 * Touch-only on-screen controls — trackpad-style swipe + release-to-jump.
 *
 * Model:
 *   - One finger anywhere on the screen acts like a trackpad. The horizontal
 *     finger velocity over the last ~100 ms is read as an analog axis
 *     (-1..1) and pushed to InputManager. So:
 *       finger still → axis 0 → player decelerates and stops
 *       slow swipe   → small axis → slow movement
 *       fast swipe   → axis near 1 → up to full max speed
 *   - Lifting the finger fires a one-frame 'up' pulse → jump.
 *   - A small SUP button in the bottom-right corner triggers the super jump.
 *     Touches that start in the SUP hit area don't drive direction and don't
 *     fire a jump on release.
 *
 * Multi-touch: only the first non-SUP pointer drives direction; extras are
 * ignored.
 *
 * Disables `InputManager`'s built-in swipe/tap detector to avoid double-fire
 * on the same pointer events.
 *
 * Auto-hides on non-touch devices.
 */

const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

/** Finger speed (px/s) that maps to a full ±1 axis. Tuned so a light thumb
 *  swipe saturates quickly — favors responsiveness over precision. */
const FULL_AXIS_FINGER_SPEED = 500
/** Rolling window over which finger velocity is measured. Shorter = more
 *  responsive to direction changes; longer = smoother. */
const VELOCITY_WINDOW_MS = 100
/** Below this absolute axis value, treat as zero — keeps tiny tremors from
 *  registering as movement. */
const AXIS_DEADZONE = 0.04

export interface MobileControlsOptions {
  /** Force-enable even on desktop (useful for debugging). */
  forceEnable?: boolean
}

interface Sample {
  x: number
  t: number
}

export class MobileControls {
  readonly enabled: boolean

  private scene: Phaser.Scene
  private inputMgr: InputManager
  private directionPointerId: number | null = null
  private samples: Sample[] = []
  private supPointerId: number | null = null
  private supCx = 0
  private supCy = 0
  private supHitRadius = 0

  constructor(
    scene: Phaser.Scene,
    inputMgr: InputManager,
    options: MobileControlsOptions = {}
  ) {
    this.scene = scene
    this.inputMgr = inputMgr
    this.enabled = options.forceEnable === true || IS_TOUCH_DEVICE
    if (!this.enabled) return

    // Take over touch entirely — the built-in gesture detector would
    // double-fire on the same pointer events.
    inputMgr.setTouchGesturesEnabled(false)

    const w = scene.scale.width
    const h = scene.scale.height
    const margin = 18
    const supR = 36

    this.supCx = w - margin - supR
    this.supCy = h - margin - supR
    // Padded hit radius so a thumb "near" the SUP still counts — and so the
    // direction reader knows what area to skip.
    this.supHitRadius = supR + 18

    this.makeSupButton(this.supCx, this.supCy, supR)
    this.installTouchHandlers()

    // Per-frame decay so axis falls toward 0 when the finger stops moving
    // even though no new pointermove events fire.
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this)
      inputMgr.clearVirtualAxisX()
    })
  }

  private makeSupButton(cx: number, cy: number, radius: number) {
    const fill = 0x7ad4ff
    const stroke = 0x3a7c9b
    const circle = this.scene.add.circle(cx, cy, radius, fill, 0.72)
    circle.setStrokeStyle(3, stroke, 0.92)
    circle.setScrollFactor(0)
    circle.setDepth(10_002)
    circle.setInteractive(
      new Phaser.Geom.Circle(radius, radius, this.supHitRadius),
      Phaser.Geom.Circle.Contains
    )

    const press = (p: Phaser.Input.Pointer) => {
      this.supPointerId = p.id
      circle.setFillStyle(fill, 0.95)
      this.inputMgr.setVirtualPressed('action', true)
    }
    const release = (p: Phaser.Input.Pointer) => {
      if (this.supPointerId !== p.id) return
      this.supPointerId = null
      circle.setFillStyle(fill, 0.72)
      this.inputMgr.setVirtualPressed('action', false)
    }

    circle.on('pointerdown', press)
    circle.on('pointerup', release)
    circle.on('pointerout', release)
    circle.on('pointerupoutside', release)

    const txt = this.scene.add.text(cx, cy, 'SUP', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    txt.setOrigin(0.5)
    txt.setScrollFactor(0)
    txt.setDepth(10_003)
    txt.setLetterSpacing(1)
  }

  private isInSupArea(p: Phaser.Input.Pointer): boolean {
    const dx = p.x - this.supCx
    const dy = p.y - this.supCy
    return dx * dx + dy * dy <= this.supHitRadius * this.supHitRadius
  }

  private installTouchHandlers() {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isInSupArea(p)) return
      if (this.directionPointerId !== null) return
      this.directionPointerId = p.id
      this.samples = [{ x: p.x, t: this.scene.time.now }]
      // Activate the virtual override immediately so keyboard/gamepad don't
      // also drive movement while a finger is on screen. Starts at 0 (no
      // motion yet); the first pointermove will set a real velocity.
      this.inputMgr.setVirtualAxisX(0)
    })

    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.directionPointerId !== p.id) return
      this.samples.push({ x: p.x, t: this.scene.time.now })
      this.recomputeAxis()
    })

    const release = (p: Phaser.Input.Pointer) => {
      if (this.directionPointerId !== p.id) return
      this.directionPointerId = null
      this.samples = []
      this.inputMgr.clearVirtualAxisX()
      // Pulse `up` for exactly one frame: assert it now, clear it on the
      // next POST_UPDATE — by which point InputManager.update() has already
      // observed the rising edge and produced a justPressed('up').
      this.inputMgr.setVirtualPressed('up', true)
      this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
        this.inputMgr.setVirtualPressed('up', false)
      })
    }
    this.scene.input.on('pointerup', release)
    this.scene.input.on('pointerupoutside', release)
  }

  /** Per-frame: drop stale samples and recompute axis. When the finger is
   *  held still, all samples eventually fall outside the window and the axis
   *  decays to 0. */
  private tick() {
    if (this.directionPointerId === null) return
    this.recomputeAxis()
  }

  private recomputeAxis() {
    const now = this.scene.time.now
    // Drop samples older than the window.
    while (this.samples.length > 0 && now - this.samples[0].t > VELOCITY_WINDOW_MS) {
      this.samples.shift()
    }
    if (this.samples.length < 2) {
      this.inputMgr.setVirtualAxisX(0)
      return
    }
    const oldest = this.samples[0]
    const newest = this.samples[this.samples.length - 1]
    const dt = (newest.t - oldest.t) / 1000
    if (dt <= 0) {
      this.inputMgr.setVirtualAxisX(0)
      return
    }
    const speed = (newest.x - oldest.x) / dt
    let axis = speed / FULL_AXIS_FINGER_SPEED
    if (axis > 1) axis = 1
    else if (axis < -1) axis = -1
    if (Math.abs(axis) < AXIS_DEADZONE) axis = 0
    this.inputMgr.setVirtualAxisX(axis)
  }
}
