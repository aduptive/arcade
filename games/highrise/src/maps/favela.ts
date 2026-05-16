import Phaser from 'phaser'
import type { MapTheme } from './MapTheme'

/**
 * "Morro Acima" — the favela map.
 * Each step is a colored rooftop with small architectural details (water tank,
 * antenna, clothesline). Background is a warm tropical sky with hills and
 * power lines crossing it, and Cristo Redentor distant on the horizon.
 *
 * This is the first map to anchor the multi-map architecture and the
 * differentiator that gives the game a distinct cultural identity.
 */

const ROOFTOP_COLORS = [
  0xff6b6b, // coral red
  0xffd93d, // sunshine yellow
  0x6bcb77, // grass green
  0x4d96ff, // sky blue
  0xff9eaa, // pink
  0xffa45c, // orange
  0xb88dff, // soft purple
  0xfff1c1, // cream
]

const ROOFTOP_OUTLINE = 0x2a1810

const BG_TOP = { r: 0xff, g: 0xb3, b: 0x6c } // warm sunset orange
const BG_MID = { r: 0xff, g: 0x6b, b: 0xa3 } // pink-purple
const BG_BOTTOM = { r: 0x3d, g: 0x2e, b: 0x5a } // dusky purple

export const favelaMap: MapTheme = {
  id: 'favela',
  name: 'Morro Acima',
  tagline: 'A capivara sobe os telhados até o pôr-do-sol.',
  backgroundColor: 0x3d2e5a,
  hudAccent: '#fff1c1',
  flashAccent: '#ffd93d',

  paintBackground: ({ scene, width, height }) => {
    // Vertical gradient: warm sunset at top, pink-purple middle, dusky purple at bottom
    const g = scene.add.graphics()
    const steps = 60
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      let r: number, gr: number, b: number
      if (t < 0.5) {
        const tt = t / 0.5
        r = Math.round(BG_TOP.r + (BG_MID.r - BG_TOP.r) * tt)
        gr = Math.round(BG_TOP.g + (BG_MID.g - BG_TOP.g) * tt)
        b = Math.round(BG_TOP.b + (BG_MID.b - BG_TOP.b) * tt)
      } else {
        const tt = (t - 0.5) / 0.5
        r = Math.round(BG_MID.r + (BG_BOTTOM.r - BG_MID.r) * tt)
        gr = Math.round(BG_MID.g + (BG_BOTTOM.g - BG_MID.g) * tt)
        b = Math.round(BG_MID.b + (BG_BOTTOM.b - BG_MID.b) * tt)
      }
      g.fillStyle((r << 16) | (gr << 8) | b, 1)
      g.fillRect(0, (height * i) / steps, width, height / steps + 1)
    }
    g.setScrollFactor(0)

    // Distant hills silhouette (with Cristo Redentor cross hinted at center-right)
    const hills = scene.add.graphics()
    hills.fillStyle(0x1d1530, 0.85)
    hills.beginPath()
    hills.moveTo(0, height * 0.62)
    hills.lineTo(width * 0.15, height * 0.55)
    hills.lineTo(width * 0.32, height * 0.6)
    hills.lineTo(width * 0.55, height * 0.5)
    hills.lineTo(width * 0.72, height * 0.58)
    hills.lineTo(width * 0.92, height * 0.52)
    hills.lineTo(width, height * 0.6)
    hills.lineTo(width, height)
    hills.lineTo(0, height)
    hills.closePath()
    hills.fillPath()
    // Tiny Cristo cross silhouette on the highest peak
    hills.fillStyle(0x0f0a1a, 0.9)
    const crossX = width * 0.55
    const crossY = height * 0.5
    hills.fillRect(crossX - 1, crossY - 8, 2, 8) // vertical
    hills.fillRect(crossX - 4, crossY - 5, 8, 2) // horizontal
    hills.setScrollFactor(0.15) // slight parallax

    // Floating clouds / haze
    const haze = scene.add.graphics()
    haze.fillStyle(0xffffff, 0.06)
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * width
      const cy = Math.random() * height * 0.6
      haze.fillCircle(cx, cy, 30 + Math.random() * 20)
    }
    haze.setScrollFactor(0.4)
  },

  paintStep: ({ scene, x, y, width, height, isFloor }) => {
    const color = ROOFTOP_COLORS[Math.floor(Math.random() * ROOFTOP_COLORS.length)]
    const rect = scene.add.rectangle(x, y, width, height, color)
    rect.setStrokeStyle(2, ROOFTOP_OUTLINE)

    if (isFloor) return rect

    // Decorations sit visually on top of the rooftop; they're independent
    // GameObjects, not collision targets.
    const decoY = y - height / 2
    const r = Math.random()
    if (r < 0.25 && width > 60) {
      // Water tank (small circle) on top of the roof
      const tank = scene.add.circle(x - width * 0.25, decoY - 8, 7, 0x99a3b0)
      tank.setStrokeStyle(1, 0x4a5562)
    } else if (r < 0.5 && width > 60) {
      // TV antenna
      const antG = scene.add.graphics()
      antG.lineStyle(2, 0x2a2a2a, 1)
      antG.beginPath()
      antG.moveTo(x + width * 0.25, decoY)
      antG.lineTo(x + width * 0.25, decoY - 14)
      antG.moveTo(x + width * 0.2, decoY - 10)
      antG.lineTo(x + width * 0.3, decoY - 10)
      antG.moveTo(x + width * 0.18, decoY - 6)
      antG.lineTo(x + width * 0.32, decoY - 6)
      antG.strokePath()
    } else if (r < 0.7 && width > 70) {
      // Clothesline with a couple of garments
      const lineG = scene.add.graphics()
      lineG.lineStyle(1, 0x3a2a1a, 0.9)
      const ly = decoY - 9
      lineG.beginPath()
      lineG.moveTo(x - width * 0.35, ly)
      lineG.lineTo(x + width * 0.35, ly)
      lineG.strokePath()
      // Two small squares hanging
      scene.add.rectangle(x - width * 0.15, ly + 4, 5, 6, 0xff4d6d)
      scene.add.rectangle(x + width * 0.1, ly + 5, 5, 7, 0x4d96ff)
    } else if (r < 0.85) {
      // Satellite dish
      const dish = scene.add.arc(x + width * 0.2, decoY - 5, 5, 200, 340, false, 0xe0e0e0)
      dish.setStrokeStyle(1, 0x4a4a4a)
    }
    // Otherwise no decoration on this roof — keeps things from getting visually noisy.
    return rect
  },
}
