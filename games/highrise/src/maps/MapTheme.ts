import Phaser from 'phaser'

/**
 * A MapTheme bundles everything that defines the look and feel of a single
 * climbing location: background, the visual style of every step, the palette,
 * and (later) themed audio and pickup labels.
 *
 * The contract is intentionally narrow: the gameplay (physics, scoring,
 * pickups, controls) is identical across all maps. Themes only customize
 * appearance and narrative flair.
 */

export interface BackgroundPaintArgs {
  scene: Phaser.Scene
  width: number
  height: number
}

export interface StepPaintArgs {
  scene: Phaser.Scene
  x: number
  y: number
  width: number
  height: number
  /** True for the initial full-width ground step at game start. */
  isFloor: boolean
}

export interface MapTheme {
  /** Stable id used for selection and persistence. */
  id: string
  /** Display name for the menu. */
  name: string
  /** One-liner narrative shown in the menu. */
  tagline: string
  /** Solid background color set on the Phaser game config and used by the body CSS theme. */
  backgroundColor: number

  /**
   * Paints the static background once on scene create. Should set scroll
   * factor 0 for fixed layers and use add.tileSprite or scaled graphics for
   * parallax layers.
   */
  paintBackground: (args: BackgroundPaintArgs) => void

  /**
   * Creates the primary collision rectangle for a step PLUS any visual
   * decorations on top of it (antennas, leaves, AC units, etc.). Decorations
   * are added directly to the scene and are not tracked separately — they
   * live as long as the step does, which is acceptable for short runs.
   *
   * Must return the rectangle that will receive the physics body.
   */
  paintStep: (args: StepPaintArgs) => Phaser.GameObjects.Rectangle

  /** Optional accent color for HUD text. Defaults to white. */
  hudAccent?: string
  /** Optional accent color for level-up flash and other transient UI. Defaults to orange. */
  flashAccent?: string
}
