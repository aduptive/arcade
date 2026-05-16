import Phaser from 'phaser'
import {
  CRAFTPIX_ANIM_DEFS,
  USED_PLAYER_STATES,
  animKey,
  animUrl,
} from '../characters/spriteCharacter'

// The three Craftpix-style sprite characters share the same animation set and
// folder layout: each animation is its own spritesheet, all frames 48x48.
const CRAFTPIX_BASENAMES = ['Woodcutter', 'GraveRobber', 'SteamMan']

// Which anims we actually need at runtime. Keeping this lean to reduce
// initial preload time; can extend if we add features like attack/hurt.
const ANIMS_TO_LOAD = ['idle', 'walk', 'jump', 'climb']

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    for (const basename of CRAFTPIX_BASENAMES) {
      for (const anim of ANIMS_TO_LOAD) {
        this.load.spritesheet(animKey(basename, anim), animUrl(basename, anim), {
          frameWidth: 48,
          frameHeight: 48,
        })
      }
    }
  }

  create() {
    this.createCharacterAnimations()
    // Sanity log so we notice missing assets in dev. USED_PLAYER_STATES is
    // imported to keep the dependency live; useful as we extend later.
    void USED_PLAYER_STATES
    this.scene.start('MenuScene')
  }

  /**
   * Registers the Phaser animations once at boot. Animations are global to
   * the Phaser.Game instance, so every scene can play them by key.
   */
  private createCharacterAnimations() {
    for (const basename of CRAFTPIX_BASENAMES) {
      for (const anim of ANIMS_TO_LOAD) {
        const key = animKey(basename, anim)
        if (this.anims.exists(key)) continue
        if (!this.textures.exists(key)) continue
        const def = CRAFTPIX_ANIM_DEFS[anim]
        if (!def) continue
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: def.frames - 1 }),
          frameRate: def.frameRate,
          repeat: def.loop ? -1 : 0,
        })
      }
    }
  }
}
