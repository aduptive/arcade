import type { CharacterSkin } from './CharacterSkin'
import { defaultCharacter } from './default'
import { climberCharacter } from './climber'
import { capivaraCharacter } from './capivara'
import { woodcutterCharacter } from './woodcutter'
import { graveRobberCharacter } from './graveRobber'
import { steamManCharacter } from './steamMan'

export type { CharacterSkin, CharacterGameObject, PlayerState, CharacterUpdateArgs } from './CharacterSkin'

/** Ordered list of all selectable characters, in the order they appear in the menu. */
export const ALL_CHARACTERS: CharacterSkin[] = [
  woodcutterCharacter,
  graveRobberCharacter,
  steamManCharacter,
  defaultCharacter,
  climberCharacter,
  capivaraCharacter,
]

export const DEFAULT_CHARACTER_ID = woodcutterCharacter.id

export function getCharacterById(id: string): CharacterSkin {
  return ALL_CHARACTERS.find((c) => c.id === id) ?? woodcutterCharacter
}
