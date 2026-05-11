"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMe } from '../hooks/useMe'

export default function Sidebar() {
  const pathname = usePathname()
  const { data, isLoading } = useMe()

  // Hide sidebar on login and root routes
  if (pathname === '/login' || pathname === '/') return null

  const roles: string[] = data?.roles || []

  const isAdmin = roles.includes('ADMIN')
  const isRecep = roles.includes('RECEPCIONISTA')
  const isProfesional = roles.includes('PROFESIONAL')
  const isPaciente = roles.includes('PACIENTE')

  return (
    <aside className="w-64 border-r bg-white">
      <nav className="p-4">
        <ul className="space-y-2">
          <li><Link href="/dashboard" className="block p-2 rounded hover:bg-gray-100">Dashboard</Link></li>
          {(isAdmin || isRecep) && <li><Link href="/turnos" className="block p-2 rounded hover:bg-gray-100">Turnos</Link></li>}
          {(isAdmin || isRecep) && <li><Link href="/pacientes" className="block p-2 rounded hover:bg-gray-100">Pacientes</Link></li>}
          {isAdmin && <li><Link href="/admin/usuarios" className="block p-2 rounded hover:bg-gray-100">Usuarios</Link></li>}
          {isProfesional && <li><Link href="/turnos" className="block p-2 rounded hover:bg-gray-100">Mi Agenda</Link></li>}
          {isPaciente && <li><Link href="/turnos" className="block p-2 rounded hover:bg-gray-100">Mis Turnos</Link></li>}
        </ul>
        {isLoading && <div className="mt-4 text-sm text-gray-500">Cargando permisos...</div>}
      </nav>
    </aside>
  )
}
