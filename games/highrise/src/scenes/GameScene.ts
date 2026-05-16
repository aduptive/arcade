import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { InputManager } from '@shared/input/InputManager'

const PLATFORM_WIDTH = 96
const PLATFORM_HEIGHT = 16
const PLAYER_SIZE = 28
const JUMP_VELOCITY = -780
const MOVE_SPEED = 320
const PLATFORM_VERTICAL_GAP = 110

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

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.startY = GAME_HEIGHT - 150
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
    this.addPlatform(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH)
    for (let y = GAME_HEIGHT - 180; y > -2000; y -= PLATFORM_VERTICAL_GAP) {
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 10, GAME_WIDTH - PLATFORM_WIDTH / 2 - 10)
      this.addPlatform(x, y)
      this.highestPlatformY = y
    }
  }

  private addPlatform(x: number, y: number, width = PLATFORM_WIDTH) {
    const plat = this.add.rectangle(x, y, width, PLATFORM_HEIGHT, 0x6fb04a)
    plat.setStrokeStyle(2, 0x3d6d28)
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

    // platforms são "one-way": só colidem quando o player está caindo
    this.physics.add.collider(this.player, this.platforms, undefined, () => {
      return this.playerBody.velocity.y > 0
    })
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
  }

  update() {
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

    // câmera só sobe (nunca desce)
    const cam = this.cameras.main
    const targetY = this.player.y - GAME_HEIGHT * 0.6
    if (targetY < cam.scrollY) cam.scrollY = targetY

    // score = quão alto chegou
    if (this.player.y < this.highestPlayerY) {
      this.highestPlayerY = this.player.y
      this.score = Math.floor((this.startY - this.highestPlayerY) / 32)
      this.scoreText.setText(`ALTURA: ${Math.max(0, this.score)}m`)
    }

    // spawnar mais plataformas acima conforme sobe
    while (this.highestPlatformY > cam.scrollY - 200) {
      this.highestPlatformY -= PLATFORM_VERTICAL_GAP
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 10, GAME_WIDTH - PLATFORM_WIDTH / 2 - 10)
      this.addPlatform(x, this.highestPlatformY)
    }

    // game over: caiu pra fora da tela
    if (this.player.y > cam.scrollY + GAME_HEIGHT + 100) {
      this.scene.start('GameOverScene', { score: Math.max(0, this.score) })
    }
  }
}
