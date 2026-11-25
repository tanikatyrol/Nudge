'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  /** bottom sheet on mobile, centered dialog on desktop */
  sheet?: boolean
  wide?: boolean
}

export function Modal({ open, onClose, title, subtitle, children, sheet = true, wide }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // focus the first focusable element
    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button[data-autofocus]'
      )
      focusable?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center overflow-y-auto bg-ink-950/25 backdrop-blur-[2px] animate-fade-in',
        sheet ? 'items-end sm:items-center sm:p-4' : 'items-center p-4'
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full bg-cream-50 shadow-pop animate-pop',
          sheet ? 'rounded-t-3xl sm:rounded-2xl' : 'rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
            <div>
              {title && <h2 className="text-lg font-semibold text-ink-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-5 pb-6 pt-4 sm:px-6">{children}</div>
      </div>
    </div>
  )
}
