import { NextRequest } from 'next/server'
import { ApiError, jsonOk, requireAuth, withRoute, readJson } from '@/lib/api'
import { captureSchema } from '@/lib/validation'
import { parseReminder, type ParseResult } from '@/lib/parse'
import { categoryIdForKey } from '@/lib/categories'
import { normalizeRecurrence } from '@/lib/server/reminders'
import { aiParse } from '@/lib/server/ai-parse'
import { serializeCategory } from '@/lib/serialize'
import type { Category } from '@/types'

export const runtime = 'nodejs'

export const POST = withRoute(async (request: NextRequest) => {
  const { supabase, profile } = await requireAuth()
  const { text } = await readJson(request, captureSchema)

  const now = new Date()
  let parsed: ParseResult = parseReminder(text, now, profile.timezone)

  // Optional AI assist when configured and the rule-based parser was unsure.
  if (process.env.OPENAI_API_KEY && parsed.needsConfirm) {
    try {
      parsed = await aiParse(text, now, profile.timezone)
    } catch {
      // graceful fallback — rule-based result stands
    }
  }

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', profile.id)
    .order('sort_order')
  const categories: Category[] = (categoryRows ?? []).map(serializeCategory)

  // ── list intent ────────────────────────────────────────────────────────────
  if (parsed.listName) {
    const listName = parsed.listName
    let { data: list } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', profile.id)
      .ilike('name', listName)
      .maybeSingle()

    if (!list) {
      const { data: created, error } = await supabase
        .from('lists')
        .insert({ user_id: profile.id, name: listName, icon: listName === 'Shopping' ? '🛒' : '📝', sort_order: 0 })
        .select()
        .single()
      if (error) throw new ApiError(500, 'Could not create the list.')
      list = created
    }

    const { data: lastItem } = await supabase
      .from('list_items')
      .select('position')
      .eq('list_id', list.id)
      .order('position', { ascending: false })
      .limit(1)
    const position = (lastItem?.[0]?.position ?? -1) + 1

    const { error: itemError } = await supabase.from('list_items').insert({
      list_id: list.id,
      user_id: profile.id,
      content: parsed.title,
      position,
    })
    if (itemError) throw new ApiError(500, 'Could not add the item to the list.')

    return jsonOk({ kind: 'list_item', title: parsed.title, listName: list.name })
  }

  // ── reminder ───────────────────────────────────────────────────────────────
  const recurrence = normalizeRecurrence(parsed.recurrence, parsed.dueAtIso, profile.timezone)
  const categoryId = categoryIdForKey(parsed.categoryKey, categories)

  const { data: created, error } = await supabase
    .from('reminders')
    .insert({
      user_id: profile.id,
      title: parsed.title,
      due_at: parsed.dueAtIso,
      is_all_day: parsed.isAllDay,
      timezone: profile.timezone,
      recurrence_type: recurrence.type,
      recurrence_interval: recurrence.interval,
      recurrence_weekdays: recurrence.weekdays,
      category_id: categoryId,
    })
    .select()
    .single()

  if (error) {
    throw new ApiError(500, 'Could not save the reminder. Please try again.')
  }

  return jsonOk({
    kind: 'reminder',
    id: created.id,
    title: parsed.title,
    dueAtIso: parsed.dueAtIso,
  })
})
