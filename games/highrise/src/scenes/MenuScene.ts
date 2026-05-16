import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { ALL_MAPS, DEFAULT_MAP_ID, getMapById } from '../maps'
import { ALL_CHARACTERS, DEFAULT_CHARACTER_ID, getCharacterById } from '../characters'

const STORAGE_MAP_KEY = 'highrise.lastMapId'
const STORAGE_CHAR_KEY = 'highrise.lastCharacterId'

function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSaved(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silently ignore — quota exceeded, private mode, etc.
  }
}

/**
 * Map + character selection screen. Vector-only for v1, no images required.
 *
 * Layout (top to bottom):
 *   - Game title
 *   - "MAP" label + horizontal row of map cards
 *   - Selected map's tagline
 *   - "CHARACTER" label + horizontal row of character cards
 *   - PLAY button (full width)
 *
 * Selection persists for the session via small instance state. Future:
 * persist to localStorage so the user's last choice is the default.
 */
export class MenuScene extends Phaser.Scene {
  private selectedMapId = DEFAULT_MAP_ID
  private selectedCharacterId = DEFAULT_CHARACTER_ID
  private mapCardElements: Array<{ id: string; container: Phaser.GameObjects.Container; outline: Phaser.GameObjects.Rectangle }> = []
  private characterCardElements: Array<{ id: string; container: Phaser.GameObjects.Container; outline: Phaser.GameObjects.Rectangle }> = []
  private taglineText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'MenuScene' })
  }

  init(data: { mapId?: string; characterId?: string }) {
    // Selection priority: explicit data (e.g. returning from a run) > localStorage > defaults
    const savedMap = readSaved(STORAGE_MAP_KEY)
    const savedChar = readSaved(STORAGE_CHAR_KEY)
    this.selectedMapId = data?.mapId ?? (savedMap && getMapById(savedMap).id === savedMap ? savedMap : DEFAULT_MAP_ID)
    this.selectedCharacterId =
      data?.characterId ??
      (savedChar && getCharacterById(savedChar).id === savedChar ? savedChar : DEFAULT_CHARACTER_ID)
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0a14)

    // Game title
    const title = this.add.text(GAME_WIDTH / 2, 40, 'HIGHRISE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '40px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    title.setOrigin(0.5, 0)
    title.setShadow(2, 2, '#000', 0, true, true)
    title.setLetterSpacing(4)

    const subtitle = this.add.text(GAME_WIDTH / 2, 85, 'climb. forever.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#c9a96b',
      fontStyle: 'italic',
    })
    subtitle.setOrigin(0.5, 0)
    subtitle.setLetterSpacing(2)

    // ---- MAP section ----
    this.add
      .text(GAME_WIDTH / 2, 130, 'MAP', {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setLetterSpacing(3)

    this.renderMapCards(165)

    this.taglineText = this.add.text(GAME_WIDTH / 2, 250, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#c9a96b',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 80 },
    })
    this.taglineText.setOrigin(0.5, 0)
    this.updateTagline()

    // ---- CHARACTER section ----
    this.add
      .text(GAME_WIDTH / 2, 320, 'CHARACTER', {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setLetterSpacing(3)

    this.renderCharacterCards(360)

    // ---- PLAY button ----
    this.renderPlayButton()

    // Keyboard shortcut
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame())
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame())
  }

  private renderMapCards(yTop: number) {
    const cardSize = 70
    const gap = 14
    const totalWidth = ALL_MAPS.length * cardSize + (ALL_MAPS.length - 1) * gap
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardSize / 2

    ALL_MAPS.forEach((map, idx) => {
      const x = startX + idx * (cardSize + gap)
      const y = yTop + cardSize / 2
      const container = this.add.container(x, y)

      // Card "preview" — a small painted swatch of the map's background colors.
      // We can't easily run paintBackground at small scale, so we just show the
      // bgColor with a name label. Future: render a thumbnail.
      const swatch = this.add.rectangle(0, 0, cardSize, cardSize, map.backgroundColor)
      const outline = this.add.rectangle(0, 0, cardSize + 6, cardSize + 6)
      outline.setStrokeStyle(3, 0xffd93d, 0)
      const label = this.add.text(0, cardSize / 2 + 10, map.name.toUpperCase(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#dddddd',
        align: 'center',
      })
      label.setOrigin(0.5, 0)

      container.add([outline, swatch, label])
      container.setSize(cardSize + 6, cardSize + 28)
      container.setInteractive({ useHandCursor: true })
      container.on('pointerdown', () => {
        this.selectedMapId = map.id
        this.updateMapSelection()
        this.updateTagline()
      })

      this.mapCardElements.push({ id: map.id, container, outline })
    })

    this.updateMapSelection()
  }

  private renderCharacterCards(yTop: number) {
    const cardSize = 60
    const gap = 14
    const totalWidth = ALL_CHARACTERS.length * cardSize + (ALL_CHARACTERS.length - 1) * gap
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardSize / 2

    ALL_CHARACTERS.forEach((char, idx) => {
      const x = startX + idx * (cardSize + gap)
      const y = yTop + cardSize / 2
      const container = this.add.container(x, y)

      // Live preview via paintCharacter at a smaller size.
      // We do paint to a relative position 0,0 of the container by computing
      // world coords and using setPosition trick: paintCharacter wants absolute
      // scene coords. We add the visual then move it into the container.
      const visual = char.paintCharacter({ scene: this, x: 0, y: 0, size: cardSize - 16 })
      const visualWorld = visual as Phaser.GameObjects.Rectangle
      // Move the visual into the container so it scrolls / lives with the card.
      // paintCharacter added it to the scene root; remove and add to container.
      this.children.remove(visualWorld, false)
      container.add(visualWorld)

      const outline = this.add.rectangle(0, 0, cardSize + 6, cardSize + 6)
      outline.setStrokeStyle(3, 0xffd93d, 0)
      container.add(outline)

      const label = this.add.text(0, cardSize / 2 + 8, char.name.toUpperCase(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#dddddd',
        align: 'center',
      })
      label.setOrigin(0.5, 0)
      container.add(label)

      container.setSize(cardSize + 6, cardSize + 24)
      container.setInteractive({ useHandCursor: true })
      container.on('pointerdown', () => {
        this.selectedCharacterId = char.id
        this.updateCharacterSelection()
      })

      this.characterCardElements.push({ id: char.id, container, outline })
    })

    this.updateCharacterSelection()
  }

  private renderPlayButton() {
    const btnW = GAME_WIDTH - 80
    const btnH = 56
    const btnY = GAME_HEIGHT - 70
    const container = this.add.container(GAME_WIDTH / 2, btnY)

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0xff6b35)
    bg.setStrokeStyle(3, 0xa6391c)
    const label = this.add.text(0, 0, 'PLAY  >', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    label.setOrigin(0.5)
    label.setShadow(1, 1, '#000', 0, true, true)
    label.setLetterSpacing(3)

    container.add([bg, label])
    container.setSize(btnW, btnH)
    container.setInteractive({ useHandCursor: true })
    container.on('pointerover', () => {
      bg.setFillStyle(0xff8552)
    })
    container.on('pointerout', () => {
      bg.setFillStyle(0xff6b35)
    })
    container.on('pointerdown', () => this.startGame())
  }

  private updateMapSelection() {
    for (const el of this.mapCardElements) {
      el.outline.setStrokeStyle(3, 0xffd93d, el.id === this.selectedMapId ? 1 : 0)
    }
  }

  private updateCharacterSelection() {
    for (const el of this.characterCardElements) {
      el.outline.setStrokeStyle(3, 0xffd93d, el.id === this.selectedCharacterId ? 1 : 0)
    }
  }

  private updateTagline() {
    const map = ALL_MAPS.find((m) => m.id === this.selectedMapId) ?? ALL_MAPS[0]
    this.taglineText.setText(`"${map.tagline}"`)
  }

  private startGame() {
    writeSaved(STORAGE_MAP_KEY, this.selectedMapId)
    writeSaved(STORAGE_CHAR_KEY, this.selectedCharacterId)
    this.scene.start('GameScene', {
      mapId: this.selectedMapId,
      characterId: this.selectedCharacterId,
    })
  }
}
