import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { getLeaderboard, type LeaderboardEntry } from '@shared/score/leaderboard'
import { getMapById } from '../maps'
import { getCharacterById } from '../characters'

const GAME_ID = 'highrise'

/**
 * Local Hall of Fame screen. Reads the top-10 leaderboard from localStorage
 * (via `@shared/score/leaderboard`) and renders it as a ranked list. Reached
 * from the main menu and from the game-over screen. Pure read-only display
 * — entries are saved on game over, not here.
 */
export class HallOfFameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HallOfFameScene' })
  }

  create(data: { mapId?: string; characterId?: string }) {
    this.cameras.main.setBackgroundColor(0x0a0a14)

    const title = this.add.text(GAME_WIDTH / 2, 40, 'HALL OF FAME', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffd93d',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5, 0)
    title.setShadow(2, 2, '#000', 0, true, true)
    title.setLetterSpacing(4)

    const subtitle = this.add.text(GAME_WIDTH / 2, 80, 'top 10 high scores (this device)', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#888888',
      fontStyle: 'italic',
    })
    subtitle.setOrigin(0.5, 0)

    const entries = getLeaderboard(GAME_ID)
    this.renderEntries(entries)

    // Back button at the bottom.
    const backBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 50)
    const backBg = this.add.rectangle(0, 0, 200, 50, 0x4a4a4a)
    backBg.setStrokeStyle(2, 0x222222)
    const backTxt = this.add.text(0, 0, 'BACK', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    backTxt.setOrigin(0.5)
    backTxt.setLetterSpacing(3)
    backBtn.add([backBg, backTxt])
    backBtn.setSize(200, 50)
    backBtn.setInteractive({ useHandCursor: true })
    backBtn.on('pointerover', () => backBg.setFillStyle(0x666666))
    backBtn.on('pointerout', () => backBg.setFillStyle(0x4a4a4a))
    backBtn.on('pointerdown', () => this.goBack(data))

    this.input.keyboard?.once('keydown-ESC', () => this.goBack(data))
    this.input.keyboard?.once('keydown-BACKSPACE', () => this.goBack(data))
  }

  private goBack(data: { mapId?: string; characterId?: string }) {
    this.scene.start('MenuScene', {
      mapId: data?.mapId,
      characterId: data?.characterId,
    })
  }

  private renderEntries(entries: LeaderboardEntry[]) {
    const top = 130
    const rowH = 36

    if (entries.length === 0) {
      const empty = this.add.text(GAME_WIDTH / 2, top + 80, 'No scores yet.\nClimb a run to get on the board.', {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#666666',
        align: 'center',
      })
      empty.setOrigin(0.5)
      return
    }

    // Column header
    const headerY = top - 8
    this.add
      .text(28, headerY, '#  NAME', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#666666',
      })
      .setLetterSpacing(2)
    this.add
      .text(GAME_WIDTH - 28, headerY, 'SCORE', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#666666',
      })
      .setOrigin(1, 0)
      .setLetterSpacing(2)

    entries.forEach((entry, idx) => {
      const y = top + 8 + idx * rowH
      const rank = idx + 1
      const isPodium = rank <= 3
      const rankColor = rank === 1 ? '#ffd93d' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#888888'

      const bg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 24, rowH - 4, 0x161623, idx % 2 === 0 ? 1 : 0.6)
      void bg

      const rankTxt = this.add.text(28, y, `${rank}.`, {
        fontFamily: 'Courier New, monospace',
        fontSize: isPodium ? '18px' : '14px',
        color: rankColor,
        fontStyle: 'bold',
      })
      rankTxt.setOrigin(0, 0.5)

      const nameTxt = this.add.text(58, y, entry.name, {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#f5f5f5',
        fontStyle: isPodium ? 'bold' : 'normal',
      })
      nameTxt.setOrigin(0, 0.5)

      // Tiny meta line (map + character) below the name, small grey.
      const map = getMapById(entry.mapId)
      const char = getCharacterById(entry.characterId)
      const meta = this.add.text(58, y + 12, `${map.name} · ${char.name}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: '#666666',
      })
      meta.setOrigin(0, 0.5)

      const scoreTxt = this.add.text(GAME_WIDTH - 28, y - 2, `${entry.score}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: isPodium ? '20px' : '16px',
        color: rankColor,
        fontStyle: 'bold',
      })
      scoreTxt.setOrigin(1, 0.5)

      const breakdown = this.add.text(GAME_WIDTH - 28, y + 12, `${entry.altura}m · x${entry.bestCombo}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: '#666666',
      })
      breakdown.setOrigin(1, 0.5)
    })
  }
}
