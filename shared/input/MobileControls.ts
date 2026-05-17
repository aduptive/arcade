import Phaser from 'phaser'
import type { InputManager, GameAction } from './InputManager'

/**
 * Touch-only on-screen controls — Flappy Bird inspired.
 *
 * Model:
 *   - Touch and drag anywhere = direction. Left half of screen = move left,
 *     right half = move right. The direction tracks the finger live, so a
 *     swipe across the midpoint flips it.
 *   - Release the finger = jump (one-shot pulse on `up`).
 *   - A small SUP button in the bottom-right corner triggers the super jump
 *     on tap. Touches that start inside the SUP hit area do NOT count as a
 *     direction touch and do NOT fire a jump on release.
 *
 * Multi-touch: only the first non-SUP pointer drives direction. Extra fingers
 * are ignored to avoid the SUP tap also flipping direction.
 *
 * Disables `InputManager`'s built-in swipe/tap detector to prevent double
 * fire on the same pointer events.
 *
 * Auto-hides on non-touch devices.
 */

const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export interface MobileControlsOptions {
  /** Force-enable even on desktop (useful for debugging). */
  forceEnable?: boolean
}

export class MobileControls {
  readonly enabled: boolean

  private scene: Phaser.Scene
  private inputMgr: InputManager
  private directionPointerId: number | null = null
  private currentDirection: 'left' | 'right' | null = null
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
    // Pad the hit radius so a thumb landing "near" the SUP still counts —
    // and so direction-touch detection knows what area to exclude.
    this.supHitRadius = supR + 18

    this.makeSupButton(this.supCx, this.supCy, supR)
    this.installTouchHandlers()
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

  private setDirection(next: 'left' | 'right' | null) {
    if (this.currentDirection === next) return
    if (this.currentDirection) {
      this.inputMgr.setVirtualPressed(this.currentDirection, false)
    }
    this.currentDirection = next
    if (next) {
      this.inputMgr.setVirtualPressed(next, true)
    }
  }

  private installTouchHandlers() {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // SUP button has its own handler.
      if (this.isInSupArea(p)) return
      // Only one finger drives direction; extras are ignored.
      if (this.directionPointerId !== null) return
      this.directionPointerId = p.id
      this.updateDirectionFromPointer(p)
    })

    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.directionPointerId !== p.id) return
      this.updateDirectionFromPointer(p)
    })

    const release = (p: Phaser.Input.Pointer) => {
      if (this.directionPointerId !== p.id) return
      this.directionPointerId = null
      this.setDirection(null)
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

  private updateDirectionFromPointer(p: Phaser.Input.Pointer) {
    const mid = this.scene.scale.width / 2
    const next: GameAction = p.x < mid ? 'left' : 'right'
    this.setDirection(next)
  }
}
