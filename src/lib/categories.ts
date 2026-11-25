import type { Category, CategoryColor } from '@/types'
import type { CategoryKey } from '@/lib/parse'

const KEY_TO_NAME: Record<CategoryKey, string> = {
  personal: 'Personal',
  shopping: 'Shopping',
  bills: 'Bills',
  home: 'Home',
  health: 'Health',
  work: 'Work',
}

/** Resolve a parser category guess to one of the user's categories. */
export function categoryIdForKey(key: CategoryKey | null, categories: Category[]): string | null {
  if (!key) return null
  const name = KEY_TO_NAME[key]
  return categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null
}

export const PASTEL_COLORS: CategoryColor[] = ['lilac', 'peach', 'sage', 'sky', 'butter', 'coral', 'navy']
