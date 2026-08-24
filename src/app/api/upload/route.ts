export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// File upload storage (Supabase Storage bucket) isn't wired up in this
// environment — this records a "custom request" description only.
// Adding real file upload needs a Storage bucket + signed upload URLs.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { description } = await request.json()
  if (!description?.trim()) return NextResponse.json({ error: 'Description requise' }, { status: 400 })

  const { error } = await supabase.from('data_upload_requests').insert({
    user_id: user.id, request_type: 'custom_request', request_description: description.trim(), status: 'pending',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
