import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: { score?: number }) {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0)

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, 'COLAPSO', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '52px',
      color: '#c4503a',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setShadow(2, 2, '#000', 4, true, true)

    const score = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `ALTURA: ${data?.score ?? 0} m`,
      {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: '#f5e6c4',
      }
    )
    score.setOrigin(0.5)

    const epitaph = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 40,
      '"e a torre desabou sob o próprio peso"',
      {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '13px',
        color: '#c9a96b',
        fontStyle: 'italic',
      }
    )
    epitaph.setOrigin(0.5)

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '[ TOQUE OU TECLA PRA RECOMEÇAR ]', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12px',
      color: '#a89576',
    })
    hint.setOrigin(0.5)

    this.input.keyboard?.once('keydown', () => this.scene.start('GameScene'))
    this.input.once('pointerdown', () => this.scene.start('GameScene'))
  }
}
