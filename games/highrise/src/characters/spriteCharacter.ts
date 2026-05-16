import Phaser from 'phaser'
import type {
  CharacterGameObject,
  CharacterPaintArgs,
  CharacterSkin,
  CharacterUpdateArgs,
  PlayerState,
} from './CharacterSkin'

/**
 * Shared helper for building Craftpix-style sprite characters where each
 * animation lives in its own spritesheet (idle/walk/run/jump/climb/...).
 *
 * The Craftpix character art is not perfectly centered horizontally within
 * its 48x48 frame — the body sits about 6 source pixels right of center.
 * That means `setFlipX(true)` would mirror around the frame center, making
 * the character visually jump left by ~12 source pixels (or ~28 display
 * pixels at 2.33x scale) every time the player turns around.
 *
 * To hide that jump without re-exporting the art, every sprite character is
 * wrapped in a Phaser Container:
 *
 *   - The Container holds the player's logical position and physics body.
 *   - The Sprite child sits inside, scaled to the requested visual size.
 *   - When facing right (unflipped), the sprite is shifted LEFT inside the
 *     container by `artOffsetDisplay` so the character's body lines up with
 *     the container's center.
 *   - When facing left (flipped), the sprite is shifted RIGHT by the same
 *     amount so the mirrored body also lines up with the container's center.
 *
 * Net result: the visual position of the character stays exactly put when
 * flipping — only the orientation changes.
 */

/** Per-animation metadata: spritesheet key, frame count, framerate, looping. */
export interface AnimDef {
  key: string
  frames: number
  frameRate: number
  loop: boolean
}

/** Maps player state -> animation key suffix for this character (e.g. 'idle', 'walk', 'jump'). */
const STATE_TO_ANIM: Record<PlayerState, string> = {
  idle: 'idle',
  walk: 'walk',
  jump: 'jump',
  fall: 'jump', // no separate fall art; jump animation's last frame is fine
  climb: 'climb',
}

/**
 * Standard animation set shared by Woodcutter / GraveRobber / SteamMan, based
 * on the Craftpix file sizes (all 48px tall, widths derived).
 */
export const CRAFTPIX_ANIM_DEFS: Record<string, { frames: number; loop: boolean; frameRate: number }> = {
  idle: { frames: 4, loop: true, frameRate: 5 },
  walk: { frames: 6, loop: true, frameRate: 8 },
  run: { frames: 6, loop: true, frameRate: 12 },
  jump: { frames: 6, loop: false, frameRate: 10 },
  climb: { frames: 6, loop: true, frameRate: 10 },
  push: { frames: 6, loop: true, frameRate: 8 },
  craft: { frames: 6, loop: true, frameRate: 8 },
  hurt: { frames: 3, loop: false, frameRate: 10 },
  death: { frames: 6, loop: false, frameRate: 8 },
  attack1: { frames: 6, loop: false, frameRate: 12 },
  attack2: { frames: 6, loop: false, frameRate: 12 },
  attack3: { frames: 6, loop: false, frameRate: 12 },
}

/** Anims actually used by the platformer gameplay; rest are kept available for future use. */
export const USED_PLAYER_STATES: PlayerState[] = ['idle', 'walk', 'jump', 'climb']

/**
 * Each character has the body drawn at a slightly different horizontal
 * position within its 48px frame. The default of 0 means the body is
 * assumed to be at the frame's exact center. A NEGATIVE value means the
 * body sits LEFT of frame center (so when flipping, we shift the sprite
 * RIGHT to keep the body centered on the container). A POSITIVE value
 * means the body sits RIGHT of frame center. Values are tuned empirically
 * per character — see each character file's `artOffsetInFrame` override.
 */
const DEFAULT_ART_OFFSET_IN_FRAME = 0

export interface SpriteCharacterConfig {
  id: string
  name: string
  /** Base name used in file paths and animation keys (e.g. 'Woodcutter'). */
  basename: string
  /**
   * Per-character body offset within the 48px source frame. Negative if the
   * character body sits left of frame center, positive if right. Defaults
   * to 0 (body assumed centered). Tune by watching the on-character debug
   * crosshair: the body should sit on the crosshair regardless of facing.
   */
  artOffsetInFrame?: number
}

