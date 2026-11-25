'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  message: string
  tone?: 'success' | 'error' | 'info'
  action?: ToastAction
  durationMs?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

const ToastContext = createContext<{ toast: (options: ToastOptions) => void }>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

const toneIcon = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}
const toneColor = {
  success: 'text-sage-500',
  error: 'text-coral-500',
  info: 'text-sky-500',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++idRef.current
      setToasts((current) => [...current.slice(-3), { ...options, id }])
      const duration = options.durationMs ?? (options.action ? 6000 : 4500)
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((t) => {
          const Icon = toneIcon[t.tone ?? 'info']
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 shadow-lifted animate-toast-in"
            >
              <Icon className={cn('h-5 w-5 shrink-0', toneColor[t.tone ?? 'info'])} aria-hidden />
              <p className="min-w-0 flex-1 text-sm font-medium text-ink-800">{t.message}</p>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-navy-600 transition-colors hover:bg-cream-200"
                >
                  {t.action.label === 'Undo' && <Undo2 className="h-3.5 w-3.5" />}
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-lg p-1 text-ink-300 transition-colors hover:text-ink-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
