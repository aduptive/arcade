import type { CharacterSkin } from './CharacterSkin'
import { defaultCharacter } from './default'
import { climberCharacter } from './climber'
import { capivaraCharacter } from './capivara'

export type { CharacterSkin } from './CharacterSkin'

/** Ordered list of all selectable characters, in the order they appear in the menu. */
export const ALL_CHARACTERS: CharacterSkin[] = [
  defaultCharacter,
  climberCharacter,
  capivaraCharacter,
]

export const DEFAULT_CHARACTER_ID = defaultCharacter.id

export function getCharacterById(id: string): CharacterSkin {
  return ALL_CHARACTERS.find((c) => c.id === id) ?? defaultCharacter
}
