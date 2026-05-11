import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(req: Request, { params }: { params: { turnoId: string; action: string } }) {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  const { turnoId, action } = params
  const url = `${BACKEND}/api/turnos/${encodeURIComponent(turnoId)}/${encodeURIComponent(action)}`

  // forward body if any
  const bodyText = await req.text().catch(() => '')

  const headers: any = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (bodyText) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyText || undefined,
  })

  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
