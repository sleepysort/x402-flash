import { baseSepolia } from "viem/chains";
import { createPublicClient, encodeFunctionData, Hex, http, PrivateKeyAccount } from "viem";

// Currently only supports Base Sepolia.

// Deployed contract address on Base Sepolia testnet
const FLASH_PAYMENT_BROKER_CONTRACT_ADDRESS = "0x9904d883ea8037739c0946cac52c42b38165360a";
const BASE_SEPOLIA_RPC_URL = "https://sepolia-preconf.base.org";

/** Wrap a fetch function to handle x402 with the experimental 'flash' scheme. */
export function wrapFetchWithFlashPayment(
  fetchFn: typeof fetch,
  account: PrivateKeyAccount
): typeof fetch {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC_URL),
  });
  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const firstCall = fetchFn(input, init);
    const firstResponse = await firstCall;
    if (firstResponse.status !== 402) {
      return firstCall;
    }

    // The x402 spec says that the server can provide multiple payment options in the requirements
    // payload, but we will just pick the first one.
    const paymentRequirements: { maxAmountRequired: string, payTo: string }[] = (await firstResponse.json()).accepts ?? [];
    if (paymentRequirements.length === 0) {
      throw new Error("Received 402 but no payment requirements were provided.");
    }
    const amount = BigInt(parseInt(paymentRequirements[0].maxAmountRequired));
    const payTo = paymentRequirements[0].payTo;

    const calldata = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "settlePayment",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [],
        },
      ],
      functionName: "settlePayment",
      args: [payTo as Hex, amount],
    });

    const nonce = await client.getTransactionCount({ address: account.address });
    const tx = {
      to: FLASH_PAYMENT_BROKER_CONTRACT_ADDRESS as Hex,
      data: calldata,
      value: 0n,
      chainId: 84532,
      nonce,
      gas: 70000n,
      maxFeePerGas: 1000000n,
      maxPriorityFeePerGas: 1000000n,
      type: "eip1559" as const,
    };

    const signedTx = await account.signTransaction(tx);
    const paymentObj = { x402Version: 1, scheme: "flash", network: "base-sepolia", payload: signedTx };
    const paymentHeader = toBase64(JSON.stringify(paymentObj));
    const headers = new Headers(init.headers || {});
    headers.set("X-Payment", paymentHeader);

    return fetchFn(input, { ...init, headers });
  };
}

function toBase64(data: string): string {
  return Buffer.from(data).toString("base64");
}

function fromBase64(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
}
