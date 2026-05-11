import { NextResponse } from 'next/server'

function b64UrlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  while (input.length % 4) input += '='
  return Buffer.from(input, 'base64').toString('utf8')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const backend = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const r = await fetch(`${backend}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: body.username || '', password: body.password || '' }),
  })

  const text = await r.text()
  if (!r.ok) {
    let detail = text
    try { detail = JSON.parse(text) } catch {}
    return new NextResponse(JSON.stringify(detail), { status: r.status, headers: { 'Content-Type': 'application/json' } })
  }

  let j: any = {}
  try { j = JSON.parse(text) } catch {}
  const token = j.access_token
  if (!token) {
    return new NextResponse(JSON.stringify({ detail: 'No access_token in response' }), { status: 500 })
  }

  let maxAge = undefined
  try {
    const parts = token.split('.')
    if (parts.length >= 2) {
      const payload = JSON.parse(b64UrlDecode(parts[1]))
      if (payload.exp && payload.iat) {
        maxAge = Number(payload.exp) - Math.floor(Date.now() / 1000)
        if (maxAge < 0) maxAge = 0
      }
    }
  } catch (e) {}

  let cookie = `access_token=${token}; Path=/; HttpOnly; SameSite=Lax;`
  if (process.env.NODE_ENV === 'production') cookie += ' Secure;'
  if (typeof maxAge === 'number') cookie += ` Max-Age=${maxAge};`

  return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
