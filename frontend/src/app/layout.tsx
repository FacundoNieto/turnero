import './globals.css'
import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import Providers from '../components/Providers'

export const metadata = {
  title: 'Sukha - Gestión de Turnos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <main className="flex-1 p-6">{children}</main>
            </div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
