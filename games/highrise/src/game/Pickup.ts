import Phaser from 'phaser'

export type PickupType = 'coin' | 'super' | 'lunar' | 'mystery'

interface PickupTypeConfig {
  weight: number
  fillColor: number
  strokeColor: number
}

export const PICKUP_CONFIGS: Record<PickupType, PickupTypeConfig> = {
  coin: { weight: 60, fillColor: 0xffd700, strokeColor: 0xb8860b },
  super: { weight: 20, fillColor: 0x7ad4ff, strokeColor: 0x3a7c9b },
  lunar: { weight: 12, fillColor: 0xa07acc, strokeColor: 0x5a3d80 },
  mystery: { weight: 8, fillColor: 0xffeb3b, strokeColor: 0xc4a700 },
}

const ALL_TYPES: PickupType[] = ['coin', 'super', 'lunar', 'mystery']
const TOTAL_WEIGHT = ALL_TYPES.reduce((s, t) => s + PICKUP_CONFIGS[t].weight, 0)

export const PICKUP_SIZE = 20
export const PICKUP_HOVER_OFFSET = 28 // distance above the parent step
export const PICKUP_SPAWN_CHANCE = 0.15 // probability per non-floor step

export function randomPickupType(): PickupType {
  let r = Math.random() * TOTAL_WEIGHT
  for (const t of ALL_TYPES) {
    r -= PICKUP_CONFIGS[t].weight
    if (r <= 0) return t
  }
  return 'coin'
}

/**
 * Create a pickup at (x, y) as a rotating rectangle with a static physics body.
 * The visual rotates over time; the physics body's AABB stays axis-aligned
 * (Phaser arcade physics doesn't rotate bodies), which is fine for overlap.
 */
export function createPickup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  type: PickupType
): Phaser.GameObjects.Rectangle {
  const cfg = PICKUP_CONFIGS[type]
  const rect = scene.add.rectangle(x, y, PICKUP_SIZE, PICKUP_SIZE, cfg.fillColor)
  rect.setStrokeStyle(2, cfg.strokeColor)
  rect.setRotation(Math.PI / 4) // diamond orientation
  rect.setData('pickupType', type)

  scene.physics.add.existing(rect, true) // static body
  const body = rect.body as Phaser.Physics.Arcade.StaticBody
  body.setSize(PICKUP_SIZE * 1.4, PICKUP_SIZE * 1.4) // generous AABB around the diamond
  body.updateFromGameObject()

  // Slow rotation as visual cue.
  scene.tweens.add({
    targets: rect,
    rotation: rect.rotation + Math.PI * 2,
    duration: 4000,
    repeat: -1,
    ease: 'Linear',
  })

  return rect
}
