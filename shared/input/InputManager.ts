import Phaser from 'phaser'

export type GameAction = 'left' | 'right' | 'up' | 'down' | 'action'

interface ActionState {
  pressed: boolean
  justPressed: boolean
}

const ALL_ACTIONS: GameAction[] = ['left', 'right', 'up', 'down', 'action']

/**
 * Unified input across keyboard, gamepad, and touch.
 *
 * Mapping:
 *   Keyboard: arrows + WASD + space (action)
 *   Gamepad:  d-pad + left stick + A (up) + B (action)
 *   Touch:    swipe directions, tap = up, swipe down = action
 *
 * Each game can interpret actions as it wants — e.g. in a tetris,
 * `up` may mean rotate; in a platformer, jump.
 */
export class InputManager {
  private scene: Phaser.Scene
  private actions = new Map<GameAction, ActionState>()
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {}
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null
  private touchBuffer: GameAction[] = []
  private prevPressed = new Map<GameAction, boolean>()
  /**
   * Continuous virtual input state, driven externally (e.g. by on-screen mobile
   * touch controls that need to hold a direction). Unlike `touchBuffer` which
   * fires once per gesture, these stay pressed for as long as the consumer
   * marks them true.
   */
  private virtualPressed: Record<GameAction, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
  }
  /** Touches that land below this y (on the scene's pointer events) are ignored
   * by the swipe/tap detector, so dedicated virtual buttons in that area don't
   * also fire a global jump on release. 0 disables the cutoff. */
  private touchIgnoreBelowY = 0

  private touchStartX = 0
  private touchStartY = 0
  private touchStartTime = 0
  private touchStartedInDeadZone = false
  private readonly SWIPE_THRESHOLD = 30
  private readonly TAP_TIME = 200

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    for (const a of ALL_ACTIONS) {
      this.actions.set(a, { pressed: false, justPressed: false })
      this.prevPressed.set(a, false)
    }
    this.setupKeyboard()
    this.setupGamepad()
    this.setupTouch()
  }

  private setupKeyboard() {
    const kb = this.scene.input.keyboard
    if (!kb) return
    this.keys.left = kb.addKey('LEFT')
    this.keys.right = kb.addKey('RIGHT')
    this.keys.down = kb.addKey('DOWN')
    this.keys.up = kb.addKey('UP')
    this.keys.space = kb.addKey('SPACE')
    this.keys.a = kb.addKey('A')
    this.keys.d = kb.addKey('D')
    this.keys.s = kb.addKey('S')
    this.keys.w = kb.addKey('W')
  }

  private setupGamepad() {
    const gp = this.scene.input.gamepad
    if (!gp) return
    gp.once('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad
    })
    if (gp.total > 0) this.gamepad = gp.getPad(0)
  }

  private setupTouch() {
    this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touchStartedInDeadZone =
        this.touchIgnoreBelowY > 0 && p.y >= this.touchIgnoreBelowY
      this.touchStartX = p.x
      this.touchStartY = p.y
      this.touchStartTime = this.scene.time.now
    })
    this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.touchStartedInDeadZone) {
        this.touchStartedInDeadZone = false
        return
      }
      const dx = p.x - this.touchStartX
      const dy = p.y - this.touchStartY
      const dt = this.scene.time.now - this.touchStartTime
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (dt < this.TAP_TIME && absDx < this.SWIPE_THRESHOLD && absDy < this.SWIPE_THRESHOLD) {
        this.touchBuffer.push('up')
        return
      }
      if (absDx > absDy && absDx > this.SWIPE_THRESHOLD) {
        this.touchBuffer.push(dx > 0 ? 'right' : 'left')
      } else if (absDy > this.SWIPE_THRESHOLD) {
        this.touchBuffer.push(dy > 0 ? 'action' : 'up')
      }
    })
  }

  /**
   * Inject continuous virtual state for an action (used by on-screen mobile
   * controls). Stays "pressed" until explicitly cleared.
   */
  setVirtualPressed(action: GameAction, pressed: boolean) {
    this.virtualPressed[action] = pressed
  }

  /**
   * Configure the swipe/tap detector to ignore touches that START at or below
   * a given y. Use this to reserve a strip at the bottom of the screen for
   * dedicated buttons (e.g. left/right hold zones) without those touches also
   * firing a global jump on release.
   */
  setTouchIgnoreBelowY(y: number) {
    this.touchIgnoreBelowY = y
  }

  update() {
    for (const a of ALL_ACTIONS) {
      this.prevPressed.set(a, this.actions.get(a)!.pressed)
      const s = this.actions.get(a)!
      s.pressed = false
      s.justPressed = false
    }

    const k = this.keys
    if (k.left?.isDown || k.a?.isDown) this.actions.get('left')!.pressed = true
    if (k.right?.isDown || k.d?.isDown) this.actions.get('right')!.pressed = true
    if (k.down?.isDown || k.s?.isDown) this.actions.get('down')!.pressed = true
    if (k.up?.isDown || k.w?.isDown) this.actions.get('up')!.pressed = true
    if (k.space?.isDown) this.actions.get('action')!.pressed = true

    if (this.gamepad) {
      const pad = this.gamepad
      const lx = pad.leftStick.x
      const ly = pad.leftStick.y
      if (lx < -0.5 || pad.left) this.actions.get('left')!.pressed = true
      if (lx > 0.5 || pad.right) this.actions.get('right')!.pressed = true
      if (pad.down || ly > 0.5) this.actions.get('down')!.pressed = true
      if (pad.up || ly < -0.5 || pad.A) this.actions.get('up')!.pressed = true
      if (pad.B) this.actions.get('action')!.pressed = true
    }

    for (const a of this.touchBuffer) {
      this.actions.get(a)!.pressed = true
    }
    this.touchBuffer = []

    // Continuous virtual state (mobile on-screen buttons).
    for (const a of ALL_ACTIONS) {
      if (this.virtualPressed[a]) this.actions.get(a)!.pressed = true
    }

    for (const a of ALL_ACTIONS) {
      const s = this.actions.get(a)!
      if (s.pressed && !this.prevPressed.get(a)) s.justPressed = true
    }
  }

  isPressed(action: GameAction): boolean {
    return this.actions.get(action)?.pressed ?? false
  }

  justPressed(action: GameAction): boolean {
    return this.actions.get(action)?.justPressed ?? false
  }
}
