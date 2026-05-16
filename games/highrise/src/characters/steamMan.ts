import { createSpriteCharacter } from './spriteCharacter'

export const steamManCharacter = createSpriteCharacter({
  id: 'steam-man',
  name: 'Steam Man',
  basename: 'SteamMan',
  // Body sits ~3 source pixels left of frame center across the idle/walk/jump
  // animations. Tuned from debug screenshots.
  artOffsetInFrame: -3,
})
