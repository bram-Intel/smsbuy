import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { CreditCard, Plus } from 'lucide-react'

interface WalletCardProps {
  supabase: SupabaseClient
  user: any
}

interface Profile {
  id: string
  email: string
  balance: number
  balance_naira: number
}

export default function WalletCard({ supabase, user }: WalletCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [customAmount, setCustomAmount] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [koraLoaded, setKoraLoaded] = useState(false)

  useEffect(() => {
    loadProfile()
    
    // Check if Kora is already loaded
    if (typeof window.Korapay !== 'undefined') {
      setKoraLoaded(true)
      return
    }

    // Wait for Kora script to load
    const checkKora = setInterval(() => {
      if (typeof window.Korapay !== 'undefined') {
        setKoraLoaded(true)
        clearInterval(checkKora)
      }
    }, 100)

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkKora)
      if (typeof window.Korapay === 'undefined') {
        console.error('Kora payment system failed to load')
      }
    }, 10000)

    return () => {
      clearInterval(checkKora)
      clearTimeout(timeout)
    }
  }, [])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error: any) {
      console.error('Failed to load wallet:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTopUp = async (amount: number) => {
    try {
      setLoading(true)
      
      // Check if Kora script is loaded first
      if (!koraLoaded || typeof window.Korapay === 'undefined') {
        alert('Payment system is still loading... Please wait a moment and try again.')
        setLoading(false)
        return
      }
      
      // Call Kora payment function
      const { data, error } = await supabase.functions.invoke('kora-payment', {
        body: {
          amount: amount,
          user_id: user.id,
          email: profile?.email || user.email
        }
      })

      if (error) {
        console.error('Payment error:', error)
        alert('Payment failed: ' + error.message)
        setLoading(false)
        return
      }

      console.log('Kora payment response:', data)

      if (data.success && data.public_key && data.reference) {
        // Initialize Kora modal checkout
        window.Korapay.initialize({
          key: data.public_key,
          reference: data.reference,
          amount: amount, // Amount in Naira
          currency: 'NGN',
          customer: {
            name: (profile?.email || user.email).split('@')[0] || 'Customer',
            email: profile?.email || user.email
          },
          onSuccess: (response: any) => {
            console.log('Payment successful:', response)
            alert('✅ Payment successful! Your wallet will be updated shortly.')
            setTimeout(() => loadProfile(), 2000)
          },
          onClose: () => {
            console.log('Payment modal closed')
            setLoading(false)
          }
        })
      } else {
        alert(data.error || 'Failed to initiate payment')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      alert(error.message || 'Payment error occurred')
      setLoading(false)
    } finally {
      setShowCustomInput(false)
      setCustomAmount('')
    }
  }

  const handleCustomTopUp = () => {
    const amount = parseInt(customAmount)
    if (isNaN(amount) || amount < 500) {
      alert('Please enter a valid amount (minimum ₦500)')
      return
    }
    handleTopUp(amount)
  }

  if (loading && !profile) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
        <div className="h-40 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <p className="text-red-600">Failed to load wallet information</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="opacity-90 mb-2">Available Balance</p>
          <h3 className="text-4xl font-bold">₦{profile.balance_naira.toLocaleString()}</h3>
          <p className="text-sm opacity-75 mt-1">${(profile.balance_naira / 1500).toFixed(2)} USD</p>
        </div>
        <CreditCard className="w-12 h-12 opacity-50" />
      </div>

      {/* Quick Top-Up Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => handleTopUp(1000)}
          disabled={loading || !koraLoaded}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-lg font-medium transition-all disabled:opacity-50"
        >
          ₦1,000
        </button>
        <button
          onClick={() => handleTopUp(5000)}
          disabled={loading || !koraLoaded}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-lg font-medium transition-all disabled:opacity-50"
        >
          ₦5,000
        </button>
        <button
          onClick={() => handleTopUp(10000)}
          disabled={loading || !koraLoaded}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-lg font-medium transition-all disabled:opacity-50"
        >
          ₦10,000
        </button>
      </div>

      {/* Custom Amount */}
      {showCustomInput ? (
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Enter amount"
            className="flex-1 px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            min="500"
          />
          <button
            onClick={handleCustomTopUp}
            disabled={loading || !koraLoaded}
            className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-white/90 transition-all disabled:opacity-50"
          >
            Pay
          </button>
          <button
            onClick={() => {
              setShowCustomInput(false)
              setCustomAmount('')
            }}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustomInput(true)}
          disabled={!koraLoaded}
          className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Custom Amount
        </button>
      )}

      <div className="pt-6 border-t border-white/20">
        <p className="text-sm opacity-75">Email: {profile.email}</p>
      </div>
    </div>
  )
}
