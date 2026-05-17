import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { getLeaderboard, type LeaderboardEntry } from '@shared/score/leaderboard'
import { getMapById } from '../maps'
import { getCharacterById } from '../characters'

const GAME_ID = 'highrise'

const HEADER_BOTTOM_Y = 110
const FOOTER_TOP_Y_FROM_BOTTOM = 90 // space reserved for the back button
const ROW_H = 64
const ROW_PADDING_X = 18
const ROW_OUTER_PADDING = 14 // extra breathing room above the first row and below the last

/**
 * Local Hall of Fame screen. Reads the top-N leaderboard from localStorage
 * (via `@shared/score/leaderboard`) and renders the list inside a scrollable
 * column clipped by a mask. Mouse wheel and touch drag both scroll. Reached
 * from the main menu and the game over screen.
 */
export class HallOfFameScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container
  private minScrollY = 0
  private maxScrollY = 0
  private dragStartPointerY = 0
  private dragStartContainerY = 0
  private isDragging = false

  constructor() {
    super({ key: 'HallOfFameScene' })
  }

  create(data: { mapId?: string; characterId?: string }) {
    this.cameras.main.setBackgroundColor(0x0a0a14)

    const title = this.add.text(GAME_WIDTH / 2, 36, 'HALL OF FAME', {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffd93d',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5, 0)
    title.setShadow(2, 2, '#000', 0, true, true)
    title.setLetterSpacing(4)

    const subtitle = this.add.text(GAME_WIDTH / 2, 78, 'top 100 high scores (this device)', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#888888',
      fontStyle: 'italic',
    })
    subtitle.setOrigin(0.5, 0)

    const entries = getLeaderboard(GAME_ID).slice(0, 100)
    this.renderEntries(entries)

    // Back button at the bottom.
    const backBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 48)
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
    const visibleTopY = HEADER_BOTTOM_Y
    const visibleBottomY = GAME_HEIGHT - FOOTER_TOP_Y_FROM_BOTTOM
    const visibleHeight = visibleBottomY - visibleTopY

    if (entries.length === 0) {
      const empty = this.add.text(
        GAME_WIDTH / 2,
        visibleTopY + visibleHeight / 2,
        'No scores yet.\nClimb a run to get on the board.',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '16px',
          color: '#666666',
          align: 'center',
        }
      )
      empty.setOrigin(0.5)
      return
    }

    // Scrollable container. Children are positioned starting at y = ROW_OUTER_PADDING
    // so the first row breathes a little under the header.
    this.scrollContainer = this.add.container(0, visibleTopY)
    entries.forEach((entry, idx) => this.renderRow(this.scrollContainer, entry, idx))

    const totalContentHeight = entries.length * ROW_H + ROW_OUTER_PADDING * 2
    const overflow = Math.max(0, totalContentHeight - visibleHeight)
    this.maxScrollY = visibleTopY
    this.minScrollY = visibleTopY - overflow

    // Clip the column to the visible band so scrolled-off rows don't leak
    // over the header or back button.
    const maskShape = this.make.graphics({ x: 0, y: 0 })
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(0, visibleTopY, GAME_WIDTH, visibleHeight)
    const mask = maskShape.createGeometryMask()
    this.scrollContainer.setMask(mask)

    if (overflow > 0) {
      this.attachScrollHandlers(visibleTopY, visibleBottomY)
      // Small hint that the list is scrollable.
      const hint = this.add.text(GAME_WIDTH / 2, visibleBottomY - 4, '... scroll ...', {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: '#444444',
      })
      hint.setOrigin(0.5, 1)
    }
  }

  private renderRow(parent: Phaser.GameObjects.Container, entry: LeaderboardEntry, idx: number) {
    const rank = idx + 1
    const isPodium = rank <= 3
    const rankColor =
      rank === 1 ? '#ffd93d' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#888888'

    const rowY = ROW_OUTER_PADDING + idx * ROW_H + ROW_H / 2

    const bg = this.add.rectangle(
      GAME_WIDTH / 2,
      rowY,
      GAME_WIDTH - 28,
      ROW_H - 8,
      0x161623,
      idx % 2 === 0 ? 1 : 0.6
    )
    parent.add(bg)

    const rankTxt = this.add.text(ROW_PADDING_X, rowY, `${rank}.`, {
      fontFamily: 'Courier New, monospace',
      fontSize: isPodium ? '24px' : '18px',
      color: rankColor,
      fontStyle: 'bold',
    })
    rankTxt.setOrigin(0, 0.5)
    parent.add(rankTxt)

    const nameTxt = this.add.text(ROW_PADDING_X + 44, rowY - 8, entry.name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#f5f5f5',
      fontStyle: isPodium ? 'bold' : 'normal',
    })
    nameTxt.setOrigin(0, 0.5)
    parent.add(nameTxt)

    const map = getMapById(entry.mapId)
    const char = getCharacterById(entry.characterId)
    const meta = this.add.text(ROW_PADDING_X + 44, rowY + 14, `${map.name} · ${char.name}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#888888',
    })
    meta.setOrigin(0, 0.5)
    parent.add(meta)

    const scoreTxt = this.add.text(GAME_WIDTH - ROW_PADDING_X, rowY - 8, `${entry.score}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: isPodium ? '24px' : '20px',
      color: rankColor,
      fontStyle: 'bold',
    })
    scoreTxt.setOrigin(1, 0.5)
    parent.add(scoreTxt)

    const breakdown = this.add.text(
      GAME_WIDTH - ROW_PADDING_X,
      rowY + 14,
      `${entry.altura}m · lvl ${entry.level ?? 1} · x${entry.bestCombo}`,
      {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#888888',
      }
    )
    breakdown.setOrigin(1, 0.5)
    parent.add(breakdown)
  }

  /** Wire up mouse-wheel and pointer-drag scrolling within the visible band. */
  private attachScrollHandlers(visibleTopY: number, visibleBottomY: number) {
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      this.scrollBy(-dy * 0.6)
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < visibleTopY || pointer.y > visibleBottomY) return
      this.isDragging = true
      this.dragStartPointerY = pointer.y
      this.dragStartContainerY = this.scrollContainer.y
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !pointer.isDown) return
      const delta = pointer.y - this.dragStartPointerY
      this.setScrollY(this.dragStartContainerY + delta)
    })
    this.input.on('pointerup', () => {
      this.isDragging = false
    })
    this.input.on('pointerupoutside', () => {
      this.isDragging = false
    })
  }

  private scrollBy(delta: number) {
    this.setScrollY(this.scrollContainer.y + delta)
  }

  private setScrollY(y: number) {
    this.scrollContainer.y = Phaser.Math.Clamp(y, this.minScrollY, this.maxScrollY)
  }
}
