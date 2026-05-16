import type { CharacterSkin } from './CharacterSkin'

/**
 * Capivara — Brazilian alter ego, queen of the favela map.
 * Brown-orange rectangle, placeholder until a real sprite is commissioned.
 */
export const capivaraCharacter: CharacterSkin = {
  id: 'capivara',
  name: 'Capivara',
  paintCharacter: ({ scene, x, y, size }) => {
    const rect = scene.add.rectangle(x, y, size, size, 0x9b6b3a)
    rect.setStrokeStyle(2, 0x3a2410)
    return rect
  },
}
