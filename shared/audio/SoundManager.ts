import Phaser from 'phaser'

/**
 * Audio event bus + Phaser sound dispatcher.
 *
 * The goal of this layer is to let game code emit semantic events ("the
 * player jumped", "picked up a coin", "died") without knowing what audio
 * asset, volume or pitch should play for them. The actual sound mapping
 * lives in one place (registered via `register(...)`) and is easy to swap
 * when the final sound pack arrives.
 *
 * Sounds are loaded by the scene's audio plugin like any other Phaser
 * asset (`scene.load.audio('jump', '/audio/jump.mp3')`). When no sound is
 * registered for an event, `play()` is a silent no-op — keeps the game
 * functional without any audio assets at all.
 */

export type AudioEvent =
  | 'jump'
  | 'super_jump'
  | 'land'
  | 'pickup_coin'
  | 'pickup_super'
  | 'pickup_lunar'
  | 'pickup_mystery'
  | 'mystery_good'
  | 'mystery_bad'
  | 'combo_inc'
  | 'combo_break'
  | 'level_up'
  | 'death'
  | 'menu_select'
  | 'menu_confirm'

interface SoundDef {
  /** Phaser cache key that the audio was loaded with. */
  key: string
  /** 0..1 base volume; randomized slightly per play. */
  volume?: number
  /** Detune in cents (-1200..1200); randomized slightly per play. */
  detune?: number
  /** If true, ignores the global mute. Useful for menu confirm sounds. */
  alwaysOn?: boolean
}

type Registry = Partial<Record<AudioEvent, SoundDef>>

export class SoundManager {
  private muted = false
  private registry: Registry = {}

  constructor(private scene: Phaser.Scene) {}

  /** Register or replace the sound definition for one event. */
  register(event: AudioEvent, def: SoundDef): void {
    this.registry[event] = def
  }

  /** Register a batch (handy at boot time). */
  registerMany(defs: Partial<Record<AudioEvent, SoundDef>>): void {
    Object.assign(this.registry, defs)
  }

  /**
   * Fire a sound for an event. Silent no-op if nothing is registered for
   * that event or if the audio asset hasn't been preloaded. Never throws.
   */
  play(event: AudioEvent): void {
    if (this.muted) {
      const def = this.registry[event]
      if (!def?.alwaysOn) return
    }
    const def = this.registry[event]
    if (!def) return
    if (!this.scene.sound) return
    if (!this.scene.cache?.audio?.exists?.(def.key)) return
    try {
      this.scene.sound.play(def.key, {
        volume: jitter(def.volume ?? 0.6, 0.1, 0, 1),
        detune: jitter(def.detune ?? 0, 60, -1200, 1200),
      })
    } catch {
      // ignore — never let audio break gameplay
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }
}

function jitter(base: number, range: number, lo: number, hi: number): number {
  const r = base + (Math.random() * 2 - 1) * range
  return Math.max(lo, Math.min(hi, r))
}
