# x402-express-flash

**Experimental wrapper for [x402-express](https://github.com/coinbase/x402) with support for the 'flash' payment scheme**

## Overview

`x402-express-flash` is an experimental Node.js library that extends the [x402-express](https://github.com/coinbase/x402) package to support an additional, experimental payment scheme called **"flash"**. The flash scheme is designed to enable lower-latency micropayments for web APIs, making it possible to pay for API calls with minimal delay and overhead.

> **Warning:** This library is experimental and intended for demonstration and research purposes only. Do not use in production environments.

## About the "flash" Scheme

The `flash` scheme is an experimental extension to the x402 protocol, designed toReduce payment latency for API calls

## How It Works

- Wraps the standard `x402-express` middleware to add support for the `flash` payment scheme
- Allows API endpoints to accept and verify payments using the flash protocol, in addition to the standard x402 schemes
- Designed to be easily integrated into existing Express.js applications

## Usage

```ts
import express from "express";
import {multiSchemePaymentMiddleware} from "x402-express-flash";

const app = express();
app.use(multiSchemaPaymentMiddleware("0xYourAddress", { "/your-endpoint": "$0.01" }));
```
