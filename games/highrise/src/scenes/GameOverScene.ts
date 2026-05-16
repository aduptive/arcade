import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: {
    score?: number
    timeMs?: number
    points?: number
    mapId?: string
    characterId?: string
    startLevel?: number
  }) {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0)

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, 'CAIU', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#ff6b35',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setShadow(2, 2, '#000', 4, true, true)

    const score = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 60,
      `ALTURA: ${data?.score ?? 0} m`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '24px',
        color: '#f5f5f5',
      }
    )
    score.setOrigin(0.5)

    const pts = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 25,
      `PONTOS: ${data?.points ?? 0}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#ffd700',
      }
    )
    pts.setOrigin(0.5)

    const time = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 10,
      `TEMPO: ${formatTime(data?.timeMs ?? 0)}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#c9a96b',
      }
    )
    time.setOrigin(0.5)

    // Two-button bottom bar: AGAIN replays the same map/character, MENU goes back to selection.
    const againBtn = this.makeButton(
      GAME_WIDTH / 2 - 100,
      GAME_HEIGHT / 2 + 90,
      'AGAIN',
      0xff6b35,
      0xa6391c,
      () => this.scene.start('GameScene', { mapId: data?.mapId, characterId: data?.characterId, startLevel: data?.startLevel })
    )
    const menuBtn = this.makeButton(
      GAME_WIDTH / 2 + 100,
      GAME_HEIGHT / 2 + 90,
      'MENU',
      0x4a4a4a,
      0x222222,
      () => this.scene.start('MenuScene', { mapId: data?.mapId, characterId: data?.characterId })
    )

    // Keyboard shortcuts
    this.input.keyboard?.once('keydown-ENTER', () => againBtn.emit('pointerdown'))
    this.input.keyboard?.once('keydown-SPACE', () => againBtn.emit('pointerdown'))
    this.input.keyboard?.once('keydown-ESC', () => menuBtn.emit('pointerdown'))
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const w = 160
    const h = 50
    const container = this.add.container(x, y)
    const bg = this.add.rectangle(0, 0, w, h, fill)
    bg.setStrokeStyle(2, stroke)
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    txt.setOrigin(0.5)
    txt.setLetterSpacing(2)
    container.add([bg, txt])
    container.setSize(w, h)
    container.setInteractive({ useHandCursor: true })
    container.on('pointerdown', onClick)
    container.on('pointerover', () => bg.setFillStyle(fill, 0.85))
    container.on('pointerout', () => bg.setFillStyle(fill, 1))
    return container
  }
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
