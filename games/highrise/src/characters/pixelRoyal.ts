import type { CharacterSkin } from './CharacterSkin'

// Row 1: blue body, red cape, crown — looks royal.
const ROW = 1
const FRAMES_PER_ROW = 23
const IDLE_FRAME = ROW * FRAMES_PER_ROW + 0

export const pixelRoyalCharacter: CharacterSkin = {
  id: 'pixel-royal',
  name: 'Royal',
  paintCharacter: ({ scene, x, y, size }) => {
    const sprite = scene.add.sprite(x, y, 'characters', IDLE_FRAME)
    sprite.setScale(size / 32)
    return sprite
  },
}
