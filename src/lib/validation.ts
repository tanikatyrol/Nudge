import { z } from 'zod'
import { isValidTimezone } from './time'
import type { RecurrenceRule } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

export const uuidSchema = z.string().regex(UUID_RE, 'Invalid id')

export const isoDateTimeSchema = z
  .string()
  .regex(ISO_RE, 'Expected an ISO 8601 date-time')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date')

export const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable()

export const timezoneSchema = z
  .string()
  .min(1)
  .refine(isValidTimezone, 'Unknown timezone')

export const recurrenceSchema = z.object({
  type: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']),
  interval: z.number().int().min(1).max(365).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
}) satisfies z.ZodType<RecurrenceRule>

export const reminderCreateSchema = z.object({
  title: z.string().trim().min(1, 'Give this reminder a title').max(200, 'Keep the title under 200 characters'),
  notes: z.string().trim().max(2000, 'Notes are limited to 2000 characters').nullish(),
  dueAt: nullableIsoDateTimeSchema.nullish(),
  isAllDay: z.boolean().default(false),
  timezone: timezoneSchema,
  recurrence: recurrenceSchema.default({ type: 'none', interval: 1, weekdays: [] }),
  categoryId: uuidSchema.nullish(),
})

export const reminderUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Give this reminder a title').max(200).optional(),
  notes: z.string().trim().max(2000).nullish(),
  dueAt: nullableIsoDateTimeSchema.nullish(),
  isAllDay: z.boolean().optional(),
  timezone: timezoneSchema.optional(),
  recurrence: recurrenceSchema.optional(),
  categoryId: uuidSchema.nullish(),
})

export const captureSchema = z.object({
  text: z.string().trim().min(1, 'Type something to remember').max(300, 'Keep captures under 300 characters'),
})

export const completeSchema = z.object({ done: z.boolean() })

export const snoozeSchema = z.object({
  preset: z.enum(['10m', '30m', '1h', '3h', 'tomorrow']),
})

export const listCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name your list').max(60, 'Keep list names under 60 characters'),
  icon: z.string().trim().min(1).max(8).default('📝'),
})

export const listUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().min(1).max(8).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const listItemCreateSchema = z.object({
  content: z.string().trim().min(1, 'Type an item').max(300, 'Keep items under 300 characters'),
})

export const listItemUpdateSchema = z.object({
  content: z.string().trim().min(1).max(300).optional(),
  isCompleted: z.boolean().optional(),
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name the category').max(40, 'Keep category names under 40 characters'),
  color: z.enum(['lilac', 'peach', 'sage', 'sky', 'butter', 'coral', 'navy']).default('navy'),
  icon: z.string().trim().min(1).max(40).default('tag'),
})

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.enum(['lilac', 'peach', 'sage', 'sky', 'butter', 'coral', 'navy']).optional(),
  icon: z.string().trim().min(1).max(40).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const hhmm = /^\d{2}:\d{2}$/

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Add your name').max(80, 'Keep names under 80 characters').optional(),
    timezone: timezoneSchema.optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    pushEnabled: z.boolean().optional(),
    briefingEnabled: z.boolean().optional(),
    briefingTime: z.string().regex(hhmm, 'Use HH:MM').refine((v) => {
      const [h, m] = v.split(':').map(Number)
      return h <= 23 && m <= 59
    }, 'Invalid time').optional(),
    onboarded: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update')

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(400).nullish(),
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().max(2048),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Type something to search for').max(100),
})

export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
