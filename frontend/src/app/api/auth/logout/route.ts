import { NextResponse } from 'next/server'

export async function POST() {
  const cookie = `access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;`
  return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
