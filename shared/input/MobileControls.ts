import Phaser from 'phaser'
import type { InputManager } from './InputManager'

/**
 * Touch-only on-screen movement controls for vertical platformers.
 *
 * Adds two bottom zones (left half and right half of the lower ~35% of the
 * screen) that the player can hold to move continuously. Above that strip,
 * the scene's existing tap/swipe detector keeps working (tap = jump, swipe
 * down = action), so jumping and super-jumping behave the same.
 *
 * Drives state via `InputManager.setVirtualPressed(action, true/false)` and
 * tells the InputManager to ignore swipe/tap detection inside the bottom
 * strip so a hold-then-release on a zone doesn't also fire a global jump.
 *
 * Auto-hides on non-touch devices.
 */

const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export interface MobileControlsOptions {
  /** Fraction of the scene's height occupied by the bottom hold zone. */
  bottomFraction?: number
  /** Force-enable even on desktop (useful for debugging). */
  forceEnable?: boolean
  /** Render the dim ◀ / ▶ hints. Set false for a fully invisible overlay. */
  showHints?: boolean
}

export class MobileControls {
  readonly enabled: boolean

  constructor(
    private scene: Phaser.Scene,
    private inputMgr: InputManager,
    options: MobileControlsOptions = {}
  ) {
    this.enabled = options.forceEnable === true || IS_TOUCH_DEVICE
    if (!this.enabled) return

    const bottomFraction = options.bottomFraction ?? 0.35
    const showHints = options.showHints ?? true

    const w = scene.scale.width
    const h = scene.scale.height
    const zoneTop = h * (1 - bottomFraction)
    const zoneHeight = h * bottomFraction
    const halfW = w / 2

    inputMgr.setTouchIgnoreBelowY(zoneTop)

    const leftZone = scene.add.zone(0, zoneTop, halfW, zoneHeight).setOrigin(0, 0)
    leftZone.setScrollFactor(0)
    leftZone.setDepth(10_000)
    leftZone.setInteractive()
    leftZone.on('pointerdown', () => inputMgr.setVirtualPressed('left', true))
    leftZone.on('pointerup', () => inputMgr.setVirtualPressed('left', false))
    leftZone.on('pointerout', () => inputMgr.setVirtualPressed('left', false))
    leftZone.on('pointerupoutside', () => inputMgr.setVirtualPressed('left', false))

    const rightZone = scene.add.zone(halfW, zoneTop, halfW, zoneHeight).setOrigin(0, 0)
    rightZone.setScrollFactor(0)
    rightZone.setDepth(10_000)
    rightZone.setInteractive()
    rightZone.on('pointerdown', () => inputMgr.setVirtualPressed('right', true))
    rightZone.on('pointerup', () => inputMgr.setVirtualPressed('right', false))
    rightZone.on('pointerout', () => inputMgr.setVirtualPressed('right', false))
    rightZone.on('pointerupoutside', () => inputMgr.setVirtualPressed('right', false))

    if (showHints) {
      const hintY = zoneTop + zoneHeight / 2
      const leftHint = scene.add.text(halfW * 0.5, hintY, '◀', {
        fontFamily: 'Courier New, monospace',
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      leftHint.setOrigin(0.5)
      leftHint.setAlpha(0.22)
      leftHint.setScrollFactor(0)
      leftHint.setDepth(10_001)

      const rightHint = scene.add.text(halfW + halfW * 0.5, hintY, '▶', {
        fontFamily: 'Courier New, monospace',
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      rightHint.setOrigin(0.5)
      rightHint.setAlpha(0.22)
      rightHint.setScrollFactor(0)
      rightHint.setDepth(10_001)

      // Subtle divider so the player visually senses the two zones.
      const divider = scene.add.rectangle(halfW, zoneTop + zoneHeight / 2, 2, zoneHeight * 0.6, 0xffffff, 0.1)
      divider.setScrollFactor(0)
      divider.setDepth(10_001)
    }
  }
}
