import readline from 'readline';
import commandLineArgs from 'command-line-args'
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const args = commandLineArgs([
  { name: 'key', alias: 'k', type: String },
  { name: 'url', type: String },
]);

const t1 = Date.now();
const account = privateKeyToAccount(args.key);
const fetchWithPayment = wrapFetchWithPayment(fetch, account);

const response = await fetchWithPayment(args.url, { method: "GET" })
const t2 = Date.now();
const body = await response.text();
const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);

console.log(body);
console.log(paymentResponse);
console.log(`Time taken: ${t2 - t1} ms`);