export function createSpriteCharacter(cfg: SpriteCharacterConfig): CharacterSkin {
  const offsetInFrame = cfg.artOffsetInFrame ?? DEFAULT_ART_OFFSET_IN_FRAME
  return {
    id: cfg.id,
    name: cfg.name,
    paintCharacter: ({ scene, x, y, size }: CharacterPaintArgs): CharacterGameObject => {
      const container = scene.add.container(x, y)
      container.setSize(size, size)

      const idleKey = animKey(cfg.basename, 'idle')
      const sprite = scene.add.sprite(0, 0, idleKey, 0)
      sprite.setScale(size / 48)
      sprite.play(idleKey)
      container.add(sprite)

      const artOffsetDisplay = offsetInFrame * (size / 48)
      // Initial facing = right (unflipped). Shift to compensate for body
      // offset within the frame so the character body lands on the
      // container center regardless of which direction it's facing.
      sprite.x = -artOffsetDisplay

      // ---- DEBUG OUTLINES ----
      // White rectangle = container area (where the logical body lives).
      // Red rectangle = sprite frame at its current offset (so we can see if
      // it actually shifts when flipping).
      // Cyan crosshair = container's exact center (sprite.x = 0 reference).
      const containerOutline = scene.add.rectangle(0, 0, size, size)
      containerOutline.setStrokeStyle(2, 0xffffff, 0.85)
      container.add(containerOutline)

      const spriteOutline = scene.add.rectangle(sprite.x, 0, size, size)
      spriteOutline.setStrokeStyle(2, 0xff3030, 0.95)
      container.add(spriteOutline)

      const crosshair = scene.add.graphics()
      crosshair.lineStyle(1, 0x00ffff, 1)
      crosshair.lineBetween(-10, 0, 10, 0)
      crosshair.lineBetween(0, -10, 0, 10)
      container.add(crosshair)
      // ---- /DEBUG ----

      container.setData('basename', cfg.basename)
      container.setData('innerSprite', sprite)
      container.setData('spriteOutline', spriteOutline)
      container.setData('currentState', 'idle')
      container.setData('artOffsetDisplay', artOffsetDisplay)

      return container as unknown as CharacterGameObject
    },
    updateAnimation: ({ gameObject, state, facing }: CharacterUpdateArgs) => {
      const container = gameObject as unknown as Phaser.GameObjects.Container
      const sprite = container.getData('innerSprite') as Phaser.GameObjects.Sprite | undefined
      if (!sprite) return

      const basename = container.getData('basename') as string | undefined
      if (!basename) return

      const previous = container.getData('currentState') as PlayerState | undefined
      if (previous !== state) {
        const targetKey = animKey(basename, STATE_TO_ANIM[state])
        if (sprite.scene?.anims?.exists?.(targetKey)) {
          sprite.play(targetKey, true)
          container.setData('currentState', state)
        }
      }

      const artOffsetDisplay = (container.getData('artOffsetDisplay') as number) ?? 0
      const spriteOutline = container.getData('spriteOutline') as
        | Phaser.GameObjects.Rectangle
        | undefined
      if (facing === -1) {
        sprite.setFlipX(true)
        sprite.x = artOffsetDisplay // mirror: shift right by the offset
        if (spriteOutline) spriteOutline.x = sprite.x
      } else if (facing === 1) {
        sprite.setFlipX(false)
        sprite.x = -artOffsetDisplay // unflipped: shift left by the offset
        if (spriteOutline) spriteOutline.x = sprite.x
      }
      // facing === 0: leave whatever flip / offset is currently applied
    },
  }
}

/** Animation key used in Phaser's anim cache, e.g. 'Woodcutter-idle'. */
export function animKey(basename: string, anim: string): string {
  return `${basename}-${anim}`
}

/** Public-relative URL for a character's animation spritesheet. */
export function animUrl(basename: string, anim: string): string {
  return `/sprites/characters/${basename}/${basename}_${anim}.png`
}
