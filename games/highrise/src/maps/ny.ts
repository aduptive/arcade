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
  // NY pickups: bagel (coin) / coffee (super) / donut (lunar) / pretzel (?)
  pickupTheme: {
    coin: { fillColor: 0xd9a86b, strokeColor: 0x6b4a2a, label: 'B' }, // bagel
    super: { fillColor: 0x8b5a3c, strokeColor: 0x3a2410, label: 'C', labelColor: '#fff7c4' }, // coffee
    lunar: { fillColor: 0xf2b6c1, strokeColor: 0x8a4256, label: 'D' }, // donut
    mystery: { fillColor: 0xe6c98a, strokeColor: 0x7a5a2a, label: '?' }, // pretzel
  },

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

  paintStructure: ({ scene, width, height }) => {
    // Glass-tower wall behind the ledges. A 32x48 tile texture is generated
    // procedurally, then displayed by a screen-sized TileSprite. Each frame
    // we shift `tilePositionY` to match the camera's scroll so the pattern
    // appears to roll past at 1:1 speed — equivalent to "infinitely tall"
    // without allocating an absurd render buffer.
    const TILE_KEY = 'ny-tower-tile'
    const TILE_W = 32
    const TILE_H = 48
    if (!scene.textures.exists(TILE_KEY)) {
      const g = scene.add.graphics()
      g.fillStyle(0x1a2545, 1)
      g.fillRect(0, 0, TILE_W, TILE_H)
      g.fillStyle(0x14264a, 1)
      g.fillRect(6, 8, 20, 28)
      g.fillStyle(0x4d6a99, 0.55)
      g.fillRect(8, 10, 16, 24)
      g.fillStyle(0xffd47a, 0.18)
      g.fillRect(10, 12, 5, 20)
      g.fillStyle(0x0a1224, 1)
      g.fillRect(0, TILE_H - 2, TILE_W, 2)
      g.generateTexture(TILE_KEY, TILE_W, TILE_H)
      g.destroy()
    }

    const towerWidth = Math.min(width - 24, 540)
    const tower = scene.add.tileSprite(width / 2, height / 2, towerWidth, height + 100, TILE_KEY)
    tower.setOrigin(0.5, 0.5)
    tower.setScrollFactor(0)
    tower.setAlpha(0.85)

    const updateTile = () => {
      tower.tilePositionY = scene.cameras.main.scrollY
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE, updateTile)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, updateTile)
    })
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

  paintCardPreview: ({ scene, container, size }) => {
    const bg = scene.add.rectangle(0, 0, size, size, 0x0a0f24)
    container.add(bg)
    // Glass tower silhouette
    const tower = scene.add.rectangle(0, 0, size * 0.7, size * 0.95, 0x1a2545)
    tower.setStrokeStyle(1, 0x14264a)
    container.add(tower)
    // Window grid (3x5)
    const windows = scene.add.graphics()
    const winW = 5
    const winH = 6
    const cols = 3
    const rows = 5
    const totalW = size * 0.55
    const totalH = size * 0.78
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const lit = Math.random() < 0.65
        if (!lit) continue
        windows.fillStyle(0xffd47a, 0.85)
        const px = -totalW / 2 + (c + 0.5) * (totalW / cols) - winW / 2
        const py = -totalH / 2 + (r + 0.5) * (totalH / rows) - winH / 2
        windows.fillRect(px, py, winW, winH)
      }
    }
    container.add(windows)
    // Moon
    const moon = scene.add.circle(size * 0.32, -size * 0.35, 3, 0xfff4d6, 0.9)
    container.add(moon)
  },
}
