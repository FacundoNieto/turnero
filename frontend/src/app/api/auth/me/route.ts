export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// export async function GET() {
//   const cookieStore = cookies()
//   const token = cookieStore.get('access_token')?.value

//   const res = await fetch(`${BACKEND}/api/auth/me`, {
//     method: 'GET',
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   })

//   const text = await res.text()
//   return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
// }
export async function GET() {
  // console.log('==VALOR DE LA VARIABLE DE ENTORNO BACKEND ==:',BACKEND)
  // TRUCO: En vez de loguear, devolvemos el valor directo a la pantalla para testear
  return NextResponse.json({ 
    mensaje: "Che, Vercel está leyendo esto:", 
    valor_variable_env: BACKEND 
  })
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('access_token')?.value

    const res = await fetch(`${BACKEND}/api/auth/me`, {
      method: 'GET',
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
      cache: 'no-store',
    })

    const text = await res.text()

    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    console.error('AUTH_ME_ERROR:', err)

    return NextResponse.json(
      { error: 'backend unreachable' },
      { status: 500 }
    )
  }
}