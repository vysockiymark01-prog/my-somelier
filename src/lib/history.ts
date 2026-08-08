const STORAGE_KEY = 'my-somelier:made-history'

export interface MadeEntry {
  recipeId: string
  madeAt: number
}

export function loadHistory(): MadeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MadeEntry[]
  } catch {
    return []
  }
}

function saveHistory(entries: MadeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function recordMade(recipeId: string, madeAt: number): MadeEntry[] {
  const entries = [...loadHistory(), { recipeId, madeAt }]
  saveHistory(entries)
  return entries
}

export function hasMade(recipeId: string): boolean {
  return loadHistory().some((e) => e.recipeId === recipeId)
}

export function countDistinctMade(): number {
  return new Set(loadHistory().map((e) => e.recipeId)).size
}
