import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { InputManager } from '@shared/input/InputManager'

const PLATFORM_WIDTH = 96
const PLATFORM_HEIGHT = 16
const PLAYER_SIZE = 28
const JUMP_VELOCITY = -780
const MOVE_SPEED = 320
const PLATFORM_VERTICAL_GAP = 110

// Phase 1: pressão do auto-scroll. Vai escalar por nível na Phase 2.
const AUTO_SCROLL_SPEED = 30 // px/segundo
const DEATH_ZONE_PADDING = 30 // distância abaixo da câmera = morte

export class GameScene extends Phaser.Scene {
  private inputMgr!: InputManager
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private highestPlatformY = 0
  private highestPlayerY = 0
  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  private stars!: Phaser.GameObjects.Graphics
  private startY = 0
  private autoScrollActive = false
  private runStartTime = 0 // ms — preenchido quando auto-scroll dispara
  private elapsedMs = 0
  private timeText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.startY = GAME_HEIGHT - 150
    this.autoScrollActive = false
    this.runStartTime = 0
    this.elapsedMs = 0
    this.inputMgr = new InputManager(this)
    this.cameras.main.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 1000000)

    this.drawBackground()
    this.platforms = this.physics.add.staticGroup()
    this.spawnInitialPlatforms()
    this.createPlayer()
    this.drawHUD()
  }

  private drawBackground() {
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e)
    bg.setScrollFactor(0)

    this.stars = this.add.graphics()
    this.stars.fillStyle(0xffffff, 0.7)
    for (let i = 0; i < 80; i++) {
      this.stars.fillCircle(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        Math.random() < 0.85 ? 1 : 2
      )
    }
    this.stars.setScrollFactor(0.3)
  }

  private spawnInitialPlatforms() {
    this.addPlatform(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH, true) // chão inicial
    for (let y = GAME_HEIGHT - 180; y > -2000; y -= PLATFORM_VERTICAL_GAP) {
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 10, GAME_WIDTH - PLATFORM_WIDTH / 2 - 10)
      this.addPlatform(x, y)
      this.highestPlatformY = y
    }
  }

  private addPlatform(x: number, y: number, width = PLATFORM_WIDTH, isFloor = false) {
    const plat = this.add.rectangle(x, y, width, PLATFORM_HEIGHT, 0x6fb04a)
    plat.setStrokeStyle(2, 0x3d6d28)
    if (isFloor) plat.setData('isFloor', true)
    this.platforms.add(plat)
    const body = (plat as any).body as Phaser.Physics.Arcade.StaticBody
    body.setSize(width, PLATFORM_HEIGHT)
    body.updateFromGameObject()
    return plat
  }

  private createPlayer() {
    this.player = this.add.rectangle(GAME_WIDTH / 2, this.startY, PLAYER_SIZE, PLAYER_SIZE, 0xff6b35)
    this.player.setStrokeStyle(2, 0xa6391c)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(false)
    this.highestPlayerY = this.player.y

    // platforms são "one-way": só colidem quando o player está caindo.
    // No primeiro pouso em step não-floor, dispara o auto-scroll e o timer.
    this.physics.add.collider(
      this.player,
      this.platforms,
      (_p, platform) => {
        if (this.autoScrollActive) return
        const obj = platform as Phaser.GameObjects.GameObject
        if (!obj.getData('isFloor')) {
          this.autoScrollActive = true
          this.runStartTime = this.time.now
        }
      },
      () => this.playerBody.velocity.y > 0
    )
  }

  private drawHUD() {
    this.scoreText = this.add.text(20, 20, 'ALTURA: 0m', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    this.scoreText.setScrollFactor(0)
    this.scoreText.setShadow(2, 2, '#000', 0, true, true)

    this.timeText = this.add.text(GAME_WIDTH - 20, 20, 'TEMPO: 0:00', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#f5f5f5',
      fontStyle: 'bold',
    })
    this.timeText.setOrigin(1, 0)
    this.timeText.setScrollFactor(0)
    this.timeText.setShadow(2, 2, '#000', 0, true, true)
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  update(_t: number, dt: number) {
    this.inputMgr.update()

    if (this.inputMgr.isPressed('left')) this.playerBody.setVelocityX(-MOVE_SPEED)
    else if (this.inputMgr.isPressed('right')) this.playerBody.setVelocityX(MOVE_SPEED)
    else this.playerBody.setVelocityX(0)

    const wantsJump = this.inputMgr.justPressed('up') || this.inputMgr.justPressed('action')
    if (wantsJump && this.playerBody.blocked.down) {
      this.playerBody.setVelocityY(JUMP_VELOCITY)
    }

    // screen wrap horizontal
    if (this.player.x < -PLAYER_SIZE / 2) this.player.x = GAME_WIDTH + PLAYER_SIZE / 2
    if (this.player.x > GAME_WIDTH + PLAYER_SIZE / 2) this.player.x = -PLAYER_SIZE / 2

    // Trigger do auto-scroll vem do collider (primeiro pouso em step não-floor).
    if (this.runStartTime > 0) {
      this.elapsedMs = this.time.now - this.runStartTime
      this.timeText.setText(`TEMPO: ${this.formatTime(this.elapsedMs)}`)
    }

    // ---- Câmera: auto-scroll híbrido ----
    // (1) sempre sobe num ritmo mínimo (pressão do nível) — após o primeiro step
    // (2) também segue o player pra cima se ele estiver subindo mais rápido
    // Câmera nunca desce.
    const cam = this.cameras.main
    const dtSec = Math.min(dt, 100) / 1000 // cap pra evitar pulo gigante em tab switch
    const playerTarget = this.player.y - GAME_HEIGHT * 0.6
    if (this.autoScrollActive) {
      const autoScrollTarget = cam.scrollY - AUTO_SCROLL_SPEED * dtSec
      cam.scrollY = Math.min(cam.scrollY, playerTarget, autoScrollTarget)
    } else {
      cam.scrollY = Math.min(cam.scrollY, playerTarget)
    }

    // score = quão alto chegou
    if (this.player.y < this.highestPlayerY) {
      this.highestPlayerY = this.player.y
      this.score = Math.floor((this.startY - this.highestPlayerY) / 32)
      this.scoreText.setText(`ALTURA: ${Math.max(0, this.score)}m`)
    }

    // spawnar mais steps acima conforme sobe
    while (this.highestPlatformY > cam.scrollY - 200) {
      this.highestPlatformY -= PLATFORM_VERTICAL_GAP
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 10, GAME_WIDTH - PLATFORM_WIDTH / 2 - 10)
      this.addPlatform(x, this.highestPlatformY)
    }

    // ---- Game over ----
    // Player caiu fora da tela OU foi engolido pelo auto-scroll por baixo.
    if (this.player.y > cam.scrollY + GAME_HEIGHT + DEATH_ZONE_PADDING) {
      this.scene.start('GameOverScene', {
        score: Math.max(0, this.score),
        timeMs: this.elapsedMs,
      })
    }
  }
}
