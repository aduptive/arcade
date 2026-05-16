import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { InputManager } from '@shared/input/InputManager'
import {
  createPickup,
  PICKUP_HOVER_OFFSET,
  PICKUP_SPAWN_CHANCE,
  randomPickupType,
  type PickupType,
} from '../game/Pickup'

const PLATFORM_HEIGHT = 16
const PLAYER_SIZE = 28
const JUMP_VELOCITY = -780
const GROUND_MAX_SPEED = 320 // max horizontal speed on the ground (responsive)
const AIR_MAX_SPEED = 320 // max horizontal speed in the air (matches ground so launch velocity carries)
// Icy-Tower-style air control: ground velocity is the real resource, air input
// only nudges. Players are rewarded for committing on the ground before takeoff.
//   - air acceleration in either direction is small (input only adjusts, not steers)
//   - reversing direction in the air takes deliberate, sustained input
//   - drag on no-input is gentle, so the launched velocity persists across the arc
const AIR_ACCEL_SAME = 1200 // px/s^2 — same direction as current motion or from rest
const AIR_ACCEL_REVERSE = 2500 // px/s^2 — input opposes current motion
const AIR_DRAG = 400 // px/s^2 — passive deceleration when no input in air
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
  private pointsText!: Phaser.GameObjects.Text
  private effectText!: Phaser.GameObjects.Text
  private points = 0
  private pickups!: Phaser.Physics.Arcade.StaticGroup
  private baseGravityY = 0
  private gravityEffect: { name: 'lunar' | 'heavy'; expiresAt: number } | null = null

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
    this.points = 0
    this.gravityEffect = null
    this.inputMgr = new InputManager(this)
    this.cameras.main.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 1000000)
    this.physics.world.setBounds(0, -1000000, GAME_WIDTH, GAME_HEIGHT + 2000000)
    this.baseGravityY = this.physics.world.gravity.y
    this.physics.world.gravity.y = this.baseGravityY // reset in case of scene restart

    this.drawBackground()
    this.platforms = this.physics.add.staticGroup()
    this.pickups = this.physics.add.staticGroup()
    this.spawnInitialPlatforms()
    this.createPlayer()
    this.drawHUD()

    this.physics.add.overlap(this.player, this.pickups, (_player, pickup) => {
      this.collectPickup(pickup as Phaser.GameObjects.Rectangle)
    })
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
    this.addPlatform(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH, true) // initial floor — never carries a pickup
    for (let y = GAME_HEIGHT - 180; y > -2000; y -= cfg.verticalGap) {
      const halfW = cfg.stepWidth / 2
      const x = Phaser.Math.Between(halfW + 10, GAME_WIDTH - halfW - 10)
      this.addPlatform(x, y, cfg.stepWidth)
      this.maybeSpawnPickupAbove(x, y)
      this.highestPlatformY = y
    }
  }

  private maybeSpawnPickupAbove(x: number, y: number) {
    if (Math.random() > PICKUP_SPAWN_CHANCE) return
    const type = randomPickupType()
    const pickup = createPickup(this, x, y - PICKUP_HOVER_OFFSET, type)
    this.pickups.add(pickup)
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

    this.pointsText = this.add.text(20, 48, 'PONTOS: 0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffd700',
    })
    this.pointsText.setScrollFactor(0)
    this.pointsText.setShadow(1, 1, '#000', 0, true, true)

    this.levelText = this.add.text(20, 70, 'NÍVEL 1', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#c9a96b',
    })
    this.levelText.setScrollFactor(0)
    this.levelText.setShadow(1, 1, '#000', 0, true, true)

    this.superText = this.add.text(20, 90, 'SUPER: x0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#7ad4ff',
    })
    this.superText.setScrollFactor(0)
    this.superText.setShadow(1, 1, '#000', 0, true, true)

    this.effectText = this.add.text(20, 110, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#a07acc',
      fontStyle: 'bold',
    })
    this.effectText.setScrollFactor(0)
    this.effectText.setShadow(1, 1, '#000', 0, true, true)

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

  // ---- Pickups ----

  private collectPickup(rect: Phaser.GameObjects.Rectangle) {
    const type = rect.getData('pickupType') as PickupType | undefined
    if (!type) return
    // Stop further overlaps and animate out
    const body = rect.body as Phaser.Physics.Arcade.StaticBody | null
    if (body) body.enable = false
    this.applyPickup(type)
    this.tweens.add({
      targets: rect,
      scale: 1.6,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => rect.destroy(),
    })
  }

  private applyPickup(type: PickupType) {
    switch (type) {
      case 'coin':
        this.addPoints(50)
        this.flashNotification('+50', '#ffd700')
        break
      case 'super':
        if (this.gainSuperCharge()) {
          this.flashNotification('+1 SUPER', '#7ad4ff')
        } else {
          this.flashNotification('SUPER CHEIO', '#7ad4ff')
        }
        break
      case 'lunar':
        this.setGravityEffect('lunar', 0.5, 10000)
        this.flashNotification('LUNAR', '#a07acc')
        break
      case 'mystery':
        this.applyMystery()
        break
    }
  }

  private applyMystery() {
    // Weighted bag: 3 good, 3 neutral-ish, 2 bad
    const outcomes: Array<'super' | 'lunar' | 'big' | 'small' | 'nothing' | 'heavy' | 'lose_super'> = [
      'super',
      'lunar',
      'big',
      'small',
      'small',
      'nothing',
      'heavy',
      'lose_super',
    ]
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)]
    switch (pick) {
      case 'super':
        this.gainSuperCharge()
        this.flashNotification('? +1 SUPER', '#7ad4ff')
        break
      case 'lunar':
        this.setGravityEffect('lunar', 0.5, 10000)
        this.flashNotification('? LUNAR', '#a07acc')
        break
      case 'big':
        this.addPoints(200)
        this.flashNotification('? +200 PTS', '#ffd700')
        break
      case 'small':
        this.addPoints(50)
        this.flashNotification('? +50 PTS', '#ffd700')
        break
      case 'nothing':
        this.flashNotification('? NADA', '#aaaaaa')
        break
      case 'heavy':
        this.setGravityEffect('heavy', 1.7, 5000)
        this.flashNotification('? HEAVY!', '#c4503a')
        break
      case 'lose_super':
        if (this.superJumpCharges > 0) {
          this.superJumpCharges--
          this.flashNotification('? -1 SUPER', '#c4503a')
        } else {
          this.flashNotification('? ESCAPOU', '#aaaaaa')
        }
        break
    }
  }

  private addPoints(n: number) {
    this.points += n
    this.pointsText.setText(`PONTOS: ${this.points}`)
  }

  private gainSuperCharge(): boolean {
    if (this.superJumpCharges >= SUPER_JUMP_MAX_CHARGES) return false
    this.superJumpCharges++
    this.flashSuperGain()
    return true
  }

  private setGravityEffect(name: 'lunar' | 'heavy', multiplier: number, durationMs: number) {
    this.gravityEffect = { name, expiresAt: this.time.now + durationMs }
    this.physics.world.gravity.y = this.baseGravityY * multiplier
  }

  private tickGravityEffect() {
    if (!this.gravityEffect) {
      this.effectText.setText('')
      return
    }
    if (this.time.now >= this.gravityEffect.expiresAt) {
      this.physics.world.gravity.y = this.baseGravityY
      this.gravityEffect = null
      this.effectText.setText('')
      return
    }
    const remaining = Math.ceil((this.gravityEffect.expiresAt - this.time.now) / 1000)
    const label = this.gravityEffect.name === 'lunar' ? 'LUNAR' : 'HEAVY'
    const color = this.gravityEffect.name === 'lunar' ? '#a07acc' : '#c4503a'
    this.effectText.setColor(color)
    this.effectText.setText(`${label} ${remaining}s`)
  }

  private cleanupOffscreenPickups(scrollY: number) {
    const cutoff = scrollY + GAME_HEIGHT + 50
    this.pickups.children.iterate((child) => {
      const p = child as Phaser.GameObjects.Rectangle | null
      if (p && p.y > cutoff) p.destroy()
      return true
    })
  }

  private flashNotification(text: string, color: string) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color,
      fontStyle: 'bold',
    })
    t.setOrigin(0.5)
    t.setScrollFactor(0)
    t.setShadow(2, 2, '#000', 0, true, true)
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: '-=24',
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    })
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
      if (this.inputMgr.isPressed('left')) this.playerBody.setVelocityX(-GROUND_MAX_SPEED)
      else if (this.inputMgr.isPressed('right')) this.playerBody.setVelocityX(GROUND_MAX_SPEED)
      else this.playerBody.setVelocityX(0)
    } else {
      const dtSec = Math.min(dt, 100) / 1000
      let vx = this.playerBody.velocity.x
      const wantsLeft = this.inputMgr.isPressed('left')
      const wantsRight = this.inputMgr.isPressed('right')
      if (wantsLeft) {
        const accel = vx > 0 ? AIR_ACCEL_REVERSE : AIR_ACCEL_SAME
        vx -= accel * dtSec
      } else if (wantsRight) {
        const accel = vx < 0 ? AIR_ACCEL_REVERSE : AIR_ACCEL_SAME
        vx += accel * dtSec
      } else {
        // No input: drag decays residual velocity so brief taps do not drift forever.
        const drag = AIR_DRAG * dtSec
        if (Math.abs(vx) <= drag) vx = 0
        else vx -= Math.sign(vx) * drag
      }
      vx = Math.max(-AIR_MAX_SPEED, Math.min(AIR_MAX_SPEED, vx))
      this.playerBody.setVelocityX(vx)
    }

    // Jump:
    //   - `up` (arrow up / W / gamepad up or A / tap) = always normal jump
    //   - `action` (space / gamepad B / swipe down) = dedicated super jump:
    //     consumes 1 charge if available; does nothing when out of charges.
    //   No fallback from action to normal jump: the whole point is that the
    //   super jump is an explicit, separate choice from the regular one.
    if (this.playerBody.blocked.down) {
      if (this.inputMgr.justPressed('action') && this.superJumpCharges > 0) {
        this.playerBody.setVelocityY(JUMP_VELOCITY * SUPER_JUMP_MULTIPLIER)
        this.superJumpCharges--
        this.flashSuperUsed()
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
      this.maybeSpawnPickupAbove(x, this.highestPlatformY)
    }

    // Pickups e efeitos: limpa o que saiu da tela e expira efeitos com timer
    this.cleanupOffscreenPickups(cam.scrollY)
    this.tickGravityEffect()

    // ---- Game over ----
    // Player caiu fora da tela OU foi engolido pelo auto-scroll por baixo.
    if (this.player.y > cam.scrollY + GAME_HEIGHT + DEATH_ZONE_PADDING) {
      // Restore gravity before leaving the scene so the next run starts clean.
      this.physics.world.gravity.y = this.baseGravityY
      this.scene.start('GameOverScene', {
        score: Math.max(0, this.score),
        timeMs: this.elapsedMs,
        points: this.points,
      })
    }
  }
}
