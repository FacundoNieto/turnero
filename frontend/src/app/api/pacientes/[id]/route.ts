import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value
  const { id } = params
  const body = await req.json().catch(() => ({}))

  const res = await fetch(`${BACKEND}/api/pacientes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
