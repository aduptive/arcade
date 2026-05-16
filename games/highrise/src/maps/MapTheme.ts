import Phaser from 'phaser'
import type { PickupThemeOverride } from '../game/Pickup'

/**
 * A MapTheme bundles everything that defines the look and feel of a single
 * climbing location: background, optional climbing structure, the visual style
 * of every step, the palette, and (later) themed audio and pickup labels.
 *
 * The contract is intentionally narrow: the gameplay (physics, scoring,
 * pickups, controls) is identical across all maps. Themes only customize
 * appearance and narrative flair.
 *
 * Rendering order (deepest to shallowest):
 *   1. paintBackground   — static or parallax (scrollFactor < 1) ambience
 *   2. paintStructure    — optional vertical structure that scrolls 1:1 with
 *                          the camera and tiles infinitely upward (tower wall,
 *                          tree trunk, cathedral facade, etc.)
 *   3. steps             — drawn by paintStep, scroll 1:1
 *   4. pickups, player, HUD
 *
 * Maps where the structure IS the step (e.g. favela rooftops) just don't
 * implement paintStructure.
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
   * Paints the static background once on scene create. Use `scrollFactor < 1`
   * for parallax layers (distant skyline, far hills, etc.) and `scrollFactor 0`
   * for absolutely fixed layers (vignette, gradient).
   */
  paintBackground: (args: BackgroundPaintArgs) => void

  /**
   * Optional vertical structure rendered above the background but below the
   * steps. Scrolls 1:1 with the camera and is expected to tile infinitely
   * upward — typically implemented with `scene.add.tileSprite` over a
   * generated texture. This is the thing the player is climbing on:
   * the tower wall behind window ledges, the trunk of a giant tree,
   * the facade of a cathedral. Maps where every step is its own building
   * (favela rooftops) leave this undefined.
   */
  paintStructure?: (args: BackgroundPaintArgs) => void

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
  /**
   * Optional re-skin of the four pickup types (colors and single-glyph
   * label). Mechanics stay the same; only the visuals change. Maps that
   * don't supply this use the default colors and no label.
   */
  pickupTheme?: PickupThemeOverride
}
