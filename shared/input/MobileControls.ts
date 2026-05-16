import Phaser from 'phaser'
import type { InputManager } from './InputManager'

/**
 * Touch-only on-screen controls for vertical platformers.
 *
 * Bottom strip is divided into three columns:
 *   - Left zone (hold to move left)
 *   - Center column with visible JUMP and SUPER buttons (tap)
 *   - Right zone (hold to move right)
 *
 * All actions are driven through `InputManager.setVirtualPressed`, so
 * pressing a button is equivalent to holding the corresponding key. The
 * scene's swipe/tap detector is told to ignore the bottom strip, so
 * hold-then-release on a movement zone never also fires a global jump.
 *
 * Auto-hides on non-touch devices.
 */

const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export interface MobileControlsOptions {
  /** Fraction of the scene height occupied by the bottom control strip. */
  bottomFraction?: number
  /** Fraction of the screen width given to each side movement zone (0-0.5). */
  sideWidthFraction?: number
  /** Force-enable even on desktop (useful for debugging). */
  forceEnable?: boolean
  /** Render the visible arrow hints and button labels. */
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

    const bottomFraction = options.bottomFraction ?? 0.32
    const sideWidthFraction = options.sideWidthFraction ?? 0.32
    const showHints = options.showHints ?? true

    const w = scene.scale.width
    const h = scene.scale.height
    const zoneTop = h * (1 - bottomFraction)
    const zoneHeight = h * bottomFraction
    const sideW = w * sideWidthFraction
    const centerW = w - sideW * 2

    inputMgr.setTouchIgnoreBelowY(zoneTop)

    // ---- LEFT hold zone ----
    const leftZone = scene.add.zone(0, zoneTop, sideW, zoneHeight).setOrigin(0, 0)
    leftZone.setScrollFactor(0).setDepth(10_000).setInteractive()
    leftZone.on('pointerdown', () => inputMgr.setVirtualPressed('left', true))
    leftZone.on('pointerup', () => inputMgr.setVirtualPressed('left', false))
    leftZone.on('pointerout', () => inputMgr.setVirtualPressed('left', false))
    leftZone.on('pointerupoutside', () => inputMgr.setVirtualPressed('left', false))

    // ---- RIGHT hold zone ----
    const rightZone = scene.add.zone(w - sideW, zoneTop, sideW, zoneHeight).setOrigin(0, 0)
    rightZone.setScrollFactor(0).setDepth(10_000).setInteractive()
    rightZone.on('pointerdown', () => inputMgr.setVirtualPressed('right', true))
    rightZone.on('pointerup', () => inputMgr.setVirtualPressed('right', false))
    rightZone.on('pointerout', () => inputMgr.setVirtualPressed('right', false))
    rightZone.on('pointerupoutside', () => inputMgr.setVirtualPressed('right', false))

    // ---- CENTER column: JUMP (big) and SUPER (smaller, above) ----
    const centerCx = sideW + centerW / 2
    const jumpCy = h - zoneHeight * 0.32
    const jumpRadius = Math.min(zoneHeight * 0.28, centerW * 0.42, 48)
    const superRadius = jumpRadius * 0.62
    const superCy = jumpCy - jumpRadius - superRadius - 4

    this.makeButton(centerCx, jumpCy, jumpRadius, 0xff6b35, 0xa6391c, () => {
      inputMgr.setVirtualPressed('up', true)
    }, () => {
      inputMgr.setVirtualPressed('up', false)
    })
    this.makeButton(centerCx, superCy, superRadius, 0x7ad4ff, 0x3a7c9b, () => {
      inputMgr.setVirtualPressed('action', true)
    }, () => {
      inputMgr.setVirtualPressed('action', false)
    })

    if (showHints) {
      // Arrow labels for the hold zones
      const arrowY = zoneTop + zoneHeight / 2
      const leftArrow = scene.add.text(sideW / 2, arrowY, '<', {
        fontFamily: 'Courier New, monospace',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      leftArrow.setOrigin(0.5).setAlpha(0.28).setScrollFactor(0).setDepth(10_001)
      const rightArrow = scene.add.text(w - sideW / 2, arrowY, '>', {
        fontFamily: 'Courier New, monospace',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      rightArrow.setOrigin(0.5).setAlpha(0.28).setScrollFactor(0).setDepth(10_001)

      // Labels on the buttons
      const jumpLabel = scene.add.text(centerCx, jumpCy, 'JUMP', {
        fontFamily: 'Courier New, monospace',
        fontSize: `${Math.max(11, Math.floor(jumpRadius * 0.42))}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      jumpLabel.setOrigin(0.5).setScrollFactor(0).setDepth(10_003)
      const superLabel = scene.add.text(centerCx, superCy, 'SUP', {
        fontFamily: 'Courier New, monospace',
        fontSize: `${Math.max(9, Math.floor(superRadius * 0.5))}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      superLabel.setOrigin(0.5).setScrollFactor(0).setDepth(10_003)
    }
  }

  private makeButton(
    cx: number,
    cy: number,
    radius: number,
    fillColor: number,
    strokeColor: number,
    onDown: () => void,
    onUp: () => void
  ) {
    const bg = this.scene.add.circle(cx, cy, radius, fillColor, 0.78)
    bg.setStrokeStyle(3, strokeColor, 0.95)
    bg.setScrollFactor(0).setDepth(10_002).setInteractive()
    bg.on('pointerdown', () => {
      bg.setFillStyle(fillColor, 1)
      onDown()
    })
    bg.on('pointerup', () => {
      bg.setFillStyle(fillColor, 0.78)
      onUp()
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(fillColor, 0.78)
      onUp()
    })
    bg.on('pointerupoutside', () => {
      bg.setFillStyle(fillColor, 0.78)
      onUp()
    })
  }
}
