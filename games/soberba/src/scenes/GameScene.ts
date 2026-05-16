import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { InputManager } from '@shared/input/InputManager'
import {
  BLOCK_SIZE,
  randomShape,
  renderPiece,
  spawnTetromino,
  type SpawnedPiece,
} from '../game/Tetromino'

const PLAY_FIELD_WIDTH = 10 * BLOCK_SIZE
const WALL_THICKNESS = 16
const SETTLE_VELOCITY = 0.4
const SETTLE_TIME_MS = 500
const MOVE_FORCE = 0.005
const HARD_DROP_VELOCITY = 18

const COLOR_GROUND = { r: 0xd4, g: 0xb8, b: 0x96 }
const COLOR_SKY = { r: 0x7e, g: 0xa8, b: 0xd4 }
const COLOR_NIGHT = { r: 0x0a, g: 0x14, b: 0x28 }
const COLOR_STONE_WALL = 0x5a4530
const COLOR_PARCHMENT = '#f5e6c4'
const COLOR_FADED_GOLD = '#c9a96b'

export class GameScene extends Phaser.Scene {
  private inputMgr!: InputManager
  private currentPiece: SpawnedPiece | null = null
  private pieces: SpawnedPiece[] = []
  private settleTimer = 0
  private playFieldX = 0

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.inputMgr = new InputManager(this)
    this.playFieldX = (GAME_WIDTH - PLAY_FIELD_WIDTH) / 2

    this.drawBackground()
    this.drawStars()
    this.buildWalls()
    this.drawHUD()
    this.spawnNext()
  }

  private drawBackground() {
    const g = this.add.graphics()
    const steps = 60
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      let r: number, gr: number, b: number
      if (t < 0.5) {
        const tt = t / 0.5
        r = Math.round(COLOR_NIGHT.r + (COLOR_SKY.r - COLOR_NIGHT.r) * tt)
        gr = Math.round(COLOR_NIGHT.g + (COLOR_SKY.g - COLOR_NIGHT.g) * tt)
        b = Math.round(COLOR_NIGHT.b + (COLOR_SKY.b - COLOR_NIGHT.b) * tt)
      } else {
        const tt = (t - 0.5) / 0.5
        r = Math.round(COLOR_SKY.r + (COLOR_GROUND.r - COLOR_SKY.r) * tt)
        gr = Math.round(COLOR_SKY.g + (COLOR_GROUND.g - COLOR_SKY.g) * tt)
        b = Math.round(COLOR_SKY.b + (COLOR_GROUND.b - COLOR_SKY.b) * tt)
      }
      const color = (r << 16) | (gr << 8) | b
      g.fillStyle(color, 1)
      g.fillRect(0, (GAME_HEIGHT * i) / steps, GAME_WIDTH, GAME_HEIGHT / steps + 1)
    }

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.18)
    overlay.fillRect(this.playFieldX, 0, PLAY_FIELD_WIDTH, GAME_HEIGHT)
  }

  private drawStars() {
    const stars = this.add.graphics()
    stars.fillStyle(0xfff4d6, 0.85)
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * GAME_WIDTH
      const sy = Math.random() * (GAME_HEIGHT * 0.4)
      const sr = Math.random() < 0.85 ? 1 : 2
      stars.fillCircle(sx, sy, sr)
    }
  }

  private buildWalls() {
    const M = this.matter
    const floorY = GAME_HEIGHT - WALL_THICKNESS / 2
    const leftX = this.playFieldX - WALL_THICKNESS / 2
    const rightX = this.playFieldX + PLAY_FIELD_WIDTH + WALL_THICKNESS / 2

    M.add.rectangle(GAME_WIDTH / 2, floorY, GAME_WIDTH, WALL_THICKNESS, { isStatic: true })
    M.add.rectangle(leftX, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, { isStatic: true })
    M.add.rectangle(rightX, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, { isStatic: true })

    const wallG = this.add.graphics()
    wallG.fillStyle(COLOR_STONE_WALL, 1)
    wallG.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS)
    wallG.fillRect(this.playFieldX - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT)
    wallG.fillRect(this.playFieldX + PLAY_FIELD_WIDTH, 0, WALL_THICKNESS, GAME_HEIGHT)
  }

  private drawHUD() {
    const title = this.add.text(GAME_WIDTH / 2, 20, 'SOBERBA', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '36px',
      color: COLOR_PARCHMENT,
      fontStyle: 'bold',
    })
    title.setOrigin(0.5, 0)
    title.setShadow(2, 2, '#000', 2, true, true)

    const tagline = this.add.text(GAME_WIDTH / 2, 64, 'O CÉU É PROIBIDO', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12px',
      color: COLOR_FADED_GOLD,
      fontStyle: 'italic',
    })
    tagline.setOrigin(0.5, 0)
    tagline.setLetterSpacing(3)
  }

  private spawnNext() {
    const shape = randomShape()
    const x = GAME_WIDTH / 2
    const y = 120
    this.currentPiece = spawnTetromino(this, shape, x, y)
    this.pieces.push(this.currentPiece)
  }

  update(_t: number, dt: number) {
    this.inputMgr.update()

    if (this.currentPiece) {
      const body = this.currentPiece.body
      const Body = this.matter.body

      if (this.inputMgr.isPressed('left')) {
        Body.applyForce(body, body.position, { x: -MOVE_FORCE, y: 0 })
      }
      if (this.inputMgr.isPressed('right')) {
        Body.applyForce(body, body.position, { x: MOVE_FORCE, y: 0 })
      }
      if (this.inputMgr.justPressed('up')) {
        Body.rotate(body, Math.PI / 2)
      }
      if (this.inputMgr.isPressed('down')) {
        Body.setVelocity(body, { x: body.velocity.x, y: Math.max(body.velocity.y, 6) })
      }
      if (this.inputMgr.justPressed('action')) {
        Body.setVelocity(body, { x: body.velocity.x, y: HARD_DROP_VELOCITY })
      }

      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      if (speed < SETTLE_VELOCITY && body.position.y > 180) {
        this.settleTimer += dt
        if (this.settleTimer > SETTLE_TIME_MS) {
          this.settleTimer = 0
          this.currentPiece = null
          this.spawnNext()
        }
      } else {
        this.settleTimer = 0
      }
    }

    for (const p of this.pieces) renderPiece(p)
  }
}
