// ══════════════════════════════════════════════════════════════════════════════
// Shared application types
// ══════════════════════════════════════════════════════════════════════════════

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurrenceRule {
  type: RecurrenceType
  /** every N days / weeks / months (1 = every) */
  interval: number
  /** 0 = Sunday … 6 = Saturday (used for weekly) */
  weekdays: number[]
}

export type CategoryColor =
  | 'lilac'
  | 'peach'
  | 'sage'
  | 'sky'
  | 'butter'
  | 'coral'
  | 'navy'

export type ThemeSetting = 'light' | 'dark' | 'system'

export interface Profile {
  id: string
  email: string | null
  displayName: string | null
  timezone: string
  theme: ThemeSetting
  pushEnabled: boolean
  briefingEnabled: boolean
  /** "HH:MM" local time */
  briefingTime: string
  onboarded: boolean
}

export interface Category {
  id: string
  name: string
  color: CategoryColor
  icon: string
  sortOrder: number
}

export interface SerializedReminder {
  id: string
  title: string
  notes: string | null
  /** ISO 8601 UTC instant, or null for someday reminders */
  dueAt: string | null
  isAllDay: boolean
  timezone: string
  recurrence: RecurrenceRule
  status: 'active' | 'completed'
  completedAt: string | null
  snoozedUntil: string | null
  categoryId: string | null
  createdAt: string
}

export interface SerializedEvent {
  id: string
  reminderId: string | null
  title: string
  categoryName: string | null
  kind: 'completed' | 'recurring_advanced' | 'notification_sent'
  occurredAt: string
}

export interface ListSummary {
  id: string
  name: string
  icon: string
  sortOrder: number
  items: ListItem[]
}

export interface ListItem {
  id: string
  content: string
  isCompleted: boolean
  completedAt: string | null
  position: number
}

// ── Supabase Database definition (hand-written to match 0001_init.sql) ────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          timezone: string
          theme: Database['public']['Enums']['theme']
          push_enabled: boolean
          briefing_enabled: boolean
          briefing_time: string
          onboarded_at: string | null
          last_briefing_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          timezone?: string
          theme?: Database['public']['Enums']['theme']
          push_enabled?: boolean
          briefing_enabled?: boolean
          briefing_time?: string
          onboarded_at?: string | null
          last_briefing_date?: string | null
        }
        Update: {
          email?: string | null
          display_name?: string | null
          timezone?: string
          theme?: Database['public']['Enums']['theme']
          push_enabled?: boolean
          briefing_enabled?: boolean
          briefing_time?: string
          onboarded_at?: string | null
          last_briefing_date?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: Database['public']['Enums']['category_color']
          icon: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: Database['public']['Enums']['category_color']
          icon?: string
          sort_order?: number
        }
        Update: {
          name?: string
          color?: Database['public']['Enums']['category_color']
          icon?: string
          sort_order?: number
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          notes: string | null
          due_at: string | null
          is_all_day: boolean
          timezone: string
          recurrence_type: Database['public']['Enums']['recurrence_type']
          recurrence_interval: number
          recurrence_weekdays: number[]
          status: Database['public']['Enums']['reminder_status']
          completed_at: string | null
          snoozed_until: string | null
          last_notified_for: string | null
          last_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          notes?: string | null
          due_at?: string | null
          is_all_day?: boolean
          timezone?: string
          recurrence_type?: Database['public']['Enums']['recurrence_type']
          recurrence_interval?: number
          recurrence_weekdays?: number[]
          status?: Database['public']['Enums']['reminder_status']
          completed_at?: string | null
        }
        Update: {
          category_id?: string | null
          title?: string
          notes?: string | null
          due_at?: string | null
          is_all_day?: boolean
          timezone?: string
          recurrence_type?: Database['public']['Enums']['recurrence_type']
          recurrence_interval?: number
          recurrence_weekdays?: number[]
          status?: Database['public']['Enums']['reminder_status']
          completed_at?: string | null
          snoozed_until?: string | null
          last_notified_for?: string | null
          last_notified_at?: string | null
        }
        Relationships: []
      }
      lists: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          sort_order?: number
        }
        Update: {
          name?: string
          icon?: string
          sort_order?: number
        }
        Relationships: []
      }
      list_items: {
        Row: {
          id: string
          list_id: string
          user_id: string
          content: string
          is_completed: boolean
          completed_at: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          content: string
          is_completed?: boolean
          completed_at?: string | null
          position?: number
        }
        Update: {
          content?: string
          is_completed?: boolean
          completed_at?: string | null
          position?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent?: string | null
        }
        Update: {
          p256dh?: string
          auth_key?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      reminder_events: {
        Row: {
          id: string
          user_id: string
          reminder_id: string | null
          reminder_title: string
          category_name: string | null
          kind: Database['public']['Enums']['event_kind']
          occurred_at: string
          meta: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          user_id: string
          reminder_id?: string | null
          reminder_title: string
          category_name?: string | null
          kind: Database['public']['Enums']['event_kind']
          occurred_at?: string
          meta?: Record<string, unknown> | null
        }
        Update: {
          reminder_title?: string
          category_name?: string | null
          kind?: Database['public']['Enums']['event_kind']
          meta?: Record<string, unknown> | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dispatch_batch: {
        Args: { p_now?: string }
        Returns: Json
      }
      get_briefing_batch: {
        Args: { p_now?: string }
        Returns: Json
      }
    }
    Enums: {
      theme: 'light' | 'dark' | 'system'
      category_color: 'lilac' | 'peach' | 'sage' | 'sky' | 'butter' | 'coral' | 'navy'
      recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
      reminder_status: 'active' | 'completed'
      event_kind: 'completed' | 'recurring_advanced' | 'notification_sent'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
