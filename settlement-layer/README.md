# `x402-flash` Settlement Layer

Contains the smart contracts used for `x402-flash` channel management and payment settlement.

## Overview

The X402FlashSettlement contract implements an escrow-based payment channel system that enables instant API responses without waiting for blockchain settlement. Clients deposit funds into escrow, and servers can process payments either from the client's wallet or the escrow buffer.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Add your private key and RPC URLs to `.env`

## Deployment

### Local Development
```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network
npm run deploy:local
```

### Deploy to Base Sepolia (testnet)
```bash
npm run deploy -- --network base-sepolia
```

### Deploy to Base (mainnet)
```bash
npm run deploy:base
```

## Contract Functions

- `openEscrow(server, token, amount, ttlSeconds)` - Open a payment channel with escrow
- `currentEscrow(client, server)` - View current escrow balance
- `settlePayment(client, auth, signature)` - Settle a payment with signed authorization
- `clientCloseEscrow(server)` - Client-initiated channel closure
- `serverCloseEscrow(client)` - Server-initiated channel closure

## Testing

```bash
npm test
```

## Contract Verification

After deployment, verify on Basescan:
```bash
npx hardhat verify --network base-sepolia DEPLOYED_CONTRACT_ADDRESS
```