# Coinbase JWT Authentication Implementation Guide

## Overview
This guide provides step-by-step instructions to implement Coinbase CDP JWT authentication for onramp functionality in the Next.js demo-frontend app. This is a minimal viable implementation for testing purposes.

## Prerequisites
- Coinbase Developer Platform account
- API keys with onramp permissions
- Next.js app with existing Coinbase OnchainKit integration

## Implementation Steps

### Step 1: Install Dependencies
```bash
pnpm add jsonwebtoken @types/jsonwebtoken
```

### Step 2: Environment Configuration
Create `.env.local` with:
```env
COINBASE_API_KEY_NAME="organizations/{org_id}/apiKeys/{key_id}"
COINBASE_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END EC PRIVATE KEY-----"
COINBASE_API_BASE_URL="https://api.cdp.coinbase.com"
```

### Step 3: Create JWT Utility
File: `src/lib/coinbase-jwt.ts`
- Implement ES256 JWT signing
- Include proper headers (kid, nonce)
- Set 2-minute expiration
- Generate URI format: "METHOD host/path"

### Step 4: Create API Routes
File: `src/app/api/coinbase/onramp/route.ts`
- POST endpoint for creating onramp sessions
- GET endpoint for checking onramp status
- Server-side JWT generation for each request
- Proper error handling and validation

### Step 5: Client Hook
File: `src/hooks/useCoinbaseOnramp.ts`
- React hook for onramp operations
- Loading and error state management
- Integration with wallet connection
- Type-safe API calls

### Step 6: Component Integration
Update `src/components/topup/TopUpPopup.tsx`:
- Add Coinbase onramp tab
- Integrate with existing UI components
- Handle onramp URL redirects
- Display loading/error states

## Key Security Considerations
1. Never expose private keys in client-side code
2. Use server-side API routes for all JWT operations
3. Implement proper error handling
4. Validate all inputs before API calls
5. Use testnet credentials for development

## Testing Checklist
- [ ] JWT generation works correctly
- [ ] API routes respond properly
- [ ] Onramp URLs are generated
- [ ] Error handling works
- [ ] UI integration is seamless
- [ ] Environment variables are secure

## File Structure
```
src/
├── lib/
│   └── coinbase-jwt.ts          # JWT utilities
├── app/api/coinbase/
│   └── onramp/
│       └── route.ts             # API endpoints
├── hooks/
│   └── useCoinbaseOnramp.ts     # React hook
└── components/topup/
    └── TopUpPopup.tsx           # UI integration
```

## Implementation Priority
1. JWT utility functions (core authentication)
2. Basic API route for onramp creation
3. Simple client hook for API calls
4. UI integration in existing popup
5. Error handling and validation
6. Testing and refinement

## Expected Functionality
- Generate secure JWT tokens for API authentication
- Create onramp sessions via Coinbase API
- Redirect users to Coinbase onramp URLs
- Check onramp transaction status
- Integrate with existing wallet connection

## Notes
- This is a testing implementation - use sandbox/testnet initially
- JWT tokens expire in 2 minutes - generate fresh for each request
- Follow Coinbase API documentation for request/response formats
- Ensure proper TypeScript types for all interfaces

## Next Steps After Implementation
1. Test with small amounts on testnet
2. Implement proper error logging
3. Add transaction status polling
4. Consider webhook integration for status updates
5. Implement production security measures
