import React, { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Phone, Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import WalletCard from './WalletCard'
import { useToast } from './Toast'

interface SMSDashboardProps {
  supabase: SupabaseClient
  user: any
}

interface Order {
  id: string
  phone_number: string | null
  otp_code: string | null
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  service: string
  country: string
  cost: number
  provider_order_id: string | null
  timeout_at: string
  refund_reason: string | null
  refund_amount: number | null
  created_at: string
}

interface Rental {
  id: string
  phone_number: string | null
  rental_code: string | null
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  country: string
  days: number
  cost: number
  expires_at: string
  created_at: string
}

interface RentalMessage {
  from: string
  message: string
  timestamp: number
}

interface ESIM {
  id: string
  country: string
  data_amount: string
  days: number
  cost: number
  qr_code: string | null
  activation_code: string | null
  iccid: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  data_used: string | null
  data_remaining: string | null
  expires_at: string
  created_at: string
}

interface Profile {
  id: string
  email: string
  balance: number
  balance_naira: number
}

interface ServicePricing {
  service: string
  country: string
  total_price: number
  provider_cost: number
  markup: number
}

// Helper function to format service names for display
const formatServiceName = (service: string): string => {
  const specialCases: Record<string, string> = {
    'whatsapp': 'WhatsApp',
    'telegram': 'Telegram',
    'instagram': 'Instagram',
    'facebook': 'Facebook',
    'tiktok': 'TikTok',
    'snapchat': 'Snapchat',
    'googlevoice': 'Google Voice',
    'linkedin': 'LinkedIn',
    'twitter': 'Twitter',
    'discord': 'Discord',
    'signal': 'Signal',
    'viber': 'Viber',
    'wechat': 'WeChat',
    'line': 'LINE',
    'kakao': 'KakaoTalk',
    'yahoo': 'Yahoo',
    'microsoft': 'Microsoft',
    'amazon': 'Amazon',
    'uber': 'Uber',
    'airbnb': 'Airbnb',
    'netflix': 'Netflix',
    'spotify': 'Spotify',
    'truthsocial': 'Truth Social',
    'ok': 'OK.ru',
    'vk': 'VK'
  }
  
  return specialCases[service.toLowerCase()] || 
         service.charAt(0).toUpperCase() + service.slice(1)
}

// Helper function to format country names for display
const formatCountryName = (country: string): string => {
  // Just capitalize first letter - show as-is from API
  return country.charAt(0).toUpperCase() + country.slice(1)
}

export default function SMSDashboard({ supabase, user }: SMSDashboardProps) {
  const { showToast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [pricing, setPricing] = useState<ServicePricing[]>([])
  const [availableServices, setAvailableServices] = useState<string[]>([])
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [checkingOrders, setCheckingOrders] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'one-time' | 'rentals' | 'free' | 'esim'>('one-time')
  const [rentalDays, setRentalDays] = useState(7)
  const [rentalCountry, setRentalCountry] = useState('usa')
  const [rentalMessages, setRentalMessages] = useState<Record<string, RentalMessage[]>>({})
  const [checkingRentals, setCheckingRentals] = useState<Set<string>>(new Set())
  const [esims, setEsims] = useState<ESIM[]>([])
  const [esimCountry, setEsimCountry] = useState('usa')
  const [esimData, setEsimData] = useState('1GB')
  const [esimDays, setEsimDays] = useState(7)

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadProfile()
      loadOrders()
      loadRentals()
      loadEsims()
      loadPricing()
    }
    
    // Subscribe to real-time order updates
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id ? payload.new as Order : order
          ))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) setProfile(data)
  }

  const loadOrders = async () => {
    if (!user) return

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
  }

  const loadRentals = async () => {
    if (!user) return

    const { data } = await supabase
      .from('rentals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setRentals(data)
  }

  const loadEsims = async () => {
    if (!user) return

    const { data } = await supabase
      .from('esims')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setEsims(data)
  }

  const loadPricing = async () => {
    // Priority countries
    const priorityCountries = [
      'usa', 'canada', 'england', 'germany', 'mexico', 
      'spain', 'southafrica', 'france', 'italy', 'australia',
      'india', 'brazil', 'nigeria', 'kenya', 'philippines'
    ]
    
    // Popular services
    const popularServices = [
      'whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok',
      'twitter', 'google', 'microsoft', 'amazon', 'uber'
    ]
    
    const { data, error } = await supabase
      .from('service_pricing')
      .select('*')
      .eq('active', true)
      .in('country', priorityCountries)
      .in('service', popularServices)

    console.log('=== PRICING DATA DEBUG ===')
    console.log('Error:', error)
    console.log('Data length:', data?.length)
    console.log('Full data:', data)

    if (data && data.length > 0) {
      setPricing(data)
      
      // Extract unique services and sort alphabetically
      const services = Array.from(new Set(data.map(p => p.service))).sort()
      console.log('Available services:', services)
      setAvailableServices(services)
      
      // Set default service to first available (or whatsapp if available)
      const defaultService = services.includes('whatsapp') ? 'whatsapp' : services[0]
      console.log('Default service:', defaultService)
      setSelectedService(defaultService)
      
      // Extract countries for the default service
      const countriesForService = data
        .filter(p => p.service === defaultService)
        .map(p => p.country)
      console.log('Countries for', defaultService, ':', countriesForService)
      setAvailableCountries(countriesForService)
      
      // Set default country
      if (countriesForService.length > 0) {
        const defaultCountry = countriesForService.includes('usa') ? 'usa' : countriesForService[0]
        console.log('Default country:', defaultCountry)
        setSelectedCountry(defaultCountry)
      }
    }
  }

  const getCurrentPrice = () => {
    const currentPricing = pricing.find(p => 
      p.service === selectedService && p.country === selectedCountry
    )
    return currentPricing?.total_price || 0
  }

  // Filter services based on search
  const getFilteredServices = () => {
    if (!serviceSearch.trim()) {
      // Show top popular services if no search
      const popularServices = [
        'whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok',
        'snapchat', 'discord', 'signal', 'twitter', 'google'
      ]
      const availablePopular = popularServices.filter(s => availableServices.includes(s))
      
      if (availablePopular.length > 0) {
        return availablePopular
      }
      
      return availableServices.slice(0, 10)
    }
    
    // Filter by search term
    const searchLower = serviceSearch.toLowerCase()
    return availableServices.filter(service => 
      service.toLowerCase().includes(searchLower) ||
      formatServiceName(service).toLowerCase().includes(searchLower)
    )
  }

  // Update available countries when service changes
  const handleServiceChange = (service: string) => {
    console.log('=== SERVICE CHANGED ===')
    console.log('New service:', service)
    setSelectedService(service)
    setCountrySearch('') // Clear search when service changes
    
    // Get countries available for this service
    const countriesForService = pricing
      .filter(p => p.service === service)
      .map(p => p.country)
    
    console.log('Countries for', service, ':', countriesForService)
    console.log('Total countries:', countriesForService.length)
    
    setAvailableCountries(countriesForService)
    
    // Set default country to first favorite that's available
    if (countriesForService.length > 0) {
      const favorites = ['usa', 'canada', 'england', 'nigeria', 'india']
      const defaultCountry = favorites.find(c => countriesForService.includes(c)) || countriesForService[0]
      console.log('Setting default country to:', defaultCountry)
      setSelectedCountry(defaultCountry)
    }
  }

  // Filter countries based on search
  const getFilteredCountries = () => {
    console.log('=== GET FILTERED COUNTRIES ===')
    console.log('Available countries:', availableCountries.length)
    console.log('Country search:', countrySearch)
    console.log('Selected country:', selectedCountry)
    
    let filtered: string[]
    
    if (!countrySearch.trim()) {
      // Show top 5 favorites if available, otherwise first 5
      const favorites = ['usa', 'canada', 'england', 'nigeria', 'india']
      const favoriteCountries = favorites.filter(c => availableCountries.includes(c))
      
      console.log('Favorites found:', favoriteCountries)
      
      if (favoriteCountries.length > 0) {
        filtered = favoriteCountries
      } else {
        filtered = availableCountries.slice(0, 5)
      }
    } else {
      // Filter by search term
      const searchLower = countrySearch.toLowerCase()
      filtered = availableCountries.filter(country => 
        country.toLowerCase().includes(searchLower)
      )
    }
    
    console.log('Filtered countries:', filtered)
    
    // If selected country is not in filtered list, select the first one
    if (filtered.length > 0 && !filtered.includes(selectedCountry)) {
      console.log('Selected country not in filtered list, updating to:', filtered[0])
      // Use setTimeout to avoid state update during render
      setTimeout(() => setSelectedCountry(filtered[0]), 0)
    }
    
    return filtered
  }

  const buyNumber = async () => {
    if (!profile) return
    
    const currentPrice = getCurrentPrice()
    if (profile.balance_naira < currentPrice) {
      showToast('warning', 'Insufficient Balance', `You need ₦${currentPrice} but have ₦${profile.balance_naira}`)
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('purchase-number', {
        body: {
          service: selectedService,
          country: selectedCountry,
          user_id: user.id
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        showToast('error', 'Purchase Failed', error.message || 'Unable to connect to server')
        return
      }

      if (data.success) {
        // Refresh profile balance and orders
        await Promise.all([loadProfile(), loadOrders()])
        
        // Show success message with details
        showToast('success', '🎉 Purchase Successful', `📱 ${data.phone_number} • Cost: ₦${data.cost} • Balance: ₦${data.remaining_balance}`)
      } else {
        // Handle different error types with professional messaging
        let errorMessage = data.error || 'Unknown error occurred'
        let toastType: 'error' | 'warning' = 'error'
        
        if (data.refunded) {
          errorMessage = `${errorMessage} • ✅ Refund: ₦${data.cost || currentPrice} credited back`
          toastType = 'warning'
          // Refresh balance to show refund
          await loadProfile()
        }
        
        showToast(toastType, 'Purchase Failed', errorMessage)
      }
    } catch (error) {
      console.error('Error buying number:', error)
      showToast('error', 'Purchase Failed', error instanceof Error ? error.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const buyRental = async () => {
    if (!profile) return
    
    const dailyRate = 1500 // ₦1,500 per day
    const totalCost = dailyRate * rentalDays
    
    if (profile.balance_naira < totalCost) {
      showToast('warning', 'Insufficient Balance', `You need ₦${totalCost.toLocaleString()} but have ₦${profile.balance_naira.toLocaleString()}`)
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('purchase-rental', {
        body: {
          country: rentalCountry,
          days: rentalDays,
          user_id: user.id
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        showToast('error', 'Purchase Failed', error.message || 'Unable to connect to server')
        return
      }

      if (data.success) {
        // Refresh profile balance and rentals
        await Promise.all([loadProfile(), loadRentals()])
        
        // Show success message with details
        showToast('success', '🎉 Rental Activated', `📱 ${data.phone_number} • Duration: ${data.days} days • Cost: ₦${data.cost.toLocaleString()} • Balance: ₦${data.remaining_balance.toLocaleString()}`)
      } else {
        // Handle different error types with professional messaging
        let errorMessage = data.error || 'Unknown error occurred'
        let toastType: 'error' | 'warning' = 'error'
        
        if (data.refunded) {
          errorMessage = `${errorMessage} • ✅ Refund: ₦${data.cost || totalCost} credited back`
          toastType = 'warning'
          // Refresh balance to show refund
          await loadProfile()
        }
        
        showToast(toastType, 'Purchase Failed', errorMessage)
      }
    } catch (error) {
      console.error('Error buying rental:', error)
      showToast('error', 'Purchase Failed', error instanceof Error ? error.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getFreeSMS = async () => {
    if (!selectedService || !selectedCountry) {
      showToast('warning', 'Invalid Selection', 'Please select a service and country')
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('get-free-sms', {
        body: {
          service: selectedService,
          country: selectedCountry,
          user_id: user.id
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        showToast('error', 'Request Failed', error.message || 'Unable to connect to server')
        return
      }

      if (data.success) {
        // Refresh orders
        await loadOrders()
        
        // Show success message with details
        showToast('success', '🆓 Free Number Assigned', `📱 ${data.phone_number} • Cost: FREE • Send your OTP now!`)
      } else {
        showToast('info', 'No Free Numbers', data.error || 'No free numbers available for this service/country combination')
      }
    } catch (error) {
      console.error('Error getting free SMS:', error)
      showToast('error', 'Request Failed', error instanceof Error ? error.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const buyESIM = async () => {
    if (!profile) return
    
    const pricingMap: Record<string, number> = {
      '1GB': 3000,
      '3GB': 7500,
      '5GB': 12000,
      '10GB': 20000,
      '20GB': 35000
    }
    
    const totalCost = pricingMap[esimData] || 3000
    
    if (profile.balance_naira < totalCost) {
      showToast('warning', 'Insufficient Balance', `You need ₦${totalCost.toLocaleString()} but have ₦${profile.balance_naira.toLocaleString()}`)
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('purchase-esim', {
        body: {
          country: esimCountry,
          data_amount: esimData,
          days: esimDays,
          user_id: user.id
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        showToast('error', 'Purchase Failed', error.message || 'Unable to connect to server')
        return
      }

      if (data.success) {
        // Refresh profile balance and esims
        await Promise.all([loadProfile(), loadEsims()])
        
        // Show success message with details
        showToast('success', '🎉 eSIM Purchased', `📶 ${data.data_amount} • Duration: ${data.days} days • Cost: ₦${data.cost.toLocaleString()} • Balance: ₦${data.remaining_balance.toLocaleString()}`)
      } else {
        // Handle different error types with professional messaging
        let errorMessage = data.error || 'Unknown error occurred'
        let toastType: 'error' | 'warning' = 'error'
        
        if (data.refunded) {
          errorMessage = `${errorMessage} • ✅ Refund: ₦${data.cost || totalCost} credited back`
          toastType = 'warning'
          // Refresh balance to show refund
          await loadProfile()
        }
        
        showToast(toastType, 'Purchase Failed', errorMessage)
      }
    } catch (error) {
      console.error('Error buying eSIM:', error)
      showToast('error', 'Purchase Failed', error instanceof Error ? error.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const checkSMS = async (orderId: string) => {
    if (checkingOrders.has(orderId)) return
    
    setCheckingOrders(prev => new Set(prev).add(orderId))
    
    try {
      const { data, error } = await supabase.functions.invoke('check-sms', {
        body: {
          order_id: orderId,
          user_id: user.id
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        return // Silently fail for auto-checks
      }

      if (data.success) {
        // Update the order in local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: data.status, otp_code: data.otp_code }
            : order
        ))
        
        if (data.otp_code) {
          showToast('success', '🎉 OTP Received!', `Code: ${data.otp_code}`)
          navigator.clipboard.writeText(data.otp_code)
        } else if (data.timeout) {
          showToast('info', '⏰ Order Timed Out', `No SMS received within 15 minutes • ✅ Refund: ₦${data.refunded_amount} credited`)
          // Refresh balance to show refund
          await loadProfile()
        }
      }
    } catch (error) {
      console.error('Error checking SMS:', error)
      // Silently fail for auto-checks
    } finally {
      setCheckingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const checkRentalMessages = async (rentalId: string) => {
    if (checkingRentals.has(rentalId)) return
    
    setCheckingRentals(prev => new Set(prev).add(rentalId))
    
    try {
      const { data, error } = await supabase.functions.invoke('check-rental-messages', {
        body: {
          rental_id: rentalId,
          user_id: user.id
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        return
      }

      if (data.success) {
        // Update rental messages
        setRentalMessages(prev => ({
          ...prev,
          [rentalId]: data.messages || []
        }))
        
        // Update rental status if changed
        if (data.status === 'EXPIRED') {
          setRentals(prev => prev.map(rental => 
            rental.id === rentalId 
              ? { ...rental, status: 'EXPIRED' }
              : rental
          ))
        }
      }
    } catch (error) {
      console.error('Error checking rental messages:', error)
    } finally {
      setCheckingRentals(prev => {
        const newSet = new Set(prev)
        newSet.delete(rentalId)
        return newSet
      })
    }
  }

  // Auto-check pending orders every 10 seconds for better UX
  useEffect(() => {
    const interval = setInterval(() => {
      const pendingOrders = orders.filter(order => order.status === 'PENDING')
      pendingOrders.forEach(order => {
        if (!checkingOrders.has(order.id)) {
          checkSMS(order.id)
        }
      })
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [orders, checkingOrders])

  // Auto-check active rentals every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const activeRentals = rentals.filter(rental => rental.status === 'ACTIVE')
      activeRentals.forEach(rental => {
        if (!checkingRentals.has(rental.id)) {
          checkRentalMessages(rental.id)
        }
      })
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [rentals, checkingRentals])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'REFUNDED':
        return <RefreshCw className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const getTimeRemaining = (timeoutAt: string) => {
    const now = new Date()
    const timeout = new Date(timeoutAt)
    const diff = timeout.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const minutes = Math.floor(diff / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 0
    
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!profile || !user) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SMS Reseller Dashboard</h1>
        <p className="text-gray-600">Manage your virtual SMS numbers and long-term rentals</p>
      </div>

      {/* Wallet Card */}
      <WalletCard supabase={supabase} user={user} />

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('one-time')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === 'one-time'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            One-Time SMS
          </button>
          <button
            onClick={() => setActiveTab('free')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === 'free'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🆓 Free Test
          </button>
          <button
            onClick={() => setActiveTab('rentals')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === 'rentals'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Long-Term Rentals
          </button>
          <button
            onClick={() => setActiveTab('esim')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === 'esim'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📶 Data eSIM
          </button>
        </div>

        {/* One-Time SMS Tab */}
        {activeTab === 'one-time' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Buy SMS Number</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search service... (e.g. whatsapp, telegram)"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select 
                    value={selectedService}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={availableServices.length === 0}
                  >
                    {availableServices.length === 0 ? (
                      <option value="">Loading services...</option>
                    ) : getFilteredServices().length === 0 ? (
                      <option value="">No services match "{serviceSearch}"</option>
                    ) : (
                      <>
                        {!serviceSearch && (
                          <option value="" disabled>Popular Services ↓</option>
                        )}
                        {getFilteredServices().map(service => (
                          <option key={service} value={service}>
                            {formatServiceName(service)}
                          </option>
                        ))}
                        {!serviceSearch && availableServices.length > 10 && (
                          <option value="" disabled>Search for more services...</option>
                        )}
                      </>
                    )}
                  </select>
                  {!serviceSearch && availableServices.length > 10 && (
                    <p className="text-xs text-gray-500">
                      Showing top 10 popular. Search to see all {availableServices.length} services.
                    </p>
                  )}
                  {serviceSearch && getFilteredServices().length > 0 && (
                    <p className="text-xs text-gray-500">
                      Found {getFilteredServices().length} services matching "{serviceSearch}"
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country... (e.g. usa, canada)"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select 
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={availableCountries.length === 0}
                    size={5}
                  >
                    {availableCountries.length === 0 ? (
                      <option value="">Select a service first</option>
                    ) : (
                      availableCountries
                        .filter(country => !countrySearch || country.toLowerCase().includes(countrySearch.toLowerCase()))
                        .map(country => (
                          <option key={country} value={country}>
                            {formatCountryName(country)}
                          </option>
                        ))
                    )}
                  </select>
                  {availableCountries.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {countrySearch 
                        ? `Showing ${availableCountries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())).length} of ${availableCountries.length} countries`
                        : `Showing all ${availableCountries.length} countries. Type to search.`
                      }
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={buyNumber}
                  disabled={loading || !selectedService || !selectedCountry || profile.balance_naira < getCurrentPrice()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : getCurrentPrice() > 0 ? `Buy Number (₦${getCurrentPrice()})` : 'Select Service'}
                </button>
              </div>
            </div>

            {getCurrentPrice() > 0 && profile.balance_naira < getCurrentPrice() && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Insufficient balance. You need ₦{getCurrentPrice()} but have ₦{profile.balance_naira}. Please top up your wallet.
                </p>
              </div>
            )}
            
            {availableServices.length === 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  No services available. Please sync pricing from the API first.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Free Test SMS Tab */}
        {activeTab === 'free' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>🆓 Free Test SMS</span>
            </h3>
            
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium mb-2">✨ Test Our Service for FREE!</p>
              <ul className="text-xs text-green-700 space-y-1 ml-4 list-disc">
                <li>No payment required - completely free</li>
                <li>Test how our SMS verification works</li>
                <li>Limited availability - first come, first served</li>
                <li>Perfect for trying before buying</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search service... (e.g. telegram, discord)"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select 
                    value={selectedService}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={availableServices.length === 0}
                  >
                    {availableServices.length === 0 ? (
                      <option value="">Loading services...</option>
                    ) : getFilteredServices().length === 0 ? (
                      <option value="">No services match "{serviceSearch}"</option>
                    ) : (
                      <>
                        {!serviceSearch && (
                          <option value="" disabled>Popular Services ↓</option>
                        )}
                        {getFilteredServices().map(service => (
                          <option key={service} value={service}>
                            {formatServiceName(service)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select 
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={availableCountries.length === 0}
                    size={5}
                  >
                    {availableCountries.length === 0 ? (
                      <option value="">Select a service first</option>
                    ) : (
                      availableCountries
                        .filter(country => !countrySearch || country.toLowerCase().includes(countrySearch.toLowerCase()))
                        .map(country => (
                          <option key={country} value={country}>
                            {formatCountryName(country)}
                          </option>
                        ))
                    )}
                  </select>
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={getFreeSMS}
                  disabled={loading || !selectedService || !selectedCountry}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : '🆓 Get Free Number'}
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                ⚠️ Free numbers have limited availability and may not work for all services. For guaranteed delivery, use our paid SMS service.
              </p>
            </div>
          </div>
        )}

        {/* Long-Term Rentals Tab */}
        {activeTab === 'rentals' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Rent Long-Term Number</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select 
                  value={rentalCountry}
                  onChange={(e) => setRentalCountry(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="usa">USA</option>
                  <option value="uk">UK</option>
                  <option value="canada">Canada</option>
                  <option value="australia">Australia</option>
                  <option value="france">France</option>
                  <option value="germany">Germany</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days)</label>
                <select 
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={7}>7 Days (₦10,500)</option>
                  <option value={14}>14 Days (₦21,000)</option>
                  <option value={30}>30 Days (₦45,000)</option>
                  <option value={60}>60 Days (₦90,000)</option>
                  <option value={90}>90 Days (₦135,000)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  ₦1,500 per day (~$1.00/day)
                </p>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={buyRental}
                  disabled={loading || profile.balance_naira < (1500 * rentalDays)}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : `Rent Number (₦${(1500 * rentalDays).toLocaleString()})`}
                </button>
              </div>
            </div>

            {profile.balance_naira < (1500 * rentalDays) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Insufficient balance. You need ₦{(1500 * rentalDays).toLocaleString()} but have ₦{profile.balance_naira.toLocaleString()}. Please top up your wallet.
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium mb-2">💡 Long-Term Rental Benefits:</p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>Receive unlimited SMS messages during rental period</li>
                <li>Use for multiple services (WhatsApp, Telegram, etc.)</li>
                <li>Auto-refresh messages every 30 seconds</li>
                <li>More cost-effective for multiple verifications</li>
              </ul>
            </div>
          </div>
        )}

        {/* Data-Only eSIM Tab */}
        {activeTab === 'esim' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>📶 Data-Only eSIM</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select 
                  value={esimCountry}
                  onChange={(e) => setEsimCountry(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="usa">USA</option>
                  <option value="uk">UK</option>
                  <option value="canada">Canada</option>
                  <option value="australia">Australia</option>
                  <option value="france">France</option>
                  <option value="germany">Germany</option>
                  <option value="spain">Spain</option>
                  <option value="italy">Italy</option>
                  <option value="japan">Japan</option>
                  <option value="mexico">Mexico</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Amount</label>
                <select 
                  value={esimData}
                  onChange={(e) => setEsimData(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1GB">1GB - ₦3,000</option>
                  <option value="3GB">3GB - ₦7,500</option>
                  <option value="5GB">5GB - ₦12,000</option>
                  <option value="10GB">10GB - ₦20,000</option>
                  <option value="20GB">20GB - ₦35,000</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <select 
                  value={esimDays}
                  onChange={(e) => setEsimDays(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={buyESIM}
                  disabled={loading || (profile && profile.balance_naira < (esimData === '1GB' ? 3000 : esimData === '3GB' ? 7500 : esimData === '5GB' ? 12000 : esimData === '10GB' ? 20000 : 35000))}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {loading ? 'Processing...' : `Buy eSIM`}
                </button>
              </div>
            </div>

            {profile && profile.balance_naira < (esimData === '1GB' ? 3000 : esimData === '3GB' ? 7500 : esimData === '5GB' ? 12000 : esimData === '10GB' ? 20000 : 35000) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Insufficient balance. Please top up your wallet.
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 font-medium mb-2">📶 Data-Only eSIM Benefits:</p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>Instant activation with QR code</li>
                <li>No physical SIM card needed</li>
                <li>Keep your primary number for calls/SMS</li>
                <li>Perfect for international travel</li>
                <li>Works on eSIM-compatible devices (iPhone XS+, Pixel 3+, Samsung S20+)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Active eSIMs */}
      {activeTab === 'esim' && esims.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Your eSIMs</h3>
          
          <div className="space-y-4">
            {esims.map((esim) => (
              <div key={esim.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {esim.status === 'ACTIVE' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {esim.status === 'EXPIRED' && <XCircle className="w-5 h-5 text-red-500" />}
                    <div>
                      <p className="font-medium text-lg">
                        {formatCountryName(esim.country)} - {esim.data_amount}
                      </p>
                      <p className="text-sm text-gray-500">
                        {esim.days} days • {esim.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">₦{esim.cost.toLocaleString()}</p>
                    {esim.status === 'ACTIVE' && (
                      <p className="text-xs text-green-600">
                        {getDaysRemaining(esim.expires_at)} days left
                      </p>
                    )}
                  </div>
                </div>

                {esim.status === 'ACTIVE' && esim.qr_code && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-800 mb-2">
                      📱 Activation Instructions
                    </p>
                    
                    {esim.qr_code && (
                      <div className="mb-3">
                        <p className="text-xs text-green-700 mb-2">Scan this QR code with your device:</p>
                        <img src={esim.qr_code} alt="eSIM QR Code" className="w-48 h-48 border border-green-300 rounded" />
                      </div>
                    )}
                    
                    {esim.activation_code && (
                      <div className="mb-2">
                        <p className="text-xs text-green-700 mb-1">Or use activation code:</p>
                        <p className="text-sm font-mono bg-white p-2 rounded border border-green-300">
                          {esim.activation_code}
                        </p>
                      </div>
                    )}
                    
                    {esim.iccid && (
                      <div>
                        <p className="text-xs text-green-700 mb-1">ICCID:</p>
                        <p className="text-xs font-mono text-gray-600">{esim.iccid}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-green-600 mt-2">
                      Expires: {formatDate(esim.expires_at)}
                    </p>
                  </div>
                )}

                {esim.status === 'EXPIRED' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">
                      eSIM Expired
                    </p>
                    <p className="text-xs text-red-600">
                      Expired on: {formatDate(esim.expires_at)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Rentals */}
      {activeTab === 'rentals' && rentals.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Your Rentals</h3>
          
          <div className="space-y-4">
            {rentals.map((rental) => (
              <div key={rental.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {rental.status === 'ACTIVE' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {rental.status === 'EXPIRED' && <XCircle className="w-5 h-5 text-red-500" />}
                    {rental.status === 'PENDING' && <Clock className="w-5 h-5 text-yellow-500" />}
                    <div>
                      <p className="font-medium text-lg">
                        {rental.phone_number || 'Processing...'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCountryName(rental.country)} • {rental.days} days
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">₦{rental.cost.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{rental.status}</p>
                    {rental.status === 'ACTIVE' && (
                      <p className="text-xs text-green-600">
                        {getDaysRemaining(rental.expires_at)} days left
                      </p>
                    )}
                  </div>
                </div>

                {rental.status === 'ACTIVE' && rental.phone_number && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-green-800">
                        📱 Active Rental
                      </p>
                      <button
                        onClick={() => checkRentalMessages(rental.id)}
                        disabled={checkingRentals.has(rental.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {checkingRentals.has(rental.id) ? 'Checking...' : 'Refresh Messages'}
                      </button>
                    </div>
                    <p className="text-xs text-green-700 mb-2">
                      Expires: {formatDate(rental.expires_at)}
                    </p>
                    
                    {/* Messages */}
                    {rentalMessages[rental.id] && rentalMessages[rental.id].length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-green-800">
                          Messages ({rentalMessages[rental.id].length}):
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {rentalMessages[rental.id].map((msg, idx) => (
                            <div key={idx} className="bg-white p-2 rounded border border-green-200">
                              <p className="text-xs text-gray-600 mb-1">
                                From: <span className="font-mono">{msg.from}</span>
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {msg.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(msg.timestamp * 1000).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 mt-2">
                        No messages yet. Auto-checking every 30 seconds...
                      </p>
                    )}
                  </div>
                )}

                {rental.status === 'EXPIRED' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">
                      Rental Expired
                    </p>
                    <p className="text-xs text-red-600">
                      Expired on: {formatDate(rental.expires_at)}
                    </p>
                  </div>
                )}

                {rental.status === 'PENDING' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      ⏳ Processing your rental...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Orders (One-Time SMS) */}
      {activeTab === 'one-time' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Live Orders</h3>
          
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-medium">
                          {order.service} - {order.country}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.phone_number || 'Waiting for number...'}
                        </p>
                        {order.status === 'PENDING' && order.timeout_at && (
                          <p className="text-xs text-yellow-600">
                            Timeout in: {getTimeRemaining(order.timeout_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">₦{order.cost}</p>
                      <p className="text-sm text-gray-500">{order.status}</p>
                    </div>
                  </div>
                  
                  {order.status === 'PENDING' && order.phone_number && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-yellow-800">
                          📱 Waiting for SMS...
                        </p>
                        <button
                          onClick={() => checkSMS(order.id)}
                          disabled={checkingOrders.has(order.id)}
                          className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                        >
                          {checkingOrders.has(order.id) ? 'Checking...' : 'Check Now'}
                        </button>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Send your OTP to: <span className="font-mono font-semibold">{order.phone_number}</span>
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Auto-checking every 10 seconds...
                      </p>
                    </div>
                  )}
                  
                  {order.status === 'PENDING' && !order.phone_number && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-600">
                        ⏳ Processing your order...
                      </p>
                    </div>
                  )}
                  
                  {order.status === 'REFUNDED' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm font-medium text-blue-800">
                        Refunded: ₦{order.refund_amount || order.cost}
                      </p>
                      <p className="text-xs text-blue-600">
                        Reason: {order.refund_reason}
                      </p>
                    </div>
                  )}
                  
                  {order.otp_code && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm font-medium text-green-800">
                        OTP Code: <span className="font-mono text-lg">{order.otp_code}</span>
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(order.otp_code!)}
                        className="mt-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Copy Code
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
