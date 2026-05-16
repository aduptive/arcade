import Phaser from 'phaser'
import type { MapTheme } from './MapTheme'

/**
 * The "Default" map: a starfield night sky, green platforms.
 * Mirrors the original look of the game before the multi-map refactor,
 * so existing playtests stay visually familiar.
 */
export const defaultMap: MapTheme = {
  id: 'default',
  name: 'Night Sky',
  tagline: 'Where it all started.',
  backgroundColor: 0x1a1a2e,
  hudAccent: '#f5f5f5',
  flashAccent: '#ff6b35',

  paintBackground: ({ scene, width, height }) => {
    const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e)
    bg.setScrollFactor(0)

    const stars = scene.add.graphics()
    stars.fillStyle(0xffffff, 0.7)
    for (let i = 0; i < 80; i++) {
      stars.fillCircle(
        Math.random() * width,
        Math.random() * height,
        Math.random() < 0.85 ? 1 : 2
      )
    }
    stars.setScrollFactor(0.3)
  },

  paintStep: ({ scene, x, y, width, height }) => {
    const rect = scene.add.rectangle(x, y, width, height, 0x6fb04a)
    rect.setStrokeStyle(2, 0x3d6d28)
    return rect
  },
}
