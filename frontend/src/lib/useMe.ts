"use client"
import { useQuery } from '@tanstack/react-query'

async function fetchMe() {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.status === 401 || res.status === 403) throw new Error('unauth')
  if (!res.ok) throw new Error('Error fetching me')
  return res.json()
}

export function useMe() {
  return useQuery(['me'], fetchMe, { retry: false })
}

export default useMe
