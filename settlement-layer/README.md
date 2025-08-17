# `x402-flash` Settlement Layer

Contains the smart contracts used for `x402-flash` channel management and payment settlement.

## Overview

The X402FlashSettlement contract implements an escrow-based payment channel system that enables instant API responses without waiting for blockchain settlement. Clients deposit funds into escrow, and servers can process payments either from the client's wallet or the escrow buffer.

## Contract address

Base Sepolia: [0x9904d883ea8037739c0946cac52c42b38165360a](https://sepolia.basescan.org/address/0x9904d883ea8037739c0946cac52c42b38165360a)