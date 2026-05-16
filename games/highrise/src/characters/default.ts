import type { CharacterSkin } from './CharacterSkin'

/** Original orange-square placeholder. Used as the safe default. */
export const defaultCharacter: CharacterSkin = {
  id: 'default',
  name: 'Cubinho',
  paintCharacter: ({ scene, x, y, size }) => {
    const rect = scene.add.rectangle(x, y, size, size, 0xff6b35)
    rect.setStrokeStyle(2, 0xa6391c)
    return rect
  },
}
