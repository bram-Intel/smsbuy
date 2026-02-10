// 5SIM Adapter for checking SMS
class FiveSIMAdapter {
  private apiKey: string
  private baseUrl = 'https://5sim.net/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async checkSMS(orderId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/user/check/${orderId}`,
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

  async cancelOrder(orderId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/user/cancel/${orderId}`,
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
    const { order_id, user_id } = await req.json()

    if (!order_id || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: order_id, user_id'
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

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order not found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If already completed or cancelled, return current status
    if (order.status !== 'PENDING') {
      return new Response(
        JSON.stringify({
          success: true,
          status: order.status,
          otp_code: order.otp_code
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if timeout
    const now = new Date()
    const timeout = new Date(order.timeout_at)
    
    if (now > timeout) {
      // Cancel order and refund
      const adapter = new FiveSIMAdapter(apiKey)
      try {
        await adapter.cancelOrder(order.provider_order_id)
      } catch (error) {
        console.error('Failed to cancel 5SIM order:', error)
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance_naira')
        .eq('id', user_id)
        .single()

      if (profile) {
        // Refund
        await supabase
          .from('profiles')
          .update({ balance_naira: profile.balance_naira + order.cost })
          .eq('id', user_id)
      }

      // Update order
      await supabase
        .from('orders')
        .update({
          status: 'REFUNDED',
          refund_reason: 'Timeout - No SMS received',
          refund_amount: order.cost
        })
        .eq('id', order_id)

      return new Response(
        JSON.stringify({
          success: true,
          status: 'REFUNDED',
          timeout: true,
          refunded_amount: order.cost
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check SMS from 5SIM
    const adapter = new FiveSIMAdapter(apiKey)
    let fivesimResult: any

    try {
      fivesimResult = await adapter.checkSMS(order.provider_order_id)
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Failed to check SMS'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if SMS received
    if (fivesimResult.status === 'RECEIVED' && fivesimResult.sms && fivesimResult.sms.length > 0) {
      const smsCode = fivesimResult.sms[0].code || fivesimResult.sms[0].text

      // Update order
      await supabase
        .from('orders')
        .update({
          status: 'COMPLETED',
          otp_code: smsCode
        })
        .eq('id', order_id)

      return new Response(
        JSON.stringify({
          success: true,
          status: 'COMPLETED',
          otp_code: smsCode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Still pending
    return new Response(
      JSON.stringify({
        success: true,
        status: 'PENDING',
        message: 'No SMS received yet'
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
