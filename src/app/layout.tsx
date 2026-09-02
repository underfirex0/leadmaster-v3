import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LeadMaster — Prospection B2B Maroc',
  description: 'Accédez aux coordonnées de milliers d\'entreprises marocaines vérifiées. Filtrez, déverrouillez, prospectez. 100 crédits offerts à l\'inscription.',
  keywords: ['prospection', 'B2B', 'Maroc', 'données entreprises', 'CRM', 'leads'],
  openGraph: {
    title: 'LeadMaster — Prospection B2B Maroc',
    description: 'La plateforme de revenue intelligence pour le marché marocain.',
    type: 'website',
  },
  // No icons field here — the icon.png file in this folder (App Router
  // convention) is picked up automatically and takes precedence. Don't
  // add an icons.icon override here or it'll fight with that file.
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Caveat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
