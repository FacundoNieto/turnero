import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(req: Request) {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  const url = new URL(req.url)
  const search = url.search || ''

  const res = await fetch(`${BACKEND}/api/turnos${search}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  const body = await req.json().catch(() => ({}))

  const res = await fetch(`${BACKEND}/api/turnos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
