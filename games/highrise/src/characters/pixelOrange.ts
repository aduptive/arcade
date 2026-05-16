import type { CharacterSkin } from './CharacterSkin'

// Row 0 of the characters spritesheet (orange chibi). Frame 0 is the assumed
// idle pose. Animations across the row will be wired once we identify what
// each frame represents in playtesting.
const ROW = 0
const FRAMES_PER_ROW = 23
const IDLE_FRAME = ROW * FRAMES_PER_ROW + 0

export const pixelOrangeCharacter: CharacterSkin = {
  id: 'pixel-orange',
  name: 'Orange',
  paintCharacter: ({ scene, x, y, size }) => {
    const sprite = scene.add.sprite(x, y, 'characters', IDLE_FRAME)
    // Scale the 32px frame to PLAYER_SIZE (28). Slight crispness loss; will
    // look perfect once we pick a PLAYER_SIZE matching the frame size in a
    // future tuning pass.
    const scale = size / 32
    sprite.setScale(scale)
    return sprite
  },
}
