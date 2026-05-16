import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'
import { PauseScene } from './scenes/PauseScene'

// Dynamic game canvas sizing.
//
// - On portrait phones, uses the device's actual width/height for crisp,
//   pixel-perfect rendering with no scaling.
// - On wide desktops, caps the width so gameplay (which is bounded by jump
//   distance) stays sensible. Below the cap, the canvas matches the window.
// - With the cap and `Phaser.Scale.FIT`, desktop users see a wider portrait
//   board centered on screen (with side bars), instead of a tiny 480-wide
//   column with empty space all around.
//
// `pixelArt` is intentionally OFF: we have no pixel-art textures yet, only
// vector shapes. Smooth scaling looks better than nearest-neighbor for this.
const MIN_GAME_WIDTH = 320
const MAX_GAME_WIDTH = 600
const MIN_GAME_HEIGHT = 480
const MAX_GAME_HEIGHT = 1280

function computeGameSize() {
  const w = Math.min(Math.max(window.innerWidth, MIN_GAME_WIDTH), MAX_GAME_WIDTH)
  const h = Math.min(Math.max(window.innerHeight, MIN_GAME_HEIGHT), MAX_GAME_HEIGHT)
  return { width: w, height: h }
}

const size = computeGameSize()
export const GAME_WIDTH = size.width
export const GAME_HEIGHT = size.height

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      // DEBUG: shows arcade body bounding box (green outline). Turn off
      // before shipping; useful right now to verify the player body lines
      // up with the visual character.
      debug: true,
    },
  },
  input: {
    gamepad: true,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, PauseScene],
}

const game = new Phaser.Game(config)

// HMR safety: Phaser keeps a live canvas + WebGL context. If Vite hot-swaps
// a module without destroying the old game instance, the page either freezes
// or accumulates duplicate canvases. We force a full reload on any change in
// dev — slower than ideal HMR, but reliable for Phaser-shaped state.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true)
  })
  import.meta.hot.accept(() => {
    window.location.reload()
  })
}
