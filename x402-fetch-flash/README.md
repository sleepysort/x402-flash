# x402-fetch-flash

**Experimental x402 client library with support for the 'flash' payment scheme**

## Overview

`x402-fetch-flash` is an experimental Node.js library that extends the [x402-express](https://github.com/coinbase/x402) package to support an additional, experimental payment scheme called **"flash"**. The flash scheme is designed to enable lower-latency micropayments for web APIs, making it possible to pay for API calls with minimal delay and overhead.

> **Warning:** This library is experimental and intended for demonstration and research purposes only. Do not use in production environments.

## About the "flash" Scheme

The `flash` scheme is an experimental extension to the x402 protocol, designed toReduce payment latency for API calls

## How It Works

- Implements the x402 spec
- Automatically handles 402 responses and retries with the appropriate payment header payloads
- Provides an identical API as the `x402-fetch` package

## Usage

```ts
import { decodeXPaymentResponse } from "x402-fetch";
import { wrapFetchWithFlashPayment } from "x402-fetch-flash";

...

const fetchWithPayment = wrapFetchWithPayment(fetch, account);

fetchWithFlashPayment(url, { //url should be something like https://api.example.com/paid-endpoint
    method: "GET",
})
.then(async response => {
    const body = await response.json();
    console.log(body);

    const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    console.log(paymentResponse);
})
.catch(error => {
    console.error(error.response?.data?.error);
});
```
