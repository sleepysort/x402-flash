import { Request, Response, NextFunction } from 'express';
import { createWalletClient, Hex, http, keccak256 } from 'viem';
import { paymentMiddleware } from 'x402-express';

// Current we only support the Base Sepolia network, so it's hardcoded.
const BASE_SEPOLIA_RPC_URL = "https://sepolia-preconf.base.org";

// Using viem for convenience but technically we shouldn't have to have
// a signing-capable wallet instance, since all we have to do is validate
// the transaction signed by the client and send that transaction to the
// mempool.
const PRIVATE_KEY = "0x0";
const client = createWalletClient({
  chain: {
    id: 84532,
    name: "base-sepolia",
    network: "base-sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [BASE_SEPOLIA_RPC_URL] },
      public: { http: [BASE_SEPOLIA_RPC_URL] },
    },
  },
  transport: http(BASE_SEPOLIA_RPC_URL),
  account: PRIVATE_KEY as Hex,
});

export interface PaymentMiddlewareConfig {
  [route: string]: {
    price: string;  // e.g. "$0.001"
    network: string; // e.g. "base-sepolia",
    config: any;
  }
}

/**
 * Express middleware that can be installed to support x402 payments.
 * This will support both the `exact` and `flash` schemes.
 */
export function multiSchemePaymentMiddleware(paymentAddress, routes: any, config: { url: string }) {
  const exactPaymentMiddleware = paymentMiddleware(paymentAddress, routes, config);
  return (req: Request, res: Response, next: NextFunction) => {
    const currentRoute = req.method + " " + req.path;
    if (!routes[currentRoute]) {
      next();
      return;
    }
    const routeConfig = routes[currentRoute];
    const paymentHeader = req.header("X-Payment");
    if (!paymentHeader) {
      // defer to CDP middleware if no X-Payment header.
      exactPaymentMiddleware(req, res, next);
      return;
    }
    // Decode base64
    const decoded = fromBase64(paymentHeader);
    let paymentObj: {
      x402Version: number;
      scheme: string;
      network: string;
      payload: any;
    };
    try {
      paymentObj = JSON.parse(decoded);
    } catch (e) {
      res.status(400).json({ error: "Invalid X-Payment JSON" });
      return;
    }
    if (paymentObj.network !== routeConfig.network) {
      res.status(400).json({ error: "Unsupported x402 payment network" });
      return;
    }

    if (paymentObj.scheme === "exact") {
      exactPaymentMiddleware(req, res, next);
      return;
    } else if (paymentObj.scheme !== "flash") {
      res.status(400).json({ error: "Unsupported x402 payment scheme" });
      return;
    }

    const precalculatedTxHash = keccak256(paymentObj.payload);
    client.sendRawTransaction({ serializedTransaction: paymentObj.payload })
      .catch((err) => {
        console.log(`Transaction failed to submit: ${(err as Error).message}`);
      });

    const paymentResponse = { success: true, transaction: precalculatedTxHash, network: paymentObj.network };
    res.setHeader("X-Payment-Response", toBase64(JSON.stringify(paymentResponse)));
    next();
  };
}

function toBase64(data: string): string {
  return Buffer.from(data).toString("base64");
}

function fromBase64(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
}