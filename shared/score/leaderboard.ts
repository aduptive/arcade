/**
 * Local-only top-10 leaderboard backed by localStorage. Shared across all
 * arcade games — each game keys its own list with its own id.
 *
 * No backend, no auth, no cloud sync. Browser private mode falls back to a
 * silent no-op (reads return empty list, writes throw silently).
 */

export interface LeaderboardEntry {
  /** Player-entered name, kept short to fit the row layout. */
  name: string
  /** Composed final score (see `computeScore`). What the list is sorted by. */
  score: number
  /** Altitude reached, in meters. */
  altura: number
  /** Pickup points accumulated during the run. */
  pontos: number
  /** Best combo chain reached this run. */
  bestCombo: number
  /** Difficulty level the player reached. */
  level: number
  /** Run duration in milliseconds. */
  timeMs: number
  /** Map id played. */
  mapId: string
  /** Character id used. */
  characterId: string
  /** ISO timestamp of when the entry was saved. */
  dateIso: string
}

/**
 * Storage cap. Plenty of headroom for a single-device leaderboard; if we
 * ever back this with Turso/Firebase, the cap can grow further and the
 * Hall of Fame screen already scrolls.
 */
const MAX_ENTRIES = 100
const MAX_NAME_LENGTH = 16

function storageKey(gameId: string): string {
  return `arcade.${gameId}.leaderboard`
}

function lastNameKey(gameId: string): string {
  return `arcade.${gameId}.lastName`
}

/**
 * Score formula. Tunable from one place if we want to rebalance later.
 *
 *   altura  contributes 10 per meter climbed
 *   pontos  contribute 1 per point (pickup currency)
 *   combo   contributes 50 per best-combo level (rewards skillful chaining)
 */
export function computeScore(altura: number, pontos: number, bestCombo: number): number {
  return Math.max(0, Math.floor(altura * 10 + pontos + bestCombo * 50))
}

export function getLeaderboard(gameId: string): LeaderboardEntry[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey(gameId)) : null
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry).slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

/** True if a score would land inside the top 10 (or the list isn't full yet). */
export function isHighScore(gameId: string, score: number): boolean {
  const list = getLeaderboard(gameId)
  if (list.length < MAX_ENTRIES) return true
  const lowest = list[list.length - 1]
  return score > lowest.score
}

/** Returns the new sorted top-10 list including the saved entry (if it qualified). */
export function saveEntry(gameId: string, entry: LeaderboardEntry): LeaderboardEntry[] {
  const safeEntry: LeaderboardEntry = {
    ...entry,
    name: sanitizeName(entry.name),
  }
  const list = getLeaderboard(gameId)
  list.push(safeEntry)
  list.sort((a, b) => b.score - a.score)
  const top = list.slice(0, MAX_ENTRIES)
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(top))
  } catch {
    // Quota exceeded, private mode, etc. Silently ignore.
  }
  return top
}

export function getLastName(gameId: string, fallback = 'PLAYER'): string {
  try {
    return localStorage.getItem(lastNameKey(gameId)) ?? fallback
  } catch {
    return fallback
  }
}

export function setLastName(gameId: string, name: string): void {
  try {
    localStorage.setItem(lastNameKey(gameId), sanitizeName(name))
  } catch {
    // ignore
  }
}

export function clearLeaderboard(gameId: string): void {
  try {
    localStorage.removeItem(storageKey(gameId))
  } catch {
    // ignore
  }
}

function sanitizeName(raw: string): string {
  return (raw || 'PLAYER')
    .toString()
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .toUpperCase() || 'PLAYER'
}

function isValidEntry(obj: unknown): obj is LeaderboardEntry {
  if (!obj || typeof obj !== 'object') return false
  const e = obj as Record<string, unknown>
  // `level` was added later; accept legacy entries by defaulting it.
  if (typeof e.level !== 'number') e.level = 1
  return (
    typeof e.name === 'string' &&
    typeof e.score === 'number' &&
    typeof e.altura === 'number' &&
    typeof e.pontos === 'number' &&
    typeof e.bestCombo === 'number' &&
    typeof e.level === 'number' &&
    typeof e.timeMs === 'number' &&
    typeof e.mapId === 'string' &&
    typeof e.characterId === 'string' &&
    typeof e.dateIso === 'string'
  )
}
