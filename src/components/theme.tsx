'use client'

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { ThemeSetting } from '@/types'

type SetTheme = (theme: ThemeSetting) => void

const ThemeContext = createContext<{ theme: ThemeSetting; setTheme: SetTheme }>({
  theme: 'system',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = 'nudge-theme'
const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
    media.removeEventListener('change', onChange)
  }
}

function getSnapshot(): ThemeSetting {
  return (localStorage.getItem(STORAGE_KEY) as ThemeSetting | null) ?? 'system'
}

function getServerSnapshot(): ThemeSetting {
  return 'system'
}

function notifyListeners() {
  listeners.forEach((cb) => cb())
}

function applyTheme(theme: ThemeSetting) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = useCallback((next: ThemeSetting) => {
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    notifyListeners()
    // persist preference (fire-and-forget; applies when signed in)
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    }).catch(() => undefined)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

/** Inlined in <head> — applies the stored theme before first paint. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('nudge-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
