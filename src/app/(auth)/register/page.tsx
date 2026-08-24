'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, company_name: companyName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    // profiles row is created by a DB trigger on auth.users insert (see
    // schema's handle_new_user trigger) — nothing to do here.
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Vérifiez votre email</h1>
        <p className="text-[13px] text-gray-500">Un lien de confirmation vous a été envoyé. Cliquez dessus pour activer votre compte.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Créer un compte</h1>
      <p className="text-[13px] text-gray-400 mb-5">100 crédits offerts à l&apos;inscription.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input placeholder="Entreprise (optionnel)" value={companyName} onChange={e => setCompanyName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-[14px] hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Créer mon compte
        </button>
      </form>
      <p className="text-[13px] text-gray-500 text-center mt-4">
        Déjà un compte ? <Link href="/login" className="text-brand-600 font-semibold">Se connecter</Link>
      </p>
    </div>
  )
}
