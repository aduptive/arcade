import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

export interface PauseSceneData {
  mapId?: string
  characterId?: string
  /** Current altitude (meters). */
  score?: number
  /** Accumulated pickup points. */
  points?: number
  /** Run time so far (ms). */
  timeMs?: number
  /** Current difficulty level (1-10). */
  level?: number
  /** Current super-jump charges available. */
  superCharges?: number
  /** Best combo achieved this run. */
  bestCombo?: number
}

/**
 * Overlay scene shown when the player pauses mid-run. Runs alongside a
 * paused GameScene (via `scene.launch` + `scene.pause`), dims the screen
 * with a near-black layer and shows a recap of the current run plus
 * resume/menu controls. The GameScene's camera is desaturated by
 * `openPause` so the underlying frame reads as a frozen black-and-white
 * snapshot behind the overlay.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' })
  }

  create(data: PauseSceneData) {
    // Dim the underlying (already grayscaled) game frame.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0)

    const cx = GAME_WIDTH / 2
    const titleY = GAME_HEIGHT * 0.18

    const title = this.add.text(cx, titleY, 'PAUSED', {
      fontFamily: 'Courier New, monospace',
      fontSize: '48px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setLetterSpacing(6)
    title.setShadow(2, 2, '#000', 4, true, true)

    // ---- Stats recap ----
    const statsTop = titleY + 80
    const lineHeight = 38
    const labelStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#bbbbbb',
    } as const
    const valueStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    } as const
    const colLabelX = cx - 80
    const colValueX = cx + 80

    const rows: Array<[string, string]> = [
      ['HEIGHT', `${data?.score ?? 0} m`],
      ['LEVEL', `${data?.level ?? 1}`],
      ['POINTS', `${data?.points ?? 0}`],
      ['TIME', formatTime(data?.timeMs ?? 0)],
      ['SUPER', `x${data?.superCharges ?? 0}`],
      ['BEST COMBO', `x${data?.bestCombo ?? 0}`],
    ]
    rows.forEach(([label, value], idx) => {
      const y = statsTop + idx * lineHeight
      const lbl = this.add.text(colLabelX, y, label, labelStyle)
      lbl.setOrigin(1, 0.5)
      lbl.setLetterSpacing(2)
      const val = this.add.text(colValueX, y, value, valueStyle)
      val.setOrigin(0, 0.5)
    })

    // ---- Action buttons ----
    const buttonsTop = statsTop + rows.length * lineHeight + 36

    this.makeButton(
      cx,
      buttonsTop,
      'RESUME',
      0xff6b35,
      0xa6391c,
      () => this.resumeGame()
    )

    this.makeButton(
      cx,
      buttonsTop + 76,
      'MENU',
      0x4a4a4a,
      0x222222,
      () => this.goToMenu(data)
    )

    const hint = this.add.text(
      cx,
      buttonsTop + 145,
      '[ ESC / SPACE = RESUME, M = MENU ]',
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#888888',
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
    // Drop the grayscale on GameScene before we leave, in case the user
    // comes back to this map immediately and we don't want a stale FX.
    const gameScene = this.scene.get('GameScene')
    gameScene?.cameras?.main?.postFX?.clear()
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
    const h = 52
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

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
