import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LeadMaster',
  description: 'Prospection B2B au Maroc',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
