import Phaser from 'phaser'
import type { MapTheme } from './MapTheme'

/**
 * "Arborea" — gigantic tree map.
 * Background: forest silhouette layers in parallax. Structure: a tall trunk
 * (tile-repeated brown bark texture) that runs vertically through the center.
 * Steps: green branches with leaves and the occasional bird perched.
 *
 * This is the showcase map for the paintStructure layer: the player visibly
 * climbs ALONG the trunk, with the forest receding behind in parallax.
 */

const BRANCH_COLORS = [0x4a7c3a, 0x5e8d44, 0x3e6c2e, 0x6da053]
const BRANCH_OUTLINE = 0x1a3010

export const arboreaMap: MapTheme = {
  id: 'arborea',
  name: 'Arborea',
  tagline: 'Climb the giant tree until the canopy.',
  backgroundColor: 0x1a2e1a,
  hudAccent: '#e8f5d8',
  flashAccent: '#a3d76b',

  paintBackground: ({ scene, width, height }) => {
    // Sky gradient: light forest dawn at top, deep emerald at bottom
    const g = scene.add.graphics()
    const steps = 40
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      const r = Math.round(0xa5 + (0x1a - 0xa5) * t)
      const gr = Math.round(0xc9 + (0x2e - 0xc9) * t)
      const b = Math.round(0xbe + (0x1a - 0xbe) * t)
      g.fillStyle((r << 16) | (gr << 8) | b, 1)
      g.fillRect(0, (height * i) / steps, width, height / steps + 1)
    }
    g.setScrollFactor(0)

    // Distant forest silhouette — slowest parallax layer
    const farTrees = scene.add.graphics()
    farTrees.fillStyle(0x0e1f0e, 0.85)
    let x = 0
    while (x < width + 50) {
      const peakH = 60 + Math.random() * 80
      const baseY = height * 0.7
      farTrees.fillTriangle(x, baseY, x + 30, baseY - peakH, x + 60, baseY)
      x += 25
    }
    farTrees.fillRect(0, height * 0.7, width, height * 0.3)
    farTrees.setScrollFactor(0.1)

    // Mid-distance trees, slightly faster parallax
    const midTrees = scene.add.graphics()
    midTrees.fillStyle(0x152e15, 0.9)
    x = -20
    while (x < width + 50) {
      const peakH = 80 + Math.random() * 100
      const baseY = height * 0.85
      midTrees.fillTriangle(x, baseY, x + 40, baseY - peakH, x + 80, baseY)
      x += 50
    }
    midTrees.fillRect(0, height * 0.85, width, height * 0.15)
    midTrees.setScrollFactor(0.25)

    // Floating fireflies / dust motes
    const motes = scene.add.graphics()
    motes.fillStyle(0xe8f5d8, 0.4)
    for (let i = 0; i < 25; i++) {
      motes.fillCircle(Math.random() * width, Math.random() * height, 1)
    }
    motes.setScrollFactor(0.5)
  },

  paintStructure: ({ scene, width }) => {
    // The trunk: a tiled bark texture stretched infinitely up.
    const TILE_KEY = 'arborea-trunk-tile'
    const TILE_W = 64
    const TILE_H = 64
    if (!scene.textures.exists(TILE_KEY)) {
      const g = scene.add.graphics()
      // base bark color
      g.fillStyle(0x4a2e1a, 1)
      g.fillRect(0, 0, TILE_W, TILE_H)
      // darker vertical grooves
      g.fillStyle(0x2a1810, 1)
      g.fillRect(6, 0, 3, TILE_H)
      g.fillRect(28, 0, 2, TILE_H)
      g.fillRect(48, 0, 3, TILE_H)
      // lighter highlights
      g.fillStyle(0x6e4226, 1)
      g.fillRect(14, 0, 2, TILE_H)
      g.fillRect(38, 0, 2, TILE_H)
      g.fillRect(56, 0, 2, TILE_H)
      // a knot / circular detail at random spot
      g.fillStyle(0x2a1810, 1)
      g.fillCircle(22, 30, 5)
      g.fillStyle(0x4a2e1a, 1)
      g.fillCircle(22, 30, 3)
      g.generateTexture(TILE_KEY, TILE_W, TILE_H)
      g.destroy()
    }

    const trunkWidth = Math.min(width * 0.55, 360)
    const trunkTotalHeight = 2_000_000
    const trunk = scene.add.tileSprite(
      width / 2,
      0,
      trunkWidth,
      trunkTotalHeight,
      TILE_KEY
    )
    trunk.setOrigin(0.5, 0.5)
    trunk.setAlpha(0.95)
  },

  paintStep: ({ scene, x, y, width, height, isFloor }) => {
    const color = BRANCH_COLORS[Math.floor(Math.random() * BRANCH_COLORS.length)]
    const rect = scene.add.rectangle(x, y, width, height, color)
    rect.setStrokeStyle(2, BRANCH_OUTLINE)

    if (isFloor) return rect

    const decoY = y - height / 2
    const r = Math.random()
    if (r < 0.4 && width > 60) {
      // Cluster of leaves on top
      const leafG = scene.add.graphics()
      leafG.fillStyle(0x6da053, 0.95)
      leafG.fillCircle(x - width * 0.25, decoY - 8, 6)
      leafG.fillCircle(x - width * 0.1, decoY - 10, 7)
      leafG.fillCircle(x + width * 0.1, decoY - 9, 6)
      leafG.fillCircle(x + width * 0.25, decoY - 8, 6)
      leafG.fillStyle(0x4a7c3a, 0.9)
      leafG.fillCircle(x - width * 0.18, decoY - 5, 4)
      leafG.fillCircle(x + width * 0.18, decoY - 5, 4)
    } else if (r < 0.6 && width > 50) {
      // Perched bird (small bright dot)
      scene.add.ellipse(x + width * 0.2, decoY - 5, 7, 5, 0xf2c14e)
      scene.add.rectangle(x + width * 0.2 + 3, decoY - 5, 2, 1, 0xff8030)
    } else if (r < 0.75 && width > 70) {
      // A hanging vine
      const vine = scene.add.graphics()
      vine.lineStyle(2, 0x3e6c2e, 0.85)
      vine.beginPath()
      vine.moveTo(x - width * 0.3, decoY)
      vine.lineTo(x - width * 0.3 - 2, decoY + 18)
      vine.strokePath()
      // little leaf at the tip
      scene.add.circle(x - width * 0.3 - 2, decoY + 18, 3, 0x6da053)
    }
    return rect
  },
}
