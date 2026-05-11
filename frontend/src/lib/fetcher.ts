export async function backendFetch(path: string, opts: RequestInit = {}) {
  const backend = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const url = `${backend}${path}`
  const res = await fetch(url, {
    credentials: 'include',
    ...opts,
  })
  if (res.status === 401) {
    // caller should handle
  }
  return res
}
