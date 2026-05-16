import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: { score?: number; timeMs?: number }) {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0)

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'CAIU', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#ff6b35',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setShadow(2, 2, '#000', 4, true, true)

    const score = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 10,
      `ALTURA: ${data?.score ?? 0} m`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '24px',
        color: '#f5f5f5',
      }
    )
    score.setOrigin(0.5)

    const time = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 25,
      `TEMPO: ${formatTime(data?.timeMs ?? 0)}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#c9a96b',
      }
    )
    time.setOrigin(0.5)

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '[ TOQUE OU TECLA PRA SUBIR DE NOVO ]', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#aaaaaa',
    })
    hint.setOrigin(0.5)

    this.input.keyboard?.once('keydown', () => this.scene.start('GameScene'))
    this.input.once('pointerdown', () => this.scene.start('GameScene'))
  }
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
