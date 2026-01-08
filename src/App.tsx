import React, { useEffect, useState } from 'react'
import { createClient, Session } from '@supabase/supabase-js'
import SMSDashboard from './components/SMSDashboard'
import AuthForm from './components/AuthForm'
import LandingPage from './components/LandingPage'
import { ToastProvider } from './components/Toast'

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

function AppContent() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setShowAuth(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show landing page if not logged in and not showing auth
  if (!session && !showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />
  }

  // Show auth form if not logged in but auth is requested
  if (!session && showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <AuthForm supabase={supabase} onBack={() => setShowAuth(false)} />
      </div>
    )
  }

  // Show dashboard if logged in
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* Header with logout */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">BramkingNumbers Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {session.user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://t.me/bramkingnumber"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Support
              </a>
              <button
                onClick={() => supabase.auth.signOut()}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        <SMSDashboard supabase={supabase} user={session.user} />
      </div>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
