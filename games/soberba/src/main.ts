import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'

export const GAME_WIDTH = 480
export const GAME_HEIGHT = 800

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a1428',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.2 },
      debug: false,
    },
  },
  input: {
    gamepad: true,
  },
  scene: [BootScene, GameScene, GameOverScene],
}

const game = new Phaser.Game(config)

// HMR safety: destroy the old Phaser game instance and force a full reload
// on any module change. Phaser holds a live canvas + WebGL context that
// doesn't survive hot-swap cleanly.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true)
  })
  import.meta.hot.accept(() => {
    window.location.reload()
  })
}
