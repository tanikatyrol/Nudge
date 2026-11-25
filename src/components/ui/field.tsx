import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const baseField =
  'w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors duration-150 hover:border-cream-400 focus:border-navy-500 focus:outline-none ' +
  'focus:ring-2 focus:ring-navy-500/15 disabled:opacity-50'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string | null
  leading?: ReactNode
  trailing?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, leading, trailing, className, id, ...props },
  ref
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(baseField, 'h-11', Boolean(leading) && 'pl-10', Boolean(trailing) && 'pr-10', error && 'border-coral-500 focus:border-coral-500 focus:ring-coral-500/15', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...props}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-coral-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-sm text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string | null
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className, id, ...props },
  ref
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(baseField, 'min-h-[88px] py-2.5 leading-relaxed', error && 'border-coral-500', className)}
        {...props}
      />
      {error ? (
        <p className="text-sm text-coral-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
})

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string | null
  children: ReactNode
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, className, children, id, ...props },
  ref
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        className={cn(baseField, 'h-11 appearance-none bg-[length:16px] pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235a6a8f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-sm text-coral-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
})
