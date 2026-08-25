import { supabaseAdmin } from '@/lib/supabase/admin'

// Supabase/PostgREST .in('id', [...]) with hundreds of UUIDs can hit
// URL-length limits and silently return an empty/partial result — this
// is the exact class of bug that broke the old app at scale. Splitting
// into smaller batches sidesteps it entirely, regardless of the exact
// underlying limit on any given deployment.
const CHUNK_SIZE = 150

export async function fetchInChunks<T>(
  ids: string[],
  fetchChunk: (chunkIds: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE)
    const { data, error } = await fetchChunk(chunk)
    if (error) {
      console.error('fetchInChunks error:', error)
      continue
    }
    if (data) results.push(...data)
  }
  return results
}

export async function fetchCompaniesByIds(ids: string[], columns: string) {
  return fetchInChunks(ids, chunkIds =>
    supabaseAdmin.from('companies_v2').select(columns).in('id', chunkIds)
  )
}
