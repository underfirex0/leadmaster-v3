import { createClient } from '@/lib/supabase/server'
import { isFeatureAllowed } from '@/lib/team'
import { SearchWizardClient } from './SearchWizardClient'
import { Lock } from 'lucide-react'

// Server-side gate: checked BEFORE the client wizard ever mounts, so a
// member whose 'search' access has been disabled by their team owner
// sees a clear blocked message instead of a fully working search UI
// whose actions would just fail with a 403 (that's still true too, as a
// second layer of defense — but this is what makes the block visible
// and honest, not silently broken).
export default async function SearchWizardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (!(await isFeatureAllowed(user.id, 'search'))) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Lock className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium mb-1">Accès désactivé</p>
          <p className="text-[13px] text-gray-400">Votre administrateur a désactivé l&apos;accès à la recherche pour votre compte.</p>
        </div>
      </div>
    )
  }

  return <SearchWizardClient />
}
