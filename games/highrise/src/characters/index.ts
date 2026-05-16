import type { CharacterSkin } from './CharacterSkin'
import { defaultCharacter } from './default'
import { climberCharacter } from './climber'
import { capivaraCharacter } from './capivara'
import { pixelOrangeCharacter } from './pixelOrange'
import { pixelRoyalCharacter } from './pixelRoyal'
import { pixelSoldierCharacter } from './pixelSoldier'
import { pixelMiniCharacter } from './pixelMini'

export type { CharacterSkin, CharacterGameObject } from './CharacterSkin'

/** Ordered list of all selectable characters, in the order they appear in the menu. */
export const ALL_CHARACTERS: CharacterSkin[] = [
  pixelOrangeCharacter,
  pixelRoyalCharacter,
  pixelSoldierCharacter,
  pixelMiniCharacter,
  defaultCharacter,
  climberCharacter,
  capivaraCharacter,
]

export const DEFAULT_CHARACTER_ID = pixelOrangeCharacter.id

export function getCharacterById(id: string): CharacterSkin {
  return ALL_CHARACTERS.find((c) => c.id === id) ?? pixelOrangeCharacter
}
