import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

async function atlasFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = new Request(input, init)
  const response = await fetch(request.clone())

  if (response.status !== 401 || !client) return response

  let body: { code?: string; message?: string } | null = null
  try {
    body = await response.clone().json() as { code?: string; message?: string }
  } catch {
    return response
  }

  const issuedInFuture = body?.code === 'PGRST303' && String(body?.message || '').toLowerCase().includes('jwt issued at future')
  if (!issuedInFuture) return response

  // PostgREST can briefly reject an otherwise valid session when its clock and
  // the auth service are out of sync. Refresh once and retry instead of
  // leaving the entire Atlas editor stuck on a transient 401.
  await wait(750)
  const { data, error } = await client.auth.refreshSession()
  const token = data.session?.access_token
  if (error || !token) return response

  const headers = new Headers(request.headers)
  headers.set('authorization', `Bearer ${token}`)

  // This is the browser's native fetch, not the Supabase wrapper, so the retry
  // cannot loop back through atlasFetch.
  return fetch(new Request(request, { headers }))
}

client = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: atlasFetch,
    },
  },
)

export const supabase = client
