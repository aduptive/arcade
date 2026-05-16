import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { InputManager } from '@shared/input/InputManager'

const PLATFORM_HEIGHT = 16
const PLAYER_SIZE = 28
const JUMP_VELOCITY = -780
const MOVE_SPEED = 320
const AIR_ACCEL = 4000 // px/s² — quão rápido você consegue mudar direção no ar
const DEATH_ZONE_PADDING = 30

// Super jump (Phase 3 — cooldown-based)
const SUPER_JUMP_MULTIPLIER = 1.5 // velocidade do pulo, resulta em ~2.25× a altura
const SUPER_JUMP_CHARGE_INTERVAL_MS = 60_000 // 1 carga por minuto
const SUPER_JUMP_MAX_CHARGES = 3

// Phase 2: curva de dificuldade. Tudo deriva da altura atual.
const HEIGHT_FOR_MAX_DIFFICULTY = 500 // m em que tudo está no máximo
const METERS_PER_LEVEL = 50 // de quanto em quanto incrementa o "nível" do HUD
const MAX_LEVEL = 10

interface LevelConfig {
  level: number
  stepWidth: number
  verticalGap: number
  scrollSpeed: number
}

function getLevelConfig(heightM: number): LevelConfig {
  const t = Math.min(1, Math.max(0, heightM / HEIGHT_FOR_MAX_DIFFICULTY))
  return {
    level: Math.min(MAX_LEVEL, Math.floor(heightM / METERS_PER_LEVEL) + 1),
    stepWidth: Math.round(96 - (96 - 50) * t),
    verticalGap: Math.round(110 + (125 - 110) * t),
    scrollSpeed: Math.round(30 + (85 - 30) * t),
  }
}

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
  private levelText!: Phaser.GameObjects.Text
  private currentLevel = 1
  private superText!: Phaser.GameObjects.Text
  private superJumpCharges = 0
  private chargeTimerMs = 0 // ms acumulados desde a última carga ganha (zera ao ganhar; congela em max)

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    this.startY = GAME_HEIGHT - 150
    this.autoScrollActive = false
    this.runStartTime = 0
    this.elapsedMs = 0
    this.currentLevel = 1
    this.superJumpCharges = 0
    this.chargeTimerMs = 0
    this.inputMgr = new InputManager(this)
    this.cameras.main.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 1000000)
    // Bounds do mundo físico: laterais em 0..GAME_WIDTH (collision real),
    // verticais bem distantes (não afetam — player morre muito antes).
    this.physics.world.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 2000000)

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
    const cfg = getLevelConfig(0)
    this.addPlatform(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH, true) // chão inicial
    for (let y = GAME_HEIGHT - 180; y > -2000; y -= cfg.verticalGap) {
      const halfW = cfg.stepWidth / 2
      const x = Phaser.Math.Between(halfW + 10, GAME_WIDTH - halfW - 10)
      this.addPlatform(x, y, cfg.stepWidth)
      this.highestPlatformY = y
    }
  }

  private addPlatform(x: number, y: number, width = 96, isFloor = false) {
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
    this.playerBody.setCollideWorldBounds(true) // colide com paredes laterais
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

    this.levelText = this.add.text(20, 50, 'NÍVEL 1', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#c9a96b',
    })
    this.levelText.setScrollFactor(0)
    this.levelText.setShadow(1, 1, '#000', 0, true, true)

    this.superText = this.add.text(20, 70, 'SUPER: x0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#7ad4ff',
    })
    this.superText.setScrollFactor(0)
    this.superText.setShadow(1, 1, '#000', 0, true, true)

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

  private updateSuperHUD() {
    if (this.superJumpCharges >= SUPER_JUMP_MAX_CHARGES) {
      this.superText.setText(`SUPER: x${this.superJumpCharges} (MAX)`)
    } else {
      const remainingMs = SUPER_JUMP_CHARGE_INTERVAL_MS - this.chargeTimerMs
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
      this.superText.setText(`SUPER: x${this.superJumpCharges} (${remainingSec}s)`)
    }
  }

  private flashSuperGain() {
    // Flash sutil no texto do HUD
    this.tweens.add({
      targets: this.superText,
      scale: { from: 1.6, to: 1 },
      alpha: { from: 1, to: 1 },
      duration: 350,
      ease: 'Back.easeOut',
    })
  }

  private flashSuperUsed() {
    // Player pulsa pra dar leitura visual do super pulo
    this.tweens.add({
      targets: this.player,
      scaleX: { from: 1.4, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: 300,
      ease: 'Cubic.easeOut',
    })
    // Também muda a cor brevemente
    const originalFill = (this.player as Phaser.GameObjects.Rectangle).fillColor
    ;(this.player as Phaser.GameObjects.Rectangle).setFillStyle(0x7ad4ff)
    this.time.delayedCall(180, () => {
      ;(this.player as Phaser.GameObjects.Rectangle).setFillStyle(originalFill)
    })
  }

  private flashLevelUp(level: number) {
    const flash = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `NÍVEL ${level}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#ff6b35',
      fontStyle: 'bold',
    })
    flash.setOrigin(0.5)
    flash.setScrollFactor(0)
    flash.setShadow(3, 3, '#000', 0, true, true)
    flash.setAlpha(0)
    flash.setScale(0.5)

    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1.2 },
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 1.4,
          duration: 600,
          delay: 400,
          onComplete: () => flash.destroy(),
        })
      },
    })
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  update(_t: number, dt: number) {
    this.inputMgr.update()

    // Movimento horizontal:
    //   - No chão: controle direto e responsivo (zera ao soltar)
    //   - No ar: preserva momentum; input só ACELERA, não substitui velocidade.
    //     Soltar a tecla no ar = continua na velocidade que estava.
    //     Mudar direção no ar = possível, mas com inércia.
    const onGround = this.playerBody.blocked.down
    if (onGround) {
      if (this.inputMgr.isPressed('left')) this.playerBody.setVelocityX(-MOVE_SPEED)
      else if (this.inputMgr.isPressed('right')) this.playerBody.setVelocityX(MOVE_SPEED)
      else this.playerBody.setVelocityX(0)
    } else {
      const dtSec = Math.min(dt, 100) / 1000
      let vx = this.playerBody.velocity.x
      if (this.inputMgr.isPressed('left')) vx -= AIR_ACCEL * dtSec
      else if (this.inputMgr.isPressed('right')) vx += AIR_ACCEL * dtSec
      vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, vx))
      this.playerBody.setVelocityX(vx)
    }

    // Pulo:
    //   - `up` (seta cima / W / gamepad up/A / tap) = pulo normal
    //   - `action` (espaço / gamepad B / swipe down) = super pulo (consome 1 carga)
    //     se não tiver carga, cai como pulo normal pra não ser tecla "morta"
    if (this.playerBody.blocked.down) {
      if (this.inputMgr.justPressed('action')) {
        if (this.superJumpCharges > 0) {
          this.playerBody.setVelocityY(JUMP_VELOCITY * SUPER_JUMP_MULTIPLIER)
          this.superJumpCharges--
          this.flashSuperUsed()
        } else {
          this.playerBody.setVelocityY(JUMP_VELOCITY)
        }
      } else if (this.inputMgr.justPressed('up')) {
        this.playerBody.setVelocityY(JUMP_VELOCITY)
      }
    }

    // (sem screen-wrap — o player colide nas paredes laterais via world bounds)

    // Trigger do auto-scroll vem do collider (primeiro pouso em step não-floor).
    if (this.runStartTime > 0) {
      this.elapsedMs = this.time.now - this.runStartTime
      this.timeText.setText(`TEMPO: ${this.formatTime(this.elapsedMs)}`)
    }

    // Cargas de super pulo: ticka só quando a corrida começou.
    if (this.autoScrollActive) {
      if (this.superJumpCharges < SUPER_JUMP_MAX_CHARGES) {
        this.chargeTimerMs += Math.min(dt, 100)
        if (this.chargeTimerMs >= SUPER_JUMP_CHARGE_INTERVAL_MS) {
          this.superJumpCharges++
          this.chargeTimerMs = 0
          this.flashSuperGain()
        }
      } else {
        this.chargeTimerMs = 0
      }
    }
    this.updateSuperHUD()

    // Config corrente derivada da altura
    const cfg = getLevelConfig(Math.max(0, this.score))

    // Detecta troca de nível (display) → flash
    if (cfg.level !== this.currentLevel) {
      this.currentLevel = cfg.level
      this.levelText.setText(`NÍVEL ${this.currentLevel}`)
      this.flashLevelUp(this.currentLevel)
    }

    // ---- Câmera: auto-scroll híbrido ----
    // (1) sempre sobe num ritmo mínimo (pressão do nível) — após o primeiro step
    // (2) também segue o player pra cima se ele estiver subindo mais rápido
    // Câmera nunca desce.
    const cam = this.cameras.main
    const dtSec = Math.min(dt, 100) / 1000 // cap pra evitar pulo gigante em tab switch
    const playerTarget = this.player.y - GAME_HEIGHT * 0.6
    if (this.autoScrollActive) {
      const autoScrollTarget = cam.scrollY - cfg.scrollSpeed * dtSec
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

    // spawnar mais steps acima conforme sobe — usa config corrente
    while (this.highestPlatformY > cam.scrollY - 200) {
      this.highestPlatformY -= cfg.verticalGap
      const halfW = cfg.stepWidth / 2
      const x = Phaser.Math.Between(halfW + 10, GAME_WIDTH - halfW - 10)
      this.addPlatform(x, this.highestPlatformY, cfg.stepWidth)
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
