"use client"
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useMe } from '../hooks/useMe'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { data, isLoading } = useMe()

  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      router.push('/login')
    }
  }

  // Reset loggingOut when we detect a logged-in user (prevents stale "Cerrando sesión..." text)
  useEffect(() => {
    if (data?.user) setLoggingOut(false)
  }, [data])

  if (pathname === '/login') return null

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto py-3 px-4 flex items-center justify-between">
        <div className="text-lg font-semibold">Sukha</div>
        <div className="flex items-center gap-4">
          {data?.user?.username && <div className="text-sm text-gray-700">Hola, {data.user.username}</div>}
          {isLoading && <div className="text-sm text-gray-500">Cargando...</div>}
          {/* {loggingOut && <div className="text-sm text-gray-600">Cerrando sesión...</div>} */}
          <button onClick={logout} disabled={loggingOut} className="text-sm text-gray-600">Cerrar sesión</button>
        </div>
      </div>
    </header>
  )
}
