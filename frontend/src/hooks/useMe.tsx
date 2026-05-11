"use client"
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

async function fetchMe() {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401 || res.status === 403) throw { status: res.status }
  if (!res.ok) throw new Error('Error fetching me')
  return res.json()
}

export function useMe() {
  const router = useRouter()
  const q = useQuery(['me'], fetchMe, {
    retry: false,
    onError: (err: any) => {
      if (err && err.status && (err.status === 401 || err.status === 403)) {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => router.push('/login'))
      }
    },
  })
  return q
}
