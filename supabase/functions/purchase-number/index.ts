// 5SIM Adapter for purchasing SMS numbers
class FiveSIMAdapter {
  private apiKey: string
  private baseUrl = 'https://5sim.net/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async purchaseNumber(service: string, country: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/user/buy/activation/${country}/${service}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`5SIM API error: ${errorText}`)
    }

    return await response.json()
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { service, country, user_id } = await req.json()

    if (!service || !country || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: service, country, user_id'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get 5SIM API key
    const apiKey = Deno.env.get('FIVESIM_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API key not configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get pricing
    const { data: pricingData, error: pricingError } = await supabase
      .from('service_pricing')
      .select('total_price')
      .eq('service', service)
      .eq('country', country)
      .eq('active', true)
      .single()

    if (pricingError || !pricingData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Service not available for this country',
          refunded: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cost = pricingData.total_price

    // Check user balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance_naira')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User profile not found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.balance_naira < cost) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient balance. You need ₦${cost} but have ₦${profile.balance_naira}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct balance
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ balance_naira: profile.balance_naira - cost })
      .eq('id', user_id)

    if (deductError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to deduct balance'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Purchase number from 5SIM
    const adapter = new FiveSIMAdapter(apiKey)
    let fivesimResult: any

    try {
      fivesimResult = await adapter.purchaseNumber(service, country)
    } catch (error: any) {
      // Refund on failure
      await supabase
        .from('profiles')
        .update({ balance_naira: profile.balance_naira })
        .eq('id', user_id)

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Failed to purchase number from provider',
          refunded: true,
          cost: cost
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create order record
    const timeout = new Date()
    timeout.setMinutes(timeout.getMinutes() + 20) // 20 minute timeout

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user_id,
        service: service,
        country: country,
        phone_number: fivesimResult.phone,
        cost: cost,
        provider_order_id: fivesimResult.id.toString(),
        status: 'PENDING',
        timeout_at: timeout.toISOString()
      })
      .select()
      .single()

    if (orderError) {
      // Refund and cancel 5SIM order
      await supabase
        .from('profiles')
        .update({ balance_naira: profile.balance_naira })
        .eq('id', user_id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create order record',
          refunded: true,
          cost: cost
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Number purchased successfully',
        phone_number: fivesimResult.phone,
        order_id: order.id,
        cost: cost
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
