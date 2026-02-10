# 5SIM Deployment Status

## Project Status
✅ **Project Restored**: Your Supabase project "smsbuyer" (ymwfjwcpbgkomsrpdvzv) is being restored from inactive state.

⏳ **Wait Time**: The project restoration typically takes 2-5 minutes. Once active, you can deploy the functions.

## What I've Prepared

### 1. Edge Functions Created Locally
✅ `supabase/functions/purchase-number/index.ts` - 5SIM adapter for buying numbers
✅ `supabase/functions/check-sms/index.ts` - 5SIM adapter for checking SMS

### 2. Documentation Created
✅ `REVERT_TO_5SIM.md` - Complete technical documentation
✅ `DEPLOY_5SIM_FUNCTIONS.md` - Quick deployment guide

## Next Steps (After Project is Active)

### Step 1: Set 5SIM API Key
Go to: https://supabase.com/dashboard/project/ymwfjwcpbgkomsrpdvzv/settings/functions

Add secret:
```
FIVESIM_API_KEY = your_5sim_api_key_here
```

### Step 2: Deploy Functions Using Supabase Power

Once the project is active (check status at dashboard), I can deploy the functions for you using the Supabase power:

```
Deploy purchase-number (v15)
Deploy check-sms (v12)
```

### Step 3: Update Other Functions

For functions that 5SIM doesn't support:

**get-free-sms** - Return error (5SIM has no free tier)
**purchase-esim** - Return error (5SIM has no eSIM)
**purchase-rental** - Needs update to use 5SIM "hosting" API
**check-rental-messages** - Needs update to use 5SIM hosting check

## Current Edge Functions on Project

| Function | Version | Status | Notes |
|----------|---------|--------|-------|
| purchase-number | v14 | ACTIVE | Will update to v15 with 5SIM |
| check-sms | v11 | ACTIVE | Will update to v12 with 5SIM |
| purchase-rental | v2 | ACTIVE | Needs 5SIM hosting API |
| check-rental-messages | v1 | ACTIVE | Needs 5SIM hosting API |
| get-free-sms | v3 | ACTIVE | Will disable (5SIM has no free) |
| purchase-esim | v7 | ACTIVE | Will disable (5SIM has no eSIM) |
| kora-payment | v15 | ACTIVE | No changes needed |
| kora-webhook | v9 | ACTIVE | No changes needed |
| sync-pricing | v10 | ACTIVE | No changes needed |

## What to Do Now

### Option 1: Wait for Me to Deploy (Recommended)
1. Check if project is active: https://supabase.com/dashboard/project/ymwfjwcpbgkomsrpdvzv
2. Add your FIVESIM_API_KEY to secrets
3. Tell me when ready and I'll deploy all functions using the Supabase power

### Option 2: Deploy Manually
```bash
# After project is active and API key is set
cd supabase/functions

# Deploy main functions
supabase functions deploy purchase-number --project-ref ymwfjwcpbgkomsrpdvzv
supabase functions deploy check-sms --project-ref ymwfjwcpbgkomsrpdvzv
```

## 5SIM vs SMSPool Comparison

| Feature | 5SIM | SMSPool (Current) |
|---------|------|-------------------|
| One-time SMS | ✅ Yes | ✅ Yes |
| Free SMS | ❌ No | ✅ Yes |
| eSIM | ❌ No | ✅ Yes |
| Rentals | ✅ Yes (Hosting) | ✅ Yes |
| WhatsApp | ✅ Better | ⚠️ Needs whitelist |
| API Stability | ✅ Better | ⚠️ Variable |
| Pricing | 💰 Competitive | 💰 Competitive |

## Why Switch to 5SIM?

1. **Better WhatsApp Support** - No whitelist needed
2. **More Reliable** - Better uptime and API stability
3. **Faster SMS Delivery** - Generally quicker
4. **Better Coverage** - More countries and operators

## Trade-offs

You'll lose:
- Free SMS testing feature
- eSIM data plans feature

But gain:
- Better reliability for core SMS business
- Better WhatsApp support (your main service)
- More stable API

## Project Details

- **Project ID**: ymwfjwcpbgkomsrpdvzv
- **Project Name**: smsbuyer
- **Region**: eu-central-1
- **Database**: PostgreSQL 17.6.1
- **Status**: Restoring (was INACTIVE)
- **Dashboard**: https://supabase.com/dashboard/project/ymwfjwcpbgkomsrpdvzv

## Ready to Deploy?

Once your project shows "ACTIVE_HEALTHY" status and you've added the FIVESIM_API_KEY secret, just let me know and I'll deploy all the updated functions for you using the Supabase power!
