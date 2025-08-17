# `x402-flash` Settlement Layer

Contains the smart contracts used for `x402-flash` channel management and payment settlement.

## Overview

The X402FlashSettlement contract implements an escrow-based payment channel system that enables instant API responses without waiting for blockchain settlement. Clients deposit funds into escrow, and servers can process payments either from the client's wallet or the escrow buffer.
