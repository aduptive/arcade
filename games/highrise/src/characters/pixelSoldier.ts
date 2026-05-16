import type { CharacterSkin } from './CharacterSkin'

// Row 2: green clothes, helmet — looks like a soldier.
const ROW = 2
const FRAMES_PER_ROW = 23
const IDLE_FRAME = ROW * FRAMES_PER_ROW + 0

export const pixelSoldierCharacter: CharacterSkin = {
  id: 'pixel-soldier',
  name: 'Soldier',
  paintCharacter: ({ scene, x, y, size }) => {
    const sprite = scene.add.sprite(x, y, 'characters', IDLE_FRAME)
    sprite.setScale(size / 32)
    return sprite
  },
}
