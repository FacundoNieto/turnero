"use client"
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-3 px-4 text-sm text-gray-600">Sukha · Frontend MVP</div>
    </footer>
  )
}
