import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ListDetail } from '@/components/lists/list-detail'
import { createSupabaseServerClient, getProfile } from '@/lib/supabase/server'
import { serializeList } from '@/lib/serialize'
import type { ListSummary } from '@/types'

export const metadata: Metadata = { title: 'List' }

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const { data: listRow } = await supabase
    .from('lists')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!listRow) notFound()

  const { data: itemRows } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', id)
    .order('position', { ascending: true })

  const list: ListSummary = serializeList(listRow, itemRows ?? [])

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link
        href="/lists"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All lists
      </Link>
      <ListDetail list={list} />
    </div>
  )
}
