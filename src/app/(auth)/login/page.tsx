'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
      return
    }
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Connexion</h1>
      <p className="text-[13px] text-gray-400 mb-5">Accédez à votre compte LeadMaster.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-[14px] hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Se connecter
        </button>
      </form>
      <p className="text-[13px] text-gray-500 text-center mt-4">
        Pas encore de compte ? <Link href="/register" className="text-brand-600 font-semibold">Créer un compte</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
