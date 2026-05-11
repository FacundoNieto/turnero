import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET() {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  const res = await fetch(`${BACKEND}/api/auth/me`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
