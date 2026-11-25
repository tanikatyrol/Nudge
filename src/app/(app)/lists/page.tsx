import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ListsView } from '@/components/lists/lists-view'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeList } from '@/lib/serialize'
import type { ListSummary } from '@/types'

export const metadata: Metadata = { title: 'Lists' }

export default async function ListsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const [listsRes, itemsRes] = await Promise.all([
    supabase
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('list_items')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true }),
  ])

  const itemsByList = new Map<string, typeof itemsRes.data>()
  for (const item of itemsRes.data ?? []) {
    const bucket = itemsByList.get(item.list_id) ?? []
    bucket.push(item)
    itemsByList.set(item.list_id, bucket)
  }

  const lists: ListSummary[] = (listsRes.data ?? []).map((l) =>
    serializeList(l, itemsByList.get(l.id) ?? [])
  )

  return <ListsView lists={lists} />
}
