import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

export interface PauseSceneData {
  mapId?: string
  characterId?: string
}

/**
 * Overlay scene shown when the player pauses mid-run. Runs alongside a
 * paused GameScene (via `scene.launch` + `scene.pause`), dims the screen
 * and exposes Resume / Menu controls. Keyboard shortcuts: ESC or SPACE
 * resumes, M goes to the menu.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' })
  }

  create(data: PauseSceneData) {
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
    dim.setOrigin(0)

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'PAUSED', {
      fontFamily: 'Courier New, monospace',
      fontSize: '52px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setLetterSpacing(4)
    title.setShadow(2, 2, '#000', 4, true, true)

    this.makeButton(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 10,
      'RESUME',
      0xff6b35,
      0xa6391c,
      () => this.resumeGame()
    )

    this.makeButton(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 70,
      'MENU',
      0x4a4a4a,
      0x222222,
      () => this.goToMenu(data)
    )

    const hint = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 145,
      '[ ESC / SPACE = RESUME, M = MENU ]',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#999999',
      }
    )
    hint.setOrigin(0.5)

    this.input.keyboard?.once('keydown-ESC', () => this.resumeGame())
    this.input.keyboard?.once('keydown-SPACE', () => this.resumeGame())
    this.input.keyboard?.once('keydown-M', () => this.goToMenu(data))
  }

  private resumeGame() {
    this.scene.resume('GameScene')
    this.scene.stop()
  }

  private goToMenu(data: PauseSceneData) {
    this.scene.stop('GameScene')
    this.scene.start('MenuScene', {
      mapId: data?.mapId,
      characterId: data?.characterId,
    })
  }

  private makeButton(
    cx: number,
    cy: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void
  ) {
    const w = 200
    const h = 56
    const bg = this.add.rectangle(cx, cy, w, h, fill)
    bg.setStrokeStyle(3, stroke)
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => bg.setFillStyle(fill, 0.85))
    bg.on('pointerout', () => bg.setFillStyle(fill, 1))
    bg.on('pointerdown', onClick)

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    txt.setOrigin(0.5)
    txt.setLetterSpacing(3)
  }
}
