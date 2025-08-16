# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

x402-flash is a payment scheme that avoids settlement latency overhead by using payment buffers. The project is in early development (WIP).

## Project Structure

The repository has two main components:

1. **demo-api-server/**: Demo API server that implements the 'flash' x402 scheme
   - Node.js project (package.json present)
   - Currently no implementation files or tests

2. **settlement-layer/**: Contains smart contracts for x402-flash channel management and payment settlement
   - No smart contract files present yet

## Development Commands

### Demo API Server
```bash
cd demo-api-server
npm install  # Install dependencies
npm test     # Run tests (currently not implemented)
```

## Current State

- The project is in initial setup phase with basic directory structure
- No implementation code exists yet
- Both main components (API server and smart contracts) need to be developed

## Smart Contract Architecture (x402-flash)

### Overview
The x402-flash scheme extends the standard x402 payment protocol by introducing an escrow-based payment buffer system that eliminates settlement latency. This allows API servers to respond instantly to requests while guaranteeing eventual payment settlement.

### Key Design Decisions

1. **Single Contract Architecture**: Uses a single smart contract with mappings to manage all payment channels (more gas-efficient than proxy contracts per channel)

2. **Channel Identity**: Channels are identified by the (client, server) tuple, allowing the same pair to have sequential channels but not concurrent ones

3. **Off-chain Tracking**: The server is responsible for tracking `fundsPendingSettlement` off-chain to determine available channel capacity

4. **TTL Management**: Channels auto-expire after a period of inactivity (ttlSeconds), with lazy evaluation on contract interaction

5. **Settlement Flow**: 
   - Client signs EIP-712 structured payment authorizations
   - Server submits signed transactions to the contract
   - Failed settlements revert entirely (no partial payments)

### MVP Assumptions

- **No Malicious Servers**: The MVP assumes honest server behavior
- **No Security Hardening**: Basic implementation without reentrancy guards or other production security features
- **Single Token per Channel**: Each channel supports one ERC20 token type
- **No Minimum Amounts**: No dust protection or minimum payment requirements

### Contract Functions

1. **openEscrow**: Client deposits buffer tokens and grants spending permission
2. **currentEscrow**: View function returning current escrow balance
3. **settlePayment**: Server submits signed client transactions for settlement
4. **clientCloseEscrow**: Client-initiated channel closure
5. **serverCloseEscrow**: Server-initiated channel closure
6. **bufferDistribution**: Internal function handling escrow fund distribution on closure