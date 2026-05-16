import type { CharacterSkin } from './CharacterSkin'

// Row 3: small green character; only the first few frames are populated.
const ROW = 3
const FRAMES_PER_ROW = 23
const IDLE_FRAME = ROW * FRAMES_PER_ROW + 0

export const pixelMiniCharacter: CharacterSkin = {
  id: 'pixel-mini',
  name: 'Mini',
  paintCharacter: ({ scene, x, y, size }) => {
    const sprite = scene.add.sprite(x, y, 'characters', IDLE_FRAME)
    sprite.setScale(size / 32)
    return sprite
  },
}
