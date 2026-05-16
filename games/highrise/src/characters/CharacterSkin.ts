import Phaser from 'phaser'

/**
 * A CharacterSkin is the visual representation of the playable climber.
 * All characters share the same physics body and movement constants — only
 * the appearance changes. This keeps gameplay perfectly consistent across
 * choices and makes adding a new character a content task, not a code one.
 */

export interface CharacterPaintArgs {
  scene: Phaser.Scene
  x: number
  y: number
  size: number
}

/** GameObjects we know how to use as the player: transform + arcade body capable. */
export type CharacterGameObject =
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Sprite
  | Phaser.GameObjects.Image

/** High-level player state, mapped to an animation by the character skin. */
export type PlayerState = 'idle' | 'walk' | 'jump' | 'fall' | 'climb'

export interface CharacterUpdateArgs {
  gameObject: CharacterGameObject
  state: PlayerState
  /** Direction the player is facing: -1 left, 1 right, 0 neutral. */
  facing: -1 | 0 | 1
}

export interface CharacterSkin {
  /** Stable id used for selection and persistence. */
  id: string
  /** Display name for the menu. */
  name: string

  /**
   * Creates the visual game object for the character at the given position.
   * Must return a single GameObject — it will receive an arcade physics body
   * and be used as the player throughout the scene. The body's logical size
   * is set by GameScene to PLAYER_SIZE x PLAYER_SIZE regardless of the
   * sprite's art dimensions, so the visual can be slightly larger or smaller
   * without affecting collisions.
   */
  paintCharacter: (args: CharacterPaintArgs) => CharacterGameObject

  /**
   * Optional per-frame hook that updates the visual based on the player's
   * current state. Sprite characters use this to play the right animation
   * (idle/walk/jump/etc.) and flip horizontally. Rectangle placeholders
   * leave this undefined.
   */
  updateAnimation?: (args: CharacterUpdateArgs) => void
}
