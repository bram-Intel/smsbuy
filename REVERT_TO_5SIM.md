# Revert to 5SIM API - Instructions

## Overview
This document explains how to revert from SMSPool back to 5SIM API.

## Changes Required

### 1. Update Supabase Secrets
Go to your Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Remove:**
- `SMSPOOL_API_KEY`

**Add:**
- `FIVESIM_API_KEY` = `your_5sim_api_key_here`

### 2. Update Edge Functions

You need to update these 4 edge functions:

#### A. `purchase-number` function
Replace SMSPool adapter with 5SIM adapter:

```typescript
// 5SIM Adapter
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
      const error = await response.text()
      throw new Error(`5SIM API error: ${error}`)
    }

    return await response.json()
  }
}

// In the main handler, replace:
const apiKey = Deno.env.get('SMSPOOL_API_KEY')
// with:
const apiKey = Deno.env.get('FIVESIM_API_KEY')

// And use:
const adapter = new FiveSIMAdapter(apiKey)
const result = await adapter.purchaseNumber(service, country)

// 5SIM response format:
// {
//   "id": 12345,
//   "phone": "+1234567890",
//   "operator": "att",
//   "product": "whatsapp",
//   "price": 0.5,
//   "status": "PENDING",
//   "expires": "2024-01-01T00:00:00Z",
//   "sms": []
// }
```

#### B. `check-sms` function
Replace SMSPool check with 5SIM check:

```typescript
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
      const error = await response.text()
      throw new Error(`5SIM API error: ${error}`)
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
      const error = await response.text()
      throw new Error(`5SIM API error: ${error}`)
    }

    return await response.json()
  }
}

// 5SIM response format for check:
// {
//   "id": 12345,
//   "phone": "+1234567890",
//   "status": "RECEIVED", // or "PENDING", "TIMEOUT", "CANCELLED"
//   "sms": [
//     {
//       "text": "Your code is 123456",
//       "code": "123456",
//       "created_at": "2024-01-01T00:00:00Z"
//     }
//   ]
// }
```

#### C. `purchase-rental` function
Replace SMSPool rental with 5SIM rental:

```typescript
class FiveSIMAdapter {
  private apiKey: string
  private baseUrl = 'https://5sim.net/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async purchaseRental(country: string, days: number): Promise<any> {
    // 5SIM uses "hosting" for long-term rentals
    const response = await fetch(
      `${this.baseUrl}/user/buy/hosting/${country}/any`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          days: days
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`5SIM API error: ${error}`)
    }

    return await response.json()
  }
}

// 5SIM rental response:
// {
//   "id": 12345,
//   "phone": "+1234567890",
//   "operator": "att",
//   "price": 10.5,
//   "status": "ACTIVE",
//   "expires": "2024-01-08T00:00:00Z"
// }
```

#### D. `check-rental-messages` function
Replace SMSPool message check with 5SIM:

```typescript
class FiveSIMAdapter {
  private apiKey: string
  private baseUrl = 'https://5sim.net/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getRentalMessages(rentalId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/user/hosting/${rentalId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`5SIM API error: ${error}`)
    }

    return await response.json()
  }
}

// 5SIM messages response:
// {
//   "id": 12345,
//   "phone": "+1234567890",
//   "status": "ACTIVE",
//   "sms": [
//     {
//       "text": "Your code is 123456",
//       "sender": "WhatsApp",
//       "created_at": "2024-01-01T00:00:00Z"
//     }
//   ]
// }
```

#### E. `get-free-sms` function
5SIM doesn't have a free tier, so this function should return an error:

```typescript
Deno.serve(async (req) => {
  try {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Free SMS service is not available with 5SIM provider'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```

#### F. `purchase-esim` function
5SIM doesn't support eSIM, so this should return an error:

```typescript
Deno.serve(async (req) => {
  try {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'eSIM service is not available with 5SIM provider'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
```

### 3. Update Frontend (Optional)
If you want to hide Free SMS and eSIM tabs since 5SIM doesn't support them:

In `src/components/SMSDashboard.tsx`, you can hide these tabs by removing them from the tab navigation or adding a disabled state.

### 4. Pricing Adjustments
5SIM pricing is different from SMSPool. You may need to adjust your markup percentages.

### 5. Deploy Functions
After making changes, deploy each function:

```bash
supabase functions deploy purchase-number
supabase functions deploy check-sms
supabase functions deploy purchase-rental
supabase functions deploy check-rental-messages
supabase functions deploy get-free-sms
supabase functions deploy purchase-esim
```

## Key Differences: 5SIM vs SMSPool

| Feature | 5SIM | SMSPool |
|---------|------|---------|
| Free SMS | ❌ No | ✅ Yes |
| eSIM | ❌ No | ✅ Yes |
| Long-term Rentals | ✅ Yes (Hosting) | ✅ Yes |
| One-time SMS | ✅ Yes | ✅ Yes |
| API Format | JSON | JSON/Form-data |
| Auth | Bearer Token | API Key in params |

## Why Revert?
Common reasons to revert to 5SIM:
- Better reliability for certain services
- Better country/service coverage
- Lower pricing
- Faster SMS delivery
- Better API stability

## Notes
- 5SIM uses "hosting" for long-term rentals
- 5SIM has better WhatsApp support (no whitelist needed)
- 5SIM pricing is per-service, not flat rate
- You'll lose Free SMS and eSIM features
