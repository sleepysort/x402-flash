# Flash Payment Broker Implementation

## Overview

This implementation provides a complete solution for the `useFlashPaymentBroker` hook that enables clients to transfer money to escrow accounts for specific servers using the X402 standard.

## MVP Implementation Details

### Target Configuration
- **Server URL**: `http://localhost:3000`
- **Server Wallet Address**: `0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3`
- **API Endpoint**: `GET /hello/exact`

## File Structure

```
src/
├── lib/
│   └── flash-payment-broker.ts    # Contract addresses and server config
├── hooks/
│   └── useFlashPaymentBroker.ts   # Main hook implementation
├── abi/
│   ├── FlashPaymentBroker.abi     # Original ABI JSON (existing)
│   └── FlashPaymentBroker.ts      # TypeScript ABI export
└── components/
    └── FlashPaymentExample.tsx    # Demo component
```

## Implementation Flow

The hook implements the exact flow described in your requirements:

1. **Get Server Address**: Uses hardcoded MVP server configuration
2. **Validate Server**: Checks if `localhost:3000/hello/exact` is reachable
3. **Call OpenEscrow**: Interacts with FlashPaymentBroker contract to create escrow
4. **Get Escrow Address**: Retrieves the deployed escrow account address
5. **Return Escrow Account**: Returns address for use in other modules

## Key Features

### Core Functions

```typescript
interface FlashPaymentBrokerReturn {
  createEscrow: (amount: bigint, tokenAddress?: Address) => Promise<Address>;
  getEscrowAddress: (serverAddress?: Address) => Promise<Address | null>;
  loading: boolean;
  error: string | null;
  serverAddress: Address;
}
```

### Smart Contract Integration
- Uses `wagmi` hooks for blockchain interactions
- Supports `simulateContract` for transaction validation
- Handles transaction confirmations with `waitForTransactionReceipt`
- Type-safe contract calls with generated ABI types

### Error Handling
- Server connectivity validation
- Wallet connection checks
- Contract interaction error handling
- User-friendly error messages

## Usage Examples

### Basic Usage
```typescript
import { useFlashPaymentBroker } from '@/hooks/useFlashPaymentBroker';
import { parseUnits } from 'viem';

const { createEscrow, getEscrowAddress, loading, error } = useFlashPaymentBroker();

// Create escrow for 10 USDC
const escrowAddress = await createEscrow(parseUnits("10", 6));

// Check existing escrow
const existingEscrow = await getEscrowAddress();
```

### In Components
```typescript
// Use the FlashPaymentExample component for a complete UI
import { FlashPaymentExample } from '@/components/FlashPaymentExample';

function MyPage() {
  return <FlashPaymentExample />;
}
```

## Configuration

### Contract Addresses
Update the contract address in `src/lib/flash-payment-broker.ts`:

```typescript
export const FLASH_PAYMENT_BROKER_ADDRESSES = {
  84532: '0x1234567890abcdef1234567890abcdef12345678' as Address, // TODO: Replace with actual address
} as const
```

### Server Configuration
For production, you can extend the server configuration:

```typescript
export const SERVER_CONFIGS = {
  development: {
    url: 'http://localhost:3000',
    walletAddress: '0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3' as Address,
    apiEndpoint: '/hello/exact',
  },
  production: {
    // Add production server config
  }
} as const
```

## Testing Steps

1. **Prerequisites**:
   - Wallet connected (MetaMask, etc.)
   - USDC available in wallet
   - Server running on `localhost:3000` with `/hello/exact` endpoint

2. **Test Flow**:
   ```bash
   # Start your local server
   cd your-server-directory
   npm start # or your server start command
   
   # Verify server is running
   curl http://localhost:3000/hello/exact
   ```

3. **Use the Demo Component**:
   - Import `FlashPaymentExample` in your page
   - Enter USDC amount
   - Click "Create Escrow"
   - Verify escrow address is returned

## Integration with TopUp Module

The escrow address returned by `createEscrow` can be used directly in your existing TopUp components:

```typescript
// In your TopUp component
const { createEscrow } = useFlashPaymentBroker();

const handleTopUp = async (amount: string) => {
  const amountInWei = parseUnits(amount, 6);
  const escrowAddress = await createEscrow(amountInWei);
  
  // Use escrowAddress for further payments
  // e.g., transfer USDC to this escrow address
};
```

## Next Steps for Production

1. **Deploy Contract**: Replace placeholder address with actual deployed FlashPaymentBroker contract
2. **Server Discovery**: Implement dynamic server discovery instead of hardcoded config
3. **Multi-Server Support**: Extend to support multiple servers
4. **Error Recovery**: Add retry mechanisms for failed transactions
5. **Gas Optimization**: Implement gas estimation and optimization
6. **Monitoring**: Add transaction monitoring and status tracking

## Dependencies

- `wagmi`: Ethereum wallet interactions
- `viem`: Ethereum utilities and types
- `react`: State management and hooks
- Your existing UI components (shadcn/ui)

## Security Considerations

- ✅ Type-safe contract interactions
- ✅ Transaction simulation before execution
- ✅ Input validation for amounts
- ✅ Error handling for failed transactions
- ⚠️ Server validation (basic connectivity check)
- ⚠️ Contract address verification needed for production

The implementation is now complete and ready for testing with your localhost:3000 server!
