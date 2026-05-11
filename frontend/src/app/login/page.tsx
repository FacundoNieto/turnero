"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

export default function LoginPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.detail || 'Credenciales inválidas')
        setLoading(false)
        return
      }
      // Invalidate / refresh cached `me` before navigating so Sidebar
      // doesn't show the previous user's links.
      try {
        await queryClient.invalidateQueries({ queryKey: ['me'], refetchInactive: true })
      } catch (e) {
        // ignore
      }
      router.push('/dashboard')
    } catch (err) {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Iniciar sesión</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm">Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        {loading && <div className="text-sm text-gray-600">Iniciando sesión...</div>}
        <div>
          <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Entrar</button>
        </div>
      </form>
    </div>
  )
}
