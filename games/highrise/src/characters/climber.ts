import type { CharacterSkin } from './CharacterSkin'

/**
 * Generic climber — placeholder colored rectangle until we commission/AI-generate
 * a real sprite in Phase 6 polish. The color distinguishes it visually from the
 * default cubinho on the selection screen.
 */
export const climberCharacter: CharacterSkin = {
  id: 'climber',
  name: 'Climber',
  paintCharacter: ({ scene, x, y, size }) => {
    const rect = scene.add.rectangle(x, y, size, size, 0x2a4d8f)
    rect.setStrokeStyle(2, 0xffd93d) // gold outline = climbing helmet hint
    return rect
  },
}
