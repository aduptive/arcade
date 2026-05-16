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

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: {
    score?: number
    timeMs?: number
    points?: number
    bestCombo?: number
    mapId?: string
    characterId?: string
    startLevel?: number
  }) {
    const altura = data?.score ?? 0
    const pontos = data?.points ?? 0
    const bestCombo = data?.bestCombo ?? 0
    const timeMs = data?.timeMs ?? 0
    const finalScore = computeScore(altura, pontos, bestCombo)
    const qualifies = isHighScore(GAME_ID, finalScore) && finalScore > 0

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setOrigin(0)

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, 'CAIU', {
      fontFamily: 'Courier New, monospace',
      fontSize: '54px',
      color: '#ff6b35',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5)
    title.setShadow(2, 2, '#000', 4, true, true)

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 158, `SCORE  ${finalScore}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: qualifies ? '#ffd93d' : '#f5f5f5',
      fontStyle: 'bold',
    })
    subtitle.setOrigin(0.5)
    subtitle.setLetterSpacing(2)

    let rowY = GAME_HEIGHT / 2 - 110
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
    addRow('ALTURA', `${altura} m`)
    addRow('PONTOS', `${pontos}`, '#ffd700')
    if (bestCombo >= 2) addRow('MELHOR COMBO', `x${bestCombo}`, '#ff9a3c')
    addRow('TEMPO', formatTime(timeMs), '#c9a96b')

    if (qualifies) {
      this.handleHighScoreEntry(finalScore, altura, pontos, bestCombo, timeMs, data)
    }

    // Three-button bar: AGAIN replays same map/character, HOF opens leaderboard, MENU back to selection.
    const buttonsY = GAME_HEIGHT / 2 + 110

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
   * Saves a high score and prompts the player for their name. Uses the
   * browser's native prompt() — ugly but works on every device. v2 can swap
   * for a custom in-game name input.
   */
  private handleHighScoreEntry(
    score: number,
    altura: number,
    pontos: number,
    bestCombo: number,
    timeMs: number,
    data: { mapId?: string; characterId?: string }
  ) {
    const badge = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'NEW HIGH SCORE!', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffd93d',
      fontStyle: 'bold',
    })
    badge.setOrigin(0.5)
    badge.setLetterSpacing(3)

    // Defer the prompt one tick so the UI paints before the modal blocks.
    this.time.delayedCall(120, () => {
      const fallback = getLastName(GAME_ID, 'PLAYER')
      const input =
        typeof window !== 'undefined' && typeof window.prompt === 'function'
          ? window.prompt('NEW HIGH SCORE! Enter your name:', fallback)
          : fallback
      const name = (input ?? fallback).trim() || fallback
      setLastName(GAME_ID, name)
      saveEntry(GAME_ID, {
        name,
        score,
        altura,
        pontos,
        bestCombo,
        timeMs,
        mapId: data?.mapId ?? 'default',
        characterId: data?.characterId ?? 'default',
        dateIso: new Date().toISOString(),
      })
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

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
