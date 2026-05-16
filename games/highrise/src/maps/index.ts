import type { MapTheme } from './MapTheme'
import { defaultMap } from './default'
import { nyMap } from './ny'
import { arboreaMap } from './arborea'

export type { MapTheme } from './MapTheme'

/** Ordered list of all selectable maps, in the order they appear in the menu. */
export const ALL_MAPS: MapTheme[] = [defaultMap, nyMap, arboreaMap]

export const DEFAULT_MAP_ID = defaultMap.id

export function getMapById(id: string): MapTheme {
  return ALL_MAPS.find((m) => m.id === id) ?? defaultMap
}
