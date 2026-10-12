/** Collision-resistant enough for client-generated document ids. */
export function makeId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${prefix}${prefix ? '_' : ''}${time}${rand}`
}

/**
 * Deterministic, human-readable id for documents that must be created on
 * every client for the same logical record (leaderboard snapshots, metrics).
 */
export function stableId(...parts: (string | number | undefined | null)[]): string {
  return parts
    .filter((p) => p !== undefined && p !== null && p !== '')
    .join('_')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .toLowerCase()
}

export function uid(): string {
  return crypto.randomUUID?.() ?? makeId()
}
