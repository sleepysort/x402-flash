import commandLineArgs from 'command-line-args'
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { createPublicClient, encodeFunctionData, Hex, http, PrivateKeyAccount } from "viem";


const args = commandLineArgs([
  { name: 'key', alias: 'k', type: String },
  { name: 'url', type: String },
  { name: 'flash', alias: 'f', type: Boolean, defaultValue: false }
]);
const account = privateKeyToAccount(args.key);

const fetchWithPayment = args.flash ? wrapFetchWithFlashPayment(fetch, account) : wrapFetchWithPayment(fetch, account);

const t1 = Date.now();
const response = await fetchWithPayment(args.url, { method: "GET" })
const t2 = Date.now();
const body = await response.text();
const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);

console.log(body);
console.log(paymentResponse);
console.log(`Time taken: ${t2 - t1} ms`);

export function wrapFetchWithFlashPayment(
  fetchFn: typeof fetch,
  account: PrivateKeyAccount
): typeof fetch {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia-preconf.base.org"),
  });
  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    // Prepare settlePayment calldata
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
      args: ["0xb4bd6078a915b9d71de4Bc857063DB20dd1ad4A3", 1000n],
    });

    const nonce = await client.getTransactionCount({ address: account.address });
    const tx = {
      to: "0x9904d883ea8037739c0946cac52c42b38165360a" as Hex,
      data: calldata,
      value: 0n,
      chainId: 84532,
      nonce,
      gas: 70000n,
      maxFeePerGas: 1000000n,
      maxPriorityFeePerGas: 1000000n,
      type: "eip1559" as const,
    };

    // Sign the tx
    const signedTx = await account.signTransaction(tx);

    // Build X-Payment header
    const paymentObj = { x402Version: 1, scheme: "flash", network: "base-sepolia", payload: signedTx };
    const paymentHeader = Buffer.from(JSON.stringify(paymentObj)).toString("base64");

    // Merge headers
    const headers = new Headers(init.headers || {});
    headers.set("X-Payment", paymentHeader);

    // Call fetch with new headers
    return fetchFn(input, { ...init, headers });
  };
}
