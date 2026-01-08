import { ArrowRight, Check, Zap, Lock, Globe, Headphones } from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            BramkingNumbers
          </div>
          <button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              Virtual Numbers
            </span>
            <br />
            Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Buy virtual phone numbers for SMS verification, app testing, and global communication. No setup fees, no contracts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
            >
              Get Started Now <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-white border-2 border-purple-200 text-purple-600 px-8 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-purple-100 hover:shadow-lg transition-shadow">
              <Zap className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold mb-2">Instant Activation</h3>
              <p className="text-gray-600">Get your numbers within seconds, ready to use immediately</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-shadow">
              <Globe className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-2">Global Coverage</h3>
              <p className="text-gray-600">Access numbers from 100+ countries and regions worldwide</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-pink-100 hover:shadow-lg transition-shadow">
              <Lock className="w-12 h-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
              <p className="text-gray-600">Your data is encrypted and protected with enterprise security</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-20 px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Supported Services</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {['WhatsApp', 'Telegram', 'Instagram', 'Facebook', 'TikTok', 'Discord', 'Gmail', 'Twitter'].map((service) => (
              <div key={service} className="bg-white rounded-lg p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
                <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">{service}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Competitive Pricing</h2>
          <p className="text-xl text-gray-600 mb-8">
            Transparent pricing with no hidden fees. Pay only for what you use.
          </p>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-purple-100">
            <div className="text-4xl font-bold text-purple-600 mb-2">NGN 500 - 5,000</div>
            <p className="text-gray-600 mb-8">Typical phone number prices</p>
            <button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              View All Prices
            </button>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="py-20 px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto text-center">
          <Headphones className="w-16 h-16 text-purple-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">24/7 Customer Support</h2>
          <p className="text-xl text-gray-600 mb-8">
            Our support team is always ready to help you with any questions
          </p>
          <a
            href="https://t.me/bramkingnumber"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
          >
            Contact us on Telegram →
          </a>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of users who trust BramkingNumbers for their communication needs
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Sign Up Now <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">© 2026 BramkingNumbers. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
