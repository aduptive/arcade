import Phaser from 'phaser'
import type { MapTheme } from './MapTheme'

/**
 * "Skyline" — New York skyscraper map.
 * Direct nod to the original Crazy Climber (1980) arcade game where the
 * player climbed Manhattan buildings. Steps are concrete window ledges with
 * occasional AC units, satellite dishes and pigeons.
 *
 * Background: deep night-blue with a grid of warm yellow window lights
 * stretching far into the distance.
 */

const LEDGE_COLORS = [0xc8c5b9, 0xb3b0a3, 0xddc9a1, 0xa6a299]
const LEDGE_OUTLINE = 0x3a2f24

export const nyMap: MapTheme = {
  id: 'ny',
  name: 'Skyline',
  tagline: 'Every floor is a different story.',
  backgroundColor: 0x0a0f24,
  hudAccent: '#fff7c4',
  flashAccent: '#ffd93d',

  paintBackground: ({ scene, width, height }) => {
    // Solid dark blue
    const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0f24)
    bg.setScrollFactor(0)

    // Window grid — a far skyline of lit windows on distant buildings,
    // arranged in tight columns with random on/off pattern.
    const windowsG = scene.add.graphics()
    const colCount = 10
    const rowCount = 24
    const colW = width / colCount
    const winW = colW * 0.5
    const winH = (height * 1.1) / rowCount * 0.4
    const winGapY = (height * 1.1) / rowCount

    for (let c = 0; c < colCount; c++) {
      const colX = c * colW + colW / 2 - winW / 2
      // Skip some columns to vary the silhouette
      if (Math.random() < 0.15) continue
      for (let r = 0; r < rowCount; r++) {
        const lit = Math.random() < 0.55
        if (!lit) continue
        const yy = r * winGapY + winGapY * 0.3
        const tint = Math.random() < 0.85 ? 0xffd47a : 0xffffff
        windowsG.fillStyle(tint, 0.85)
        windowsG.fillRect(colX, yy, winW, winH)
      }
    }
    windowsG.setScrollFactor(0.18) // far parallax

    // A subtle moon high up
    const moon = scene.add.circle(width * 0.85, height * 0.15, 18, 0xfff4d6, 0.85)
    moon.setScrollFactor(0.4)
  },

  paintStep: ({ scene, x, y, width, height, isFloor }) => {
    const color = LEDGE_COLORS[Math.floor(Math.random() * LEDGE_COLORS.length)]
    const rect = scene.add.rectangle(x, y, width, height, color)
    rect.setStrokeStyle(2, LEDGE_OUTLINE)

    if (isFloor) return rect

    const decoY = y - height / 2
    const r = Math.random()
    if (r < 0.3 && width > 60) {
      // AC unit on the ledge
      const ac = scene.add.rectangle(x - width * 0.2, decoY - 6, 14, 10, 0x808080)
      ac.setStrokeStyle(1, 0x3a3a3a)
      // Vent lines
      const lines = scene.add.graphics()
      lines.lineStyle(1, 0x3a3a3a, 0.7)
      lines.beginPath()
      for (let i = -4; i <= 4; i += 2) {
        lines.moveTo(x - width * 0.2 - 5, decoY - 6 + i)
        lines.lineTo(x - width * 0.2 + 5, decoY - 6 + i)
      }
      lines.strokePath()
    } else if (r < 0.5 && width > 60) {
      // A perched pigeon — small dark blob with a tiny beak hint
      scene.add.ellipse(x + width * 0.25, decoY - 5, 8, 5, 0x4d4d4d)
      scene.add.rectangle(x + width * 0.25 + 4, decoY - 5, 2, 1, 0xff9a3c)
    } else if (r < 0.7 && width > 70) {
      // Small satellite dish
      const dish = scene.add.arc(x + width * 0.3, decoY - 5, 5, 200, 340, false, 0xe0e0e0)
      dish.setStrokeStyle(1, 0x4a4a4a)
    }
    return rect
  },
}
