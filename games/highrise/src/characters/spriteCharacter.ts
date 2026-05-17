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
 * Every sprite character is wrapped in a Phaser Container so the visual
 * (the Sprite child) and the logical position / physics body (the Container)
 * can be reasoned about separately. The Sprite sits at (0, 0) inside the
 * Container — no flip compensation; the source art is assumed to have the
 * character body centered in its 48px frame. If a character looks off-center
 * when turning around, the fix lives in the spritesheet (re-center the art),
 * not here.
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

export interface SpriteCharacterConfig {
  id: string
  name: string
  /** Base name used in file paths and animation keys (e.g. 'Woodcutter'). */
  basename: string
}

export function createSpriteCharacter(cfg: SpriteCharacterConfig): CharacterSkin {
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

      container.setData('basename', cfg.basename)
      container.setData('innerSprite', sprite)
      container.setData('currentState', 'idle')

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

      if (facing === -1) sprite.setFlipX(true)
      else if (facing === 1) sprite.setFlipX(false)
      // facing === 0: leave whatever flip is currently applied
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
