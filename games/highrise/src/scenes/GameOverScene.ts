import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import {
  computeScore,
  getLastName,
  isHighScore,
  saveEntry,
  setLastName,
} from '@shared/score/leaderboard'

const GAME_ID = 'highrise'

interface GameOverData {
  score?: number
  timeMs?: number
  points?: number
  bestCombo?: number
  level?: number
  mapId?: string
  characterId?: string
  startLevel?: number
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: GameOverData) {
    const altura = data?.score ?? 0
    const pontos = data?.points ?? 0
    const bestCombo = data?.bestCombo ?? 0
    const level = data?.level ?? 1
    const timeMs = data?.timeMs ?? 0
    const finalScore = computeScore(altura, pontos, bestCombo)
    const qualifies = isHighScore(GAME_ID, finalScore) && finalScore > 0

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setOrigin(0)

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, 'GAME OVER', {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
      color: '#ff6b35',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setLetterSpacing(4)
    title.setShadow(2, 2, '#000', 4, true, true)

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 152, `SCORE  ${finalScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: qualifies ? '#ffd93d' : '#f5f5f5',
      fontStyle: 'bold',
    })
    subtitle.setOrigin(0.5)
    subtitle.setLetterSpacing(2)

    let rowY = GAME_HEIGHT / 2 - 105
    const lineHeight = 28
    const addRow = (label: string, value: string, color = '#f5f5f5') => {
      const t = this.add.text(GAME_WIDTH / 2, rowY, `${label}: ${value}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color,
      })
      t.setOrigin(0.5)
      rowY += lineHeight
    }
    addRow('HEIGHT', `${altura} m`)
    addRow('LEVEL', `${level}`, '#c9a96b')
    addRow('POINTS', `${pontos}`, '#ffd700')
    if (bestCombo >= 2) addRow('BEST COMBO', `x${bestCombo}`, '#ff9a3c')
    addRow('TIME', formatTime(timeMs), '#a0a0a0')

    if (qualifies) {
      this.handleHighScoreEntry({
        score: finalScore,
        altura,
        pontos,
        bestCombo,
        level,
        timeMs,
        mapId: data?.mapId ?? 'default',
        characterId: data?.characterId ?? 'default',
      })
    }

    // Three-button bar: AGAIN replays the same map/character, HOF opens
    // the leaderboard, MENU goes back to selection.
    const buttonsY = GAME_HEIGHT / 2 + 120

    const againBtn = this.makeButton(GAME_WIDTH / 2 - 110, buttonsY, 'AGAIN', 0xff6b35, 0xa6391c, () =>
      this.scene.start('GameScene', {
        mapId: data?.mapId,
        characterId: data?.characterId,
        startLevel: data?.startLevel,
      })
    )
    this.makeButton(GAME_WIDTH / 2, buttonsY, 'HOF', 0xffd93d, 0xa68800, () =>
      this.scene.start('HallOfFameScene', { mapId: data?.mapId, characterId: data?.characterId })
    )
    const menuBtn = this.makeButton(GAME_WIDTH / 2 + 110, buttonsY, 'MENU', 0x4a4a4a, 0x222222, () =>
      this.scene.start('MenuScene', { mapId: data?.mapId, characterId: data?.characterId })
    )

    this.input.keyboard?.once('keydown-ENTER', () => againBtn.emit('pointerdown'))
    this.input.keyboard?.once('keydown-SPACE', () => againBtn.emit('pointerdown'))
    this.input.keyboard?.once('keydown-ESC', () => menuBtn.emit('pointerdown'))
  }

  /**
   * Opens an HTML <dialog> name-entry modal layered over the Phaser canvas.
   * Native modal gives us focus management, ESC-to-close and works with
   * mobile virtual keyboards out of the box (unlike rolling our own Phaser
   * keyboard input).
   */
  private handleHighScoreEntry(payload: {
    score: number
    altura: number
    pontos: number
    bestCombo: number
    level: number
    timeMs: number
    mapId: string
    characterId: string
  }) {
    const badge = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'NEW HIGH SCORE!', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'bold',
    })
    badge.setOrigin(0.5)
    badge.setLetterSpacing(3)

    if (typeof document === 'undefined') {
      // SSR / non-browser safety net.
      saveEntry(GAME_ID, makeEntry('PLAYER', payload))
      return
    }

    // Defer a tick so the underlying GameOver UI paints first.
    this.time.delayedCall(80, () => this.openNameDialog(payload))
  }

  private openNameDialog(payload: {
    score: number
    altura: number
    pontos: number
    bestCombo: number
    level: number
    timeMs: number
    mapId: string
    characterId: string
  }) {
    const previousName = getLastName(GAME_ID, 'PLAYER')
    const dialog = document.createElement('dialog')
    dialog.className = 'hs-dialog'
    dialog.innerHTML = `
      <h2>NEW HIGH SCORE!</h2>
      <p class="hs-score">${payload.score} pts &nbsp;&middot;&nbsp; ${payload.altura} m &nbsp;&middot;&nbsp; lvl ${payload.level}</p>
      <label for="hs-name-input">YOUR NAME</label>
      <input id="hs-name-input" type="text" maxlength="16" autocomplete="off" />
      <div class="hs-buttons">
        <button type="button" class="secondary" data-action="skip">SKIP</button>
        <button type="button" class="primary" data-action="save">SAVE</button>
      </div>
    `
    document.body.appendChild(dialog)
    const input = dialog.querySelector<HTMLInputElement>('#hs-name-input')!
    input.value = previousName
    const saveBtn = dialog.querySelector<HTMLButtonElement>('button[data-action="save"]')!
    const skipBtn = dialog.querySelector<HTMLButtonElement>('button[data-action="skip"]')!

    const cleanup = () => {
      try {
        dialog.close()
      } catch {
        // already closed
      }
      dialog.remove()
    }

    const save = () => {
      const name = (input.value || previousName).trim() || 'PLAYER'
      setLastName(GAME_ID, name)
      saveEntry(GAME_ID, makeEntry(name, payload))
      cleanup()
    }

    saveBtn.addEventListener('click', save)
    skipBtn.addEventListener('click', () => {
      saveEntry(GAME_ID, makeEntry(previousName, payload))
      cleanup()
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        save()
      }
    })
    dialog.addEventListener('cancel', (e) => {
      // ESC closes the dialog — treat as skip (still saves with previous name).
      e.preventDefault()
      saveEntry(GAME_ID, makeEntry(previousName, payload))
      cleanup()
    })

    dialog.showModal()
    // Select the existing text so the player can just type a new name.
    requestAnimationFrame(() => {
      input.focus()
      input.select()
    })
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    stroke: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const w = 100
    const h = 46
    const container = this.add.container(x, y)
    const bg = this.add.rectangle(0, 0, w, h, fill)
    bg.setStrokeStyle(2, stroke)
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
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

function makeEntry(
  name: string,
  payload: {
    score: number
    altura: number
    pontos: number
    bestCombo: number
    level: number
    timeMs: number
    mapId: string
    characterId: string
  }
) {
  return {
    name,
    score: payload.score,
    altura: payload.altura,
    pontos: payload.pontos,
    bestCombo: payload.bestCombo,
    level: payload.level,
    timeMs: payload.timeMs,
    mapId: payload.mapId,
    characterId: payload.characterId,
    dateIso: new Date().toISOString(),
  }
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
