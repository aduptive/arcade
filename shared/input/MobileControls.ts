import Phaser from 'phaser'
import type { InputManager } from './InputManager'

/**
 * Touch-only on-screen controls for vertical platformers.
 *
 * Layout: four compact corner buttons.
 *
 *   bottom-left corner:        LEFT  <  >  RIGHT
 *   bottom-right corner:                  [ SUP ]
 *                                         [ JUMP ]
 *
 * Each button is a held-press: pointerdown asserts the virtual action,
 * pointerup / pointerout / pointerupoutside releases it. The visible
 * circle is small so it doesn't cover the play area, but the interactive
 * hit area is padded out so a thumb that lands "near" the button still
 * counts.
 *
 * Swipe and tap gestures from `InputManager` keep working anywhere on
 * screen — these buttons are added on top, not in place of, the gesture
 * detector. Useful as a fallback if a finger drifts.
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

  constructor(
    private scene: Phaser.Scene,
    private inputMgr: InputManager,
    options: MobileControlsOptions = {}
  ) {
    this.enabled = options.forceEnable === true || IS_TOUCH_DEVICE
    if (!this.enabled) return

    const w = scene.scale.width
    const h = scene.scale.height

    const margin = 18
    const arrowR = 32
    const arrowGap = 12
    const jumpR = 48
    const supR = 30
    const verticalGapSupToJump = 14

    // ---- Left cluster: < and > arrows ----
    const leftCx = margin + arrowR
    const arrowCy = h - margin - arrowR
    this.makeHoldButton(leftCx, arrowCy, arrowR, '<', 0x222230, 0x666677, 'left')

    const rightCx = leftCx + arrowR * 2 + arrowGap
    this.makeHoldButton(rightCx, arrowCy, arrowR, '>', 0x222230, 0x666677, 'right')

    // ---- Right cluster: JUMP (big) + SUP (smaller, above) ----
    const jumpCx = w - margin - jumpR
    const jumpCy = h - margin - jumpR
    this.makeHoldButton(jumpCx, jumpCy, jumpR, 'JMP', 0xff6b35, 0xa6391c, 'up')

    const supCx = jumpCx
    const supCy = jumpCy - jumpR - verticalGapSupToJump - supR
    this.makeHoldButton(supCx, supCy, supR, 'SUP', 0x7ad4ff, 0x3a7c9b, 'action')
  }

  private makeHoldButton(
    cx: number,
    cy: number,
    radius: number,
    label: string,
    fill: number,
    stroke: number,
    action: 'left' | 'right' | 'up' | 'down' | 'action'
  ) {
    const circle = this.scene.add.circle(cx, cy, radius, fill, 0.72)
    circle.setStrokeStyle(3, stroke, 0.92)
    circle.setScrollFactor(0)
    circle.setDepth(10_002)
    // Hit area pads beyond the visible circle so a thumb that lands "near"
    // still registers — usability tradeoff for the smaller visual.
    circle.setInteractive(
      new Phaser.Geom.Circle(radius, radius, radius + 18),
      Phaser.Geom.Circle.Contains
    )

    const press = () => {
      circle.setFillStyle(fill, 0.95)
      this.inputMgr.setVirtualPressed(action, true)
    }
    const release = () => {
      circle.setFillStyle(fill, 0.72)
      this.inputMgr.setVirtualPressed(action, false)
    }

    circle.on('pointerdown', press)
    circle.on('pointerup', release)
    circle.on('pointerout', release)
    circle.on('pointerupoutside', release)

    const txt = this.scene.add.text(cx, cy, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: radius > 40 ? '18px' : '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    txt.setOrigin(0.5)
    txt.setScrollFactor(0)
    txt.setDepth(10_003)
    txt.setLetterSpacing(1)
  }
}
