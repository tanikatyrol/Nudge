import type { Database, SerializedEvent, SerializedReminder, Category, ListSummary, ListItem, RecurrenceRule } from '@/types'

type ReminderRow = Database['public']['Tables']['reminders']['Row']
type EventRow = Database['public']['Tables']['reminder_events']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type ListRow = Database['public']['Tables']['lists']['Row']
type ListItemRow = Database['public']['Tables']['list_items']['Row']

export function serializeReminder(r: ReminderRow): SerializedReminder {
  const recurrence: RecurrenceRule = {
    type: r.recurrence_type,
    interval: r.recurrence_interval,
    weekdays: r.recurrence_weekdays ?? [],
  }
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    dueAt: r.due_at,
    isAllDay: r.is_all_day,
    timezone: r.timezone,
    recurrence,
    status: r.status,
    completedAt: r.completed_at,
    snoozedUntil: r.snoozed_until,
    categoryId: r.category_id,
    createdAt: r.created_at,
  }
}

export function serializeEvent(e: EventRow): SerializedEvent {
  return {
    id: e.id,
    reminderId: e.reminder_id,
    title: e.reminder_title,
    categoryName: e.category_name,
    kind: e.kind,
    occurredAt: e.occurred_at,
  }
}

export function serializeCategory(c: CategoryRow): Category {
  return {
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    sortOrder: c.sort_order,
  }
}

export function serializeListItem(i: ListItemRow): ListItem {
  return {
    id: i.id,
    content: i.content,
    isCompleted: i.is_completed,
    completedAt: i.completed_at,
    position: i.position,
  }
}

export function serializeList(l: ListRow, items: ListItemRow[]): ListSummary {
  return {
    id: l.id,
    name: l.name,
    icon: l.icon,
    sortOrder: l.sort_order,
    items: items.map(serializeListItem),
  }
}
