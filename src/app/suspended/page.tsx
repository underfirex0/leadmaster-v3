import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-gray-900 mb-2">Compte suspendu</h1>
        <p className="text-[13.5px] text-gray-500 mb-6">
          L&apos;accès à votre compte LeadMaster a été temporairement suspendu. Contactez votre administrateur ou notre support pour plus d&apos;informations.
        </p>
        <Link href="/login" className="text-[13px] font-semibold text-brand-600">← Retour à la connexion</Link>
      </div>
    </div>
  )
}
